/**
 * Minimal MCP client — wraps the OpenHuman MCP endpoint.
 * Handles SSE response parsing transparently.
 */

const BASE_URL = process.env.AGENT_SERVER_URL ?? "http://localhost:3000";
const WALLET   = process.env.AGENT_WALLET   ?? "0x000000000000000000000000000000000000CAFE";

let _reqId = 1;

async function call(toolName: string, args: Record<string, unknown>): Promise<unknown> {
  const id = _reqId++;
  const res = await fetch(`${BASE_URL}/api/mcp`, {
    method:  "POST",
    headers: {
      "Content-Type":    "application/json",
      "Accept":          "application/json, text/event-stream",
      "x-agentkit-auth": `AgentKit ${WALLET}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method:  "tools/call",
      params:  { name: toolName, arguments: args },
    }),
  });

  const raw = await res.text();

  // SSE format: lines starting with "data: "
  const dataLine = raw
    .split("\n")
    .find((l) => l.startsWith("data: "));

  if (!dataLine) throw new Error(`No data in MCP response: ${raw.slice(0, 200)}`);

  const envelope = JSON.parse(dataLine.slice(6));
  if (envelope.error) throw new Error(`MCP error ${envelope.error.code}: ${envelope.error.message}`);

  const content = envelope.result?.content?.[0]?.text;
  if (typeof content === "string") {
    try { return JSON.parse(content); }
    catch { return content; }
  }
  return envelope.result;
}

export type Task = {
  id:                  string;
  title:               string;
  description:         string;
  status:              "open" | "claimed" | "completed" | "validated" | "expired" | "refunded";
  budget_hbar:         number;
  deadline:            string;
  client_agent_wallet: string | null;
  worker_nullifier:    string | null;
};

export async function createTask(args: {
  title:       string;
  description: string;
  budget_hbar: number;
  deadline:    string;
}): Promise<{ task_id: string; escrow_tx_id: string; status: string; agentbook_status: string }> {
  return call("create_task", { ...args, agent_wallet: WALLET }) as never;
}

export async function listTasks(status?: Task["status"]): Promise<Task[]> {
  const result = await call("list_tasks", status ? { status } : {});
  return (result as Task[]) ?? [];
}

export async function getTask(taskId: string): Promise<Task> {
  return call("get_task_status", { task_id: taskId }) as never;
}

export async function validateTask(taskId: string): Promise<{ task_id: string; payment_tx_id: string; hashscan_url: string }> {
  return call("validate_task", { task_id: taskId }) as never;
}

export { WALLET, BASE_URL };
