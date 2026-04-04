import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { type Context } from "@/server/context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Human verification required" });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});
