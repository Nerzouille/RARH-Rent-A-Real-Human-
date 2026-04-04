import { z } from "zod";
import { router, publicProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { users, nullifiers } from "@/server/db/schema";
import { verifyWorldIDProof } from "@/lib/core/worldid";
import { createSession } from "@/lib/core/session";
import { eq } from "drizzle-orm";

export const authRouter = router({
  // Returns current session info
  me: publicProcedure.query(({ ctx }) => {
    return ctx.session ?? null;
  }),

  // Worker/client registration via World ID
  register: publicProcedure
    .input(
      z.object({
        rp_id: z.string(),
        idkit_response: z.unknown(),
        role: z.enum(["worker", "client"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { nullifier } = await verifyWorldIDProof(input.rp_id, input.idkit_response);

      // Check nullifier uniqueness
      const existing = await db.query.nullifiers.findFirst({
        where: (n, { and, eq }) => and(eq(n.nullifier, nullifier), eq(n.action, "register")),
      });

      if (existing) {
        throw new Error("HUMAN_ALREADY_REGISTERED");
      }

      // Upsert user
      const [user] = await db
        .insert(users)
        .values({ nullifier, role: input.role })
        .onConflictDoUpdate({ target: users.nullifier, set: { role: input.role } })
        .returning();

      // Record nullifier
      await db.insert(nullifiers).values({ nullifier, action: "register" }).onConflictDoNothing();

      // Create JWT session
      const token = await createSession({
        nullifier,
        role: input.role,
        userId: user.id,
      });

      return { token, user };
    }),
});
