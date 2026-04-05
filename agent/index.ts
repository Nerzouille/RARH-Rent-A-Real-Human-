/**
 * OpenHuman Demo Agent
 *
 * An autonomous AI agent that uses the OpenHuman MCP API to:
 *   1. Post tasks that require verified humans
 *   2. Monitor task status in real time
 *   3. Automatically validate + release payment when work is done
 *
 * Usage:
 *   pnpm agent:demo              — post tasks + watch loop
 *   pnpm agent:demo --watch-only — only watch + validate (no new tasks)
 *   pnpm agent:demo --list       — list current tasks and exit
 */

import { createTask, listTasks, validateTask, WALLET, BASE_URL } from "./mcp.ts";
import { TASK_CATALOG } from "./tasks.ts";
import type { Task } from "./mcp.ts";

// ── Config ────────────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 15_000; // how often to check for completed tasks
const MAX_TASKS_TO_POST = 2;     // how many tasks to post on startup

// ── Terminal colours (no deps) ────────────────────────────────────────────────
const c = {
  reset:  "\x1b[0m",
  dim:    "\x1b[2m",
  bold:   "\x1b[1m",
  blue:   "\x1b[34m",
  cyan:   "\x1b[36m",
  green:  "\x1b[32m",
  yellow: "\x1b[33m",
  red:    "\x1b[31m",
  grey:   "\x1b[90m",
};

function ts() {
  return c.grey + new Date().toLocaleTimeString("en-GB") + c.reset;
}

function log(emoji: string, msg: string) {
  console.log(`${ts()}  ${emoji}  ${msg}`);
}

// ── Banner ────────────────────────────────────────────────────────────────────
function banner() {
  console.log();
  console.log(c.bold + c.blue + "  ╔═══════════════════════════════════════╗" + c.reset);
  console.log(c.bold + c.blue + "  ║   OpenHuman  —  Demo Agent  v0.1      ║" + c.reset);
  console.log(c.bold + c.blue + "  ╚═══════════════════════════════════════╝" + c.reset);
  console.log();
  console.log(`  ${c.dim}Server ${c.reset}  ${BASE_URL}`);
  console.log(`  ${c.dim}Wallet ${c.reset}  ${c.cyan}${WALLET}${c.reset}`);
  console.log(`  ${c.dim}Poll   ${c.reset}  every ${POLL_INTERVAL_MS / 1000}s`);
  console.log();
}

// ── Post tasks ────────────────────────────────────────────────────────────────
async function postInitialTasks(): Promise<void> {
  log("📋", c.bold + "Posting tasks to the bounty board…" + c.reset);
  console.log();

  const toPost = TASK_CATALOG.slice(0, MAX_TASKS_TO_POST);

  for (const def of toPost) {
    try {
      const result = await createTask(def);
      log(
        "✅",
        `${c.green}Posted${c.reset} ${c.bold}${def.title}${c.reset}\n` +
        `        ${c.dim}id: ${result.task_id.slice(0, 8)}…  escrow: ${result.escrow_tx_id.slice(0, 20)}…  ` +
        `agentbook: ${result.agentbook_status}${c.reset}`
      );
    } catch (err) {
      log("❌", `${c.red}Failed to post "${def.title}": ${(err as Error).message}${c.reset}`);
    }
    await sleep(500);
  }
  console.log();
}

// ── Watch loop ────────────────────────────────────────────────────────────────
const validated = new Set<string>(); // avoid double-validating

async function watchAndValidate(): Promise<void> {
  let tasks: Task[];
  try {
    tasks = await listTasks("completed");
  } catch (err) {
    log("⚠️ ", `${c.yellow}MCP unreachable: ${(err as Error).message}${c.reset}`);
    return;
  }

  // Only care about tasks this agent posted
  const mine = tasks.filter(
    (t) => t.client_agent_wallet?.toLowerCase() === WALLET.toLowerCase()
  );

  if (mine.length === 0) {
    process.stdout.write(`\r${ts()}  👀  Watching… ${c.dim}(${tasks.length} completed total, 0 mine)${c.reset}   `);
    return;
  }

  process.stdout.write("\n");

  for (const task of mine) {
    if (validated.has(task.id)) continue;

    log("🔔", `${c.yellow}Human completed:${c.reset} ${c.bold}${task.title}${c.reset}`);
    log("   ", `${c.dim}Worker: ${task.worker_nullifier?.slice(0, 14) ?? "unknown"}…${c.reset}`);

    try {
      const result = await validateTask(task.id);
      validated.add(task.id);
      log(
        "💸",
        `${c.green}${c.bold}Payment released!${c.reset}  ${c.cyan}${result.payment_tx_id?.slice(0, 24) ?? "mock"}…${c.reset}`
      );
      if (result.hashscan_url) {
        log("🔗", `${c.dim}Hashscan: ${result.hashscan_url}${c.reset}`);
      }
      console.log();
    } catch (err) {
      log("❌", `${c.red}Validation failed: ${(err as Error).message}${c.reset}`);
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function listAndExit() {
  banner();
  log("📋", "Current tasks on the board:\n");
  const tasks = await listTasks();
  if (tasks.length === 0) {
    console.log("  (none)");
  } else {
    for (const t of tasks) {
      const mine = t.client_agent_wallet?.toLowerCase() === WALLET.toLowerCase();
      const tag  = mine ? c.cyan + " [mine]" + c.reset : "";
      console.log(
        `  ${c.bold}${statusIcon(t.status)} ${t.title}${c.reset}${tag}\n` +
        `     ${c.dim}${t.id.slice(0, 8)}…  ${t.budget_hbar}ℏ  ${t.status}${c.reset}\n`
      );
    }
  }
  process.exit(0);
}

function statusIcon(s: Task["status"]): string {
  return { open: "🟢", claimed: "🟡", completed: "🔵", validated: "✅", expired: "⛔", refunded: "↩️" }[s] ?? "⬜";
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--list")) {
    await listAndExit();
    return;
  }

  banner();

  if (!args.includes("--watch-only")) {
    await postInitialTasks();
  }

  log("👀", `Watching for completed tasks… ${c.dim}(Ctrl+C to stop)${c.reset}\n`);

  // Run once immediately, then on interval
  await watchAndValidate();
  const interval = setInterval(watchAndValidate, POLL_INTERVAL_MS);

  // Graceful shutdown
  process.on("SIGINT", () => {
    clearInterval(interval);
    console.log("\n\n" + ts() + "  👋  Agent stopped.\n");
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(c.red + "\nFatal error: " + err.message + c.reset);
  process.exit(1);
});
