/**
 * Test DB helper — PGLite-backed Drizzle instance for integration tests.
 *
 * Usage:
 *   await getTestDb()      — returns singleton Drizzle instance (schema created once)
 *   await resetTestDb()    — wipe all rows between tests
 */

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/server/db/schema";

const DDL = `
  CREATE TYPE user_role AS ENUM ('worker', 'client', 'admin');
  CREATE TYPE task_status AS ENUM ('open', 'claimed', 'completed', 'validated', 'expired', 'refunded');
  CREATE TYPE client_type AS ENUM ('human', 'agent');

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    nullifier TEXT NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'worker',
    hbar_balance INTEGER NOT NULL DEFAULT 0,
    tasks_completed INTEGER NOT NULL DEFAULT 0,
    hedera_account_id TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS nullifiers (
    nullifier TEXT NOT NULL,
    action TEXT NOT NULL,
    verified_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(nullifier, action)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    budget_hbar INTEGER NOT NULL,
    deadline TIMESTAMP NOT NULL,
    status task_status NOT NULL DEFAULT 'open',
    client_type client_type NOT NULL,
    client_nullifier TEXT,
    client_agent_wallet TEXT,
    client_agent_owner_nullifier TEXT,
    worker_nullifier TEXT,
    escrow_tx_id TEXT,
    payment_tx_id TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
`;

const RESET_SQL = `
  DELETE FROM tasks;
  DELETE FROM nullifiers;
  DELETE FROM users;
`;

export type TestDb = ReturnType<typeof drizzle<typeof schema>>;

let _client: PGlite | null = null;
let _db: TestDb | null = null;

/**
 * Returns a singleton PGLite db for the test process.
 * Schema is created once; call resetTestDb() between tests to wipe rows.
 */
export async function getTestDb(): Promise<TestDb> {
  if (_db) return _db;

  _client = new PGlite();
  _db = drizzle(_client, { schema });
  // PGLite exec() runs raw SQL (not shell — this is a DB query runner, not child_process)
  await _client.exec(DDL);
  return _db;
}

/** Wipe all rows (fast — no schema recreation). */
export async function resetTestDb(): Promise<void> {
  if (!_client) return;
  await _client.exec(RESET_SQL);
}
