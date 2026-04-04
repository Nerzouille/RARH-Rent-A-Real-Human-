import { z } from "zod";
import { cookies } from "next/headers";
import { router, publicProcedure } from "@/lib/trpc/server";
import { TRPCError } from "@trpc/server";
import { completeRegistration, HumanAlreadyRegisteredError } from "@/lib/core/auth-register";
import { SESSION_COOKIE_OPTIONS } from "@/lib/core/session";

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => {
    return ctx.session ?? null;
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
