import { z } from "zod";
import { cookies } from "next/headers";
import { router, publicProcedure, protectedProcedure } from "@/lib/trpc/server";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { completeRegistration, HumanAlreadyRegisteredError } from "@/lib/core/auth-register";
import { SESSION_COOKIE_OPTIONS } from "@/lib/core/session";

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => {
    return ctx.session ?? null;
  }),

  profile: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.nullifier, ctx.session.nullifier),
    });
    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }
    return {
      id: user.id,
      nullifier: user.nullifier,
      role: user.role,
      tasksCompleted: user.tasks_completed,
      hbarBalance: user.hbar_balance,
      hederaAccountId: user.hedera_account_id,
    };
  }),

  register: publicProcedure
    .input(
      z.object({
        // rp_id is accepted for backward-compat with existing clients but ignored server-side;
        // the server always uses WORLD_RP_ID from the environment.
        rp_id: z.string().optional(),
        idkit_response: z.unknown(),
        role: z.enum(["worker", "client"]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { user, token } = await completeRegistration(input.idkit_response, input.role);

        const cookieStore = await cookies();
        cookieStore.set("session", token, SESSION_COOKIE_OPTIONS);

        return { user };
      } catch (err) {
        if (err instanceof HumanAlreadyRegisteredError) {
          throw new TRPCError({ code: "CONFLICT", message: "HUMAN_ALREADY_REGISTERED" });
        }
        console.error("Registration error:", err);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Registration failed",
        });
      }
    }),
});
