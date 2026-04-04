/**
 * MCP endpoint for AI agent clients (Epic 2 — Pierre).
 *
 * Uses mcp-handler to serve the MCP protocol over Streamable HTTP + SSE.
 * The [transport] dynamic segment lets mcp-handler negotiate the transport
 * automatically (Streamable HTTP for modern clients, SSE for legacy ones).
 *
 * GET/POST/DELETE /api/mcp           — Streamable HTTP transport
 * GET/POST        /api/sse           — SSE transport (legacy fallback)
 *
 * Auth: x-agentkit-auth header validated before every request (Story 2.1)
 */

import { createMcpHandler } from "mcp-handler";
import { type NextRequest, NextResponse } from "next/server";
import { verifyAgentRequest } from "@/lib/core/agentkit";
import { registerTools } from "@/server/mcp/registry";

const mcpHandler = createMcpHandler(
  (server) => registerTools(server),
  { serverInfo: { name: "humanproof", version: "0.1.0" } },
  { basePath: "/api" }
);

async function withAgentAuth(req: NextRequest): Promise<Response> {
  const agentKitHeader = req.headers.get("x-agentkit-auth") ?? "";
  try {
    await verifyAgentRequest(agentKitHeader);
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized" }, id: null },
      { status: 401 }
    );
  }
  return mcpHandler(req);
}

export async function GET(req: NextRequest) {
  return withAgentAuth(req);
}

export async function POST(req: NextRequest) {
  return withAgentAuth(req);
}

export async function DELETE(req: NextRequest) {
  return withAgentAuth(req);
}
