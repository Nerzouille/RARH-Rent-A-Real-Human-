import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { users, nullifiers, tasks } from "./schema";

// ─── Demo nullifiers (stable IDs for repeatable demo) ─────────────────────────
const NULLIFIER_WORKER_1 = "demo-nullifier-worker-alice-0001";
const NULLIFIER_WORKER_2 = "demo-nullifier-worker-bob-0002";
const NULLIFIER_CLIENT   = "demo-nullifier-client-corp-0003";
const NULLIFIER_AGENT_OWNER = "demo-nullifier-agent-owner-0004";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runSeed(db: any): Promise<{ users: number; tasks: number }> {
  const now = new Date();
  const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const inOneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // ─── Users ────────────────────────────────────────────────────────────────
  const insertedUsers = await db.insert(users).values([
    {
      nullifier: NULLIFIER_WORKER_1,
      role: "worker",
      hbar_balance: 120,
      tasks_completed: 3,
      hedera_account_id: "0.0.11111",
    },
    {
      nullifier: NULLIFIER_WORKER_2,
      role: "worker",
      hbar_balance: 45,
      tasks_completed: 1,
      hedera_account_id: "0.0.22222",
    },
    {
      nullifier: NULLIFIER_CLIENT,
      role: "client",
      hbar_balance: 500,
      tasks_completed: 0,
    },
    {
      nullifier: NULLIFIER_AGENT_OWNER,
      role: "client",
      hbar_balance: 300,
      tasks_completed: 0,
    },
  ]).returning();

  // ─── Nullifiers (verified actions) ────────────────────────────────────────
  await db.insert(nullifiers).values([
    { nullifier: NULLIFIER_WORKER_1, action: "register-worker" },
    { nullifier: NULLIFIER_WORKER_2, action: "register-worker" },
    { nullifier: NULLIFIER_CLIENT,   action: "register-client" },
    { nullifier: NULLIFIER_AGENT_OWNER, action: "register-client" },
    { nullifier: NULLIFIER_WORKER_1, action: "claim-task" },
  ]);

  // ─── Tasks ────────────────────────────────────────────────────────────────
  const insertedTasks = await db.insert(tasks).values([
    {
      title: "Translate product description to French",
      description:
        "Translate our 500-word product description from English to natural French. Must be done by a native speaker.",
      budget_hbar: 50,
      deadline: inOneWeek,
      status: "open",
      client_type: "human",
      client_nullifier: NULLIFIER_CLIENT,
    },
    {
      title: "Record a 30-second voice sample",
      description:
        "Read the provided script aloud clearly. WAV or MP3, minimum 44kHz. Used for TTS training dataset.",
      budget_hbar: 30,
      deadline: inTwoDays,
      status: "open",
      client_type: "agent",
      client_agent_wallet: "0x000000000000000000000000000000000000CAFE",
      client_agent_owner_nullifier: NULLIFIER_AGENT_OWNER,
    },
    {
      title: "Label 100 images for object detection",
      description:
        "Use the provided tool to draw bounding boxes around cars and pedestrians in 100 street-level photos.",
      budget_hbar: 80,
      deadline: inOneWeek,
      status: "open",
      client_type: "agent",
      client_agent_wallet: "0x000000000000000000000000000000000000BABE",
      client_agent_owner_nullifier: NULLIFIER_AGENT_OWNER,
    },
    {
      title: "Verify business address on Google Maps",
      description:
        "Confirm that the listed address matches the physical location on Google Street View. Provide screenshot.",
      budget_hbar: 20,
      deadline: inTwoDays,
      status: "claimed",
      client_type: "human",
      client_nullifier: NULLIFIER_CLIENT,
      worker_nullifier: NULLIFIER_WORKER_1,
      escrow_tx_id: "0.0.12345@1700000000.000000000",
    },
    {
      title: "Answer a survey about AI tools",
      description:
        "Complete a 10-question survey about your experience with AI coding tools. Honest answers only.",
      budget_hbar: 15,
      deadline: yesterday,
      status: "validated",
      client_type: "agent",
      client_agent_wallet: "0x000000000000000000000000000000000000DEAD",
      client_agent_owner_nullifier: NULLIFIER_AGENT_OWNER,
      worker_nullifier: NULLIFIER_WORKER_2,
      escrow_tx_id: "0.0.12346@1700000001.000000000",
      payment_tx_id: "0.0.12347@1700000002.000000000",
    },
  ]).returning();

  return { users: insertedUsers.length, tasks: insertedTasks.length };
}

// ─── CLI entrypoint ───────────────────────────────────────────────────────────
async function seed() {
  const DATABASE_URL =
    process.env.DATABASE_URL ||
    "postgresql://humanproof:humanproof@localhost:5432/humanproof";

  const client = postgres(DATABASE_URL);
  const db = drizzle(client);

  console.log("🌱 Seeding database...");

  await db.delete(tasks);
  await db.delete(nullifiers);
  await db.delete(users);

  const counts = await runSeed(db);
  console.log(`✅ Seed complete — ${counts.users} users, ${counts.tasks} tasks inserted`);

  await client.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
