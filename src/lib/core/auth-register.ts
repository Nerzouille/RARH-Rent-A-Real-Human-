import { db } from "@/lib/db";
import { users, nullifiers } from "@/server/db/schema";
import { verifyWorldIDProof } from "@/lib/core/worldid";
import { createSession } from "@/lib/core/session";
import type { User } from "@/server/db/schema";

export class HumanAlreadyRegisteredError extends Error {
  constructor() {
    super("HUMAN_ALREADY_REGISTERED");
    this.name = "HumanAlreadyRegisteredError";
  }
}

/**
 * Verifies a World ID proof, persists the user and nullifier, and creates a session token.
 * Throws HumanAlreadyRegisteredError if the nullifier is already registered.
 */
export async function completeRegistration(
  idkitResponse: unknown,
  role: "worker" | "client"
): Promise<{ user: User; token: string; nullifier: string }> {
  const { nullifier } = await verifyWorldIDProof(idkitResponse);

  const existing = await db.query.nullifiers.findFirst({
    where: (n, { and, eq }) =>
      and(eq(n.nullifier, nullifier), eq(n.action, "register")),
  });

  if (existing) {
    throw new HumanAlreadyRegisteredError();
  }

  const [user] = await db
    .insert(users)
    .values({ nullifier, role })
    .onConflictDoUpdate({ target: users.nullifier, set: { role } })
    .returning();

  await db.insert(nullifiers).values({ nullifier, action: "register" }).onConflictDoNothing();

  const token = await createSession({ nullifier, role: user.role, userId: user.id });

  return { user, token, nullifier };
}
