import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { tasks, users } from "@/server/db/schema";
import { lockEscrow, releasePayment, simulateDeposit, hashscanUrl, getAccountBalance, getOperatorAccountId } from "@/lib/core/hedera";
import { eq } from "drizzle-orm";

export const paymentRouter = router({
  // Simulate HBAR deposit for demo
  simulateDeposit: protectedProcedure
    .input(z.object({ amount_hbar: z.number().int().positive().default(50) }))
    .mutation(async ({ input, ctx }) => {
      const user = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.nullifier, ctx.session.nullifier),
      });

      if (!user?.hedera_account_id) {
        throw new Error("No Hedera account linked to this profile");
      }

      const txId = await simulateDeposit(user.hedera_account_id, input.amount_hbar);

      await db
        .update(users)
        .set({ hbar_balance: (user.hbar_balance ?? 0) + input.amount_hbar })
        .where(eq(users.id, user.id));

      return { txId, hashscanLink: hashscanUrl(txId), newBalance: (user.hbar_balance ?? 0) + input.amount_hbar };
    }),

  // Lock escrow when task is created
  lockEscrow: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const task = await db.query.tasks.findFirst({
        where: (t, { eq }) => eq(t.id, input.taskId),
      });

      if (!task || task.client_nullifier !== ctx.session.nullifier) {
        throw new Error("Task not found or unauthorized");
      }

      const txId = await lockEscrow(task.budget_hbar, task.id);

      await db
        .update(tasks)
        .set({ escrow_tx_id: txId })
        .where(eq(tasks.id, task.id));

      return { txId, hashscanLink: hashscanUrl(txId) };
    }),

  // Release payment on validation
  releasePayment: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const task = await db.query.tasks.findFirst({
        where: (t, { eq }) => eq(t.id, input.taskId),
      });

      if (!task || task.status !== "validated") {
        throw new Error("Task not ready for payment release");
      }

      const worker = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.nullifier, task.worker_nullifier!),
      });

      if (!worker?.hedera_account_id) {
        throw new Error("Worker has no Hedera account linked");
      }

      const txId = await releasePayment(worker.hedera_account_id, task.budget_hbar, task.id);

      await db
        .update(tasks)
        .set({ payment_tx_id: txId })
        .where(eq(tasks.id, task.id));

      await db
        .update(users)
        .set({ tasks_completed: (worker.tasks_completed ?? 0) + 1, hbar_balance: (worker.hbar_balance ?? 0) + task.budget_hbar })
        .where(eq(users.id, worker.id));

      return { txId, hashscanLink: hashscanUrl(txId) };
    }),

  // Get user's HBAR balance
  getBalance: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.nullifier, ctx.session.nullifier),
    });
    return { balance: user?.hbar_balance ?? 0 };
  }),

  // Get platform operator account balance (admin/demo use)
  getPlatformBalance: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.nullifier, ctx.session.nullifier),
    });
    if (user?.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    const balance = await getAccountBalance();
    return { accountId: getOperatorAccountId(), balance };
  }),
});
