/**
 * MCP-compatible HTTP endpoint for AI agent clients (Epic 2 — Pierre).
 *
 * Implements the MCP JSON-RPC 2.0 protocol over plain HTTP POST.
 * Next.js App Router is incompatible with MCP SDK transport classes
 * (which expect Node.js http.IncomingMessage). This handler routes
 * JSON-RPC tool calls directly to the registry functions.
 *
 * GET  /api/mcp         — server manifest (discovery)
 * POST /api/mcp         — JSON-RPC tool calls
 * POST /api/mcp/tools/list  — list available tools
 *
 * Auth: x-agentkit-auth header (Story 2.1)
 */

import { type NextRequest, NextResponse } from "next/server";
import { verifyAgentRequest } from "@/lib/core/agentkit";
import { db } from "@/lib/db";
import { tasks } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const TOOLS = {
  get_identity: { description: "Returns calling agent identity (wallet + human owner World ID)" },
  list_tasks: { description: "Returns all open tasks available for workers" },
  create_task: {
    description: "Create a new task as an agent client",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        budget_hbar: { type: "number" },
        deadline: { type: "string", format: "date-time" },
      },
      required: ["title", "description", "budget_hbar", "deadline"],
    },
  },
  get_task_status: {
    description: "Poll the status of a task by ID",
    inputSchema: { type: "object", properties: { task_id: { type: "string" } }, required: ["task_id"] },
  },
  validate_task: {
    description: "Validate a completed task to trigger payment release",
    inputSchema: { type: "object", properties: { task_id: { type: "string" } }, required: ["task_id"] },
  },
} as const;

type ToolName = keyof typeof TOOLS;

async function dispatchTool(name: ToolName, input: Record<string, unknown>, agentIdentity: Awaited<ReturnType<typeof verifyAgentRequest>>) {
  switch (name) {
    case "get_identity":
      return { walletAddress: agentIdentity.walletAddress, humanOwnerNullifier: agentIdentity.humanOwnerNullifier, agentBookVerified: agentIdentity.agentBookVerified };

    case "list_tasks":
      return await db.query.tasks.findMany({ where: (t, { eq }) => eq(t.status, "open") });

    case "create_task": {
      const parsed = z.object({
        title: z.string().min(5),
        description: z.string().min(10),
        budget_hbar: z.number().int().positive(),
        deadline: z.string().datetime(),
      }).parse(input);

      const [task] = await db.insert(tasks).values({
        ...parsed,
        deadline: new Date(parsed.deadline),
        client_type: "agent",
        client_agent_wallet: agentIdentity.walletAddress,
        client_agent_owner_nullifier: agentIdentity.humanOwnerNullifier ?? undefined,
        status: "open",
      }).returning();

      return { task_id: task.id, escrow_tx_id: task.escrow_tx_id ?? null, status: task.status };
    }

    case "get_task_status": {
      const { task_id } = z.object({ task_id: z.string() }).parse(input);
      const task = await db.query.tasks.findFirst({ where: (t, { eq }) => eq(t.id, task_id) });
      if (!task) throw new Error("Task not found");
      return { task_id: task.id, status: task.status, escrow_tx_id: task.escrow_tx_id };
    }

    case "validate_task": {
      const { task_id } = z.object({ task_id: z.string() }).parse(input);
      const [updated] = await db.update(tasks)
        .set({ status: "validated", updated_at: new Date() })
        .where(eq(tasks.id, task_id))
        .returning();
      return { task_id: updated.id, status: updated.status };
    }
  }
}

export async function GET() {
  return NextResponse.json({
    name: "HumanProof MCP Server",
    version: "0.1.0",
    protocolVersion: "2024-11-05",
    capabilities: { tools: {} },
    tools: Object.entries(TOOLS).map(([name, meta]) => ({ name, ...meta })),
    connect: "POST /api/mcp — JSON-RPC 2.0, requires x-agentkit-auth header",
  });
}

export async function POST(req: NextRequest) {
  const agentKitHeader = req.headers.get("x-agentkit-auth") ?? "";
  let agentIdentity;

  try {
    agentIdentity = await verifyAgentRequest(agentKitHeader);
  } catch {
    return NextResponse.json({ jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized" }, id: null }, { status: 401 });
  }

  const body = await req.json();
  const { method, params, id } = body;

  try {
    if (method === "tools/list") {
      return NextResponse.json({
        jsonrpc: "2.0",
        result: { tools: Object.entries(TOOLS).map(([name, meta]) => ({ name, ...meta })) },
        id,
      });
    }

    if (method === "tools/call") {
      const { name, arguments: toolInput = {} } = params ?? {};
      if (!(name in TOOLS)) {
        return NextResponse.json({ jsonrpc: "2.0", error: { code: -32601, message: `Unknown tool: ${name}` }, id }, { status: 404 });
      }
      const result = await dispatchTool(name as ToolName, toolInput, agentIdentity);
      return NextResponse.json({ jsonrpc: "2.0", result: { content: [{ type: "text", text: JSON.stringify(result) }] }, id });
    }

    return NextResponse.json({ jsonrpc: "2.0", error: { code: -32601, message: `Method not found: ${method}` }, id }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ jsonrpc: "2.0", error: { code: -32000, message: String(err) }, id }, { status: 500 });
  }
}
