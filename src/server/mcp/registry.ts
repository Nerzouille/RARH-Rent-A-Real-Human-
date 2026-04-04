/**
 * MCP Tool Registry — entry point for agent clients (Epic 2).
 * Pierre owns the tool implementations in ./tools/
 *
 * Register all MCP tools on a McpServer instance.
 * Called by app/api/[transport]/route.ts via mcp-handler.
 *
 * Auth: AgentKit signature validated upstream in the route handler (Story 2.1)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db } from "@/lib/db";
import { tasks } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { lookupAgentBookOwner } from "@/lib/core/agentkit";
import { EVM_ADDRESS_RE } from "@/lib/schemas";

export function registerTools(server: McpServer): void {
  // ─── Identity Tool ──────────────────────────────────────────────────────────
  server.tool(
    "get_identity",
    "Returns the AgentBook identity for a given agent wallet address",
    { wallet_address: z.string().regex(EVM_ADDRESS_RE, "Invalid EVM address") },
    async ({ wallet_address }) => {
      const humanOwnerNullifier = await lookupAgentBookOwner(wallet_address);
      const agentbook_status = humanOwnerNullifier ? "verified" : "offline";
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            walletAddress: wallet_address,
            humanOwnerNullifier,
            agentBookVerified: humanOwnerNullifier !== null,
            agentbook_status,
          }),
        }],
      };
    }
  );

  // ─── Task Tools ──────────────────────────────────────────────────────────────
  server.tool(
    "list_tasks",
    "Returns all open tasks available for workers",
    {},
    async () => {
      const openTasks = await db.query.tasks.findMany({
        where: (t, { eq }) => eq(t.status, "open"),
      });
      return {
        content: [{ type: "text", text: JSON.stringify(openTasks) }],
      };
    }
  );

  server.tool(
    "create_task",
    "Create a new task as an agent client",
    {
      title: z.string().min(5).max(100),
      description: z.string().min(10).max(1000),
      budget_hbar: z.number().int().positive(),
      deadline: z.string().datetime(),
    },
    async (input) => {
      // TODO (Pierre - Story 2.3): attach agent wallet from auth context
      const [task] = await db
        .insert(tasks)
        .values({
          title: input.title,
          description: input.description,
          budget_hbar: input.budget_hbar,
          deadline: new Date(input.deadline),
          client_type: "agent",
          status: "open",
        })
        .returning();

      return {
        content: [{ type: "text", text: JSON.stringify({ task_id: task.id, status: task.status }) }],
      };
    }
  );

  server.tool(
    "get_task_status",
    "Poll the status of a task by ID",
    { task_id: z.string() },
    async ({ task_id }) => {
      const task = await db.query.tasks.findFirst({
        where: (t, { eq }) => eq(t.id, task_id),
      });
      if (!task) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "Task not found" }) }] };
      }
      return {
        content: [{ type: "text", text: JSON.stringify({ task_id: task.id, status: task.status, escrow_tx_id: task.escrow_tx_id }) }],
      };
    }
  );

  server.tool(
    "validate_task",
    "Validate a completed task to trigger payment release",
    { task_id: z.string() },
    async ({ task_id }) => {
      // TODO (Pierre - Story 2.5): check agent owns this task, trigger payment
      const [updated] = await db
        .update(tasks)
        .set({ status: "validated", updated_at: new Date() })
        .where(eq(tasks.id, task_id))
        .returning();

      return {
        content: [{ type: "text", text: JSON.stringify({ task_id: updated.id, status: updated.status }) }],
      };
    }
  );
}
