import { z } from "zod";
import { cookies } from "next/headers";
import { router, publicProcedure } from "@/lib/trpc/server";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { users, nullifiers } from "@/server/db/schema";
import { verifyWorldIDProof } from "@/lib/core/worldid";
import { createSession } from "@/lib/core/session";

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => {
    return ctx.session ?? null;
  }),

  register: publicProcedure
    .input(
      z.object({
        rp_id: z.string(),
        idkit_response: z.unknown(),
        role: z.enum(["worker", "client"]),
      })
    )
    .mutation(async ({ input }) => {
      const { nullifier } = await verifyWorldIDProof(input.rp_id, input.idkit_response);

      const existing = await db.query.nullifiers.findFirst({
        where: (n, { and, eq }) => and(eq(n.nullifier, nullifier), eq(n.action, "register")),
      });

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "HUMAN_ALREADY_REGISTERED" });
      }

      const [user] = await db
        .insert(users)
        .values({ nullifier, role: input.role })
        .onConflictDoUpdate({ target: users.nullifier, set: { role: input.role } })
        .returning();

      await db.insert(nullifiers).values({ nullifier, action: "register" }).onConflictDoNothing();

      const token = await createSession({
        nullifier,
        role: input.role,
        userId: user.id,
      });

      const cookieStore = await cookies();
      cookieStore.set("session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24,
        path: "/",
      });

      return { user };
    }),
});
