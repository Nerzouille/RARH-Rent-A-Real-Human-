/**
 * MCP HTTP endpoint — integration tests.
 *
 * Tests the withAgentAuth wrapper and JSON-RPC dispatch in
 * src/app/api/[transport]/route.ts using real Request objects.
 *
 * mcp-handler (createMcpHandler) is mocked to return a simple echo handler
 * so we can focus on: auth, JSON-RPC parsing, and tool dispatch shape.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const VALID_WALLET = "0xabcdef1234567890abcdef1234567890abcdef12";
const VALID_HEADER = `AgentKit ${VALID_WALLET}`;

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock mcp-handler so we don't need a real MCP server
vi.mock("mcp-handler", () => ({
  createMcpHandler: vi.fn(() =>
    vi.fn(async (req: Request) => {
      const body = await req.json().catch(() => ({}));
      return new Response(JSON.stringify({ jsonrpc: "2.0", result: "ok", id: body.id ?? null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    })
  ),
}));

// Mock registerTools to avoid importing registry with DB deps
vi.mock("@/server/mcp/registry", () => ({
  registerTools: vi.fn(),
}));

// Mock context — runWithAgentRequestContext just runs the callback
vi.mock("@/server/mcp/context", () => ({
  runWithAgentRequestContext: vi.fn((_wallet: string, fn: () => unknown) => fn()),
  getAuthenticatedAgentWallet: vi.fn().mockReturnValue(VALID_WALLET),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(
  headers: Record<string, string> = {},
  body: unknown = { jsonrpc: "2.0", method: "tools/list", id: 1 }
): Request {
  return new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

// ─── Auth middleware ──────────────────────────────────────────────────────────

describe("MCP endpoint — auth middleware", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 401 when x-agentkit-auth header is missing", async () => {
    const { POST } = await import("@/app/api/[transport]/route");
    const req = makeRequest({}); // no auth header

    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe(-32001);
    expect(json.error.message).toBe("Unauthorized");
  });

  it("returns 401 when header format is malformed", async () => {
    const { POST } = await import("@/app/api/[transport]/route");

    const malformedHeaders = [
      "Bearer some-token",
      "AgentKit notanaddress",
      "AgentKit 0xshort",          // address too short
      "AgentKit 0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", // invalid hex chars
      "",
    ];

    for (const header of malformedHeaders) {
      const req = makeRequest({ "x-agentkit-auth": header });
      const res = await POST(req as Parameters<typeof POST>[0]);
      expect(res.status, `expected 401 for header: "${header}"`).toBe(401);
    }
  });

  it("passes through to handler when header is valid", async () => {
    const { POST } = await import("@/app/api/[transport]/route");
    const req = makeRequest({ "x-agentkit-auth": VALID_HEADER });

    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(res.status).toBe(200);
  });
});

// ─── GET handler ─────────────────────────────────────────────────────────────

describe("MCP endpoint — GET handler", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 401 for GET without auth header", async () => {
    const { GET } = await import("@/app/api/[transport]/route");
    const req = new Request("http://localhost/api/mcp", { method: "GET" });

    const res = await GET(req as Parameters<typeof GET>[0]);

    expect(res.status).toBe(401);
  });

  it("passes through GET with valid auth header", async () => {
    const { GET } = await import("@/app/api/[transport]/route");
    const req = new Request("http://localhost/api/mcp", {
      method: "GET",
      headers: { "x-agentkit-auth": VALID_HEADER },
    });

    const res = await GET(req as Parameters<typeof GET>[0]);

    expect(res.status).toBe(200);
  });
});

// ─── DELETE handler ───────────────────────────────────────────────────────────

describe("MCP endpoint — DELETE handler", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 401 for DELETE without auth header", async () => {
    const { DELETE } = await import("@/app/api/[transport]/route");
    const req = new Request("http://localhost/api/mcp", { method: "DELETE" });

    const res = await DELETE(req as Parameters<typeof DELETE>[0]);

    expect(res.status).toBe(401);
  });
});

// ─── JSON-RPC response shape ──────────────────────────────────────────────────

describe("MCP endpoint — response shape", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("response is valid JSON-RPC 2.0", async () => {
    const { POST } = await import("@/app/api/[transport]/route");
    const req = makeRequest(
      { "x-agentkit-auth": VALID_HEADER },
      { jsonrpc: "2.0", method: "tools/list", id: 42 }
    );

    const res = await POST(req as Parameters<typeof POST>[0]);
    const json = await res.json();

    expect(json.jsonrpc).toBe("2.0");
    expect(json.id).toBe(42);
  });

  it("error response has JSON-RPC 2.0 error shape on 401", async () => {
    const { POST } = await import("@/app/api/[transport]/route");
    const req = makeRequest({});

    const res = await POST(req as Parameters<typeof POST>[0]);
    const json = await res.json();

    expect(json).toMatchObject({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized" },
      id: null,
    });
  });
});
