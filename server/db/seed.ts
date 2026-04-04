import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { users, nullifiers, tasks } from "./schema";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://humanproof:humanproof@localhost:5432/humanproof";

const client = postgres(DATABASE_URL);
const db = drizzle(client);

// ─── Demo nullifiers (stable IDs for repeatable demo) ─────────────────────────
const NULLIFIER_WORKER_1 = "demo-nullifier-worker-alice-0001";
const NULLIFIER_WORKER_2 = "demo-nullifier-worker-bob-0002";
const NULLIFIER_CLIENT   = "demo-nullifier-client-corp-0003";
const NULLIFIER_AGENT_OWNER = "demo-nullifier-agent-owner-0004";

const now = new Date();
const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
const inOneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

async function seed() {
  console.log("🌱 Seeding database...");

  // ─── Truncate in order (FK-safe) ──────────────────────────────────────────
  await db.delete(tasks);
  await db.delete(nullifiers);
  await db.delete(users);

  // ─── Users ────────────────────────────────────────────────────────────────
  await db.insert(users).values([
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
  ]);

  // ─── Nullifiers (verified actions) ────────────────────────────────────────
  await db.insert(nullifiers).values([
    { nullifier: NULLIFIER_WORKER_1, action: "register-worker" },
    { nullifier: NULLIFIER_WORKER_2, action: "register-worker" },
    { nullifier: NULLIFIER_CLIENT,   action: "register-client" },
    { nullifier: NULLIFIER_AGENT_OWNER, action: "register-client" },
    { nullifier: NULLIFIER_WORKER_1, action: "claim-task" },
  ]);

  // ─── Tasks ────────────────────────────────────────────────────────────────
  await db.insert(tasks).values([
    // Open tasks — available to claim
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
    // Claimed task — in progress
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
    // Validated task — full flow demo
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
  ]);

  console.log("✅ Seed complete — 4 users, 5 tasks inserted");
  await client.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
