import { router } from "@/lib/trpc/server";
import { authRouter } from "./auth";
import { taskRouter } from "./task";
import { paymentRouter } from "./payment";

export const appRouter = router({
  auth: authRouter,
  task: taskRouter,
  payment: paymentRouter,
});

export type AppRouter = typeof appRouter;
