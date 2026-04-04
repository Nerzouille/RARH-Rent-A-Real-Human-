import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { tasks, users } from "@/server/db/schema";
import { CreateTaskSchema, TaskStatusSchema } from "@/lib/schemas";
import { eq, sql, and, gte } from "drizzle-orm";
import { lockEscrow, releasePayment, hashscanUrl } from "@/lib/core/hedera";

export const taskRouter = router({
  // List tasks — optional status filter; defaults to "open" for backwards compat
  list: publicProcedure
    .input(
      z
        .object({ status: TaskStatusSchema.optional() })
        .optional()
        .default({})
    )
    .query(async ({ input }) => {
      const statusFilter = input?.status ?? "open";
      return db.query.tasks.findMany({
        where: (t, { eq }) => eq(t.status, statusFilter),
        orderBy: (t, { desc }) => [desc(t.created_at)],
      });
    }),

  // Get single task
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return db.query.tasks.findFirst({
        where: (t, { eq }) => eq(t.id, input.id),
      });
    }),

  // Tasks claimed by the current worker
  myTasks: protectedProcedure.query(async ({ ctx }) => {
    return db.query.tasks.findMany({
      where: (t, { eq }) => eq(t.worker_nullifier, ctx.session.nullifier),
      orderBy: (t, { desc }) => [desc(t.updated_at)],
    });
  }),

  // Tasks posted by the current human client
  myPostedTasks: protectedProcedure.query(async ({ ctx }) => {
    return db.query.tasks.findMany({
      where: (t, { eq }) => eq(t.client_nullifier, ctx.session.nullifier),
      orderBy: (t, { desc }) => [desc(t.created_at)],
    });
  }),

  // Create task (human client) with Hedera escrow lock
  create: protectedProcedure
    .input(CreateTaskSchema)
    .mutation(async ({ input, ctx }) => {
      // Fetch user and validate sufficient balance
      const user = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.nullifier, ctx.session.nullifier),
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (user.hbar_balance < input.budget_hbar) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Insufficient balance: you have ${user.hbar_balance} HBAR but the task requires ${input.budget_hbar} HBAR`,
        });
      }

      // Generate task ID upfront (needed for Hedera memo before DB insert)
      const taskId = crypto.randomUUID();

      // Execute Hedera escrow TX first — DB changes only after confirmed SUCCESS
      let escrowTxId: string;
      try {
        escrowTxId = await lockEscrow(input.budget_hbar, taskId, ctx.session.nullifier);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Hedera escrow failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }

      // Wrap balance deduction + task insert in a DB transaction for atomicity
      const task = await db.transaction(async (tx) => {
        // Deduct balance with WHERE guard to prevent negative balance (TOCTOU safe)
        const updated = await tx
          .update(users)
          .set({ hbar_balance: sql`${users.hbar_balance} - ${input.budget_hbar}` })
          .where(and(eq(users.id, user.id), gte(users.hbar_balance, input.budget_hbar)))
          .returning({ id: users.id });

        if (updated.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Insufficient balance (concurrent modification detected)",
          });
        }

        const [inserted] = await tx
          .insert(tasks)
          .values({
            id: taskId,
            ...input,
            deadline: new Date(input.deadline),
            client_type: "human",
            client_nullifier: ctx.session.nullifier,
            status: "open",
            escrow_tx_id: escrowTxId,
          })
          .returning();

        return inserted;
      });

      return { ...task, escrow_tx_id: escrowTxId, hashscanLink: hashscanUrl(escrowTxId) };
    }),

  // Claim a task
  claim: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const task = await db.query.tasks.findFirst({
        where: (t, { eq }) => eq(t.id, input.taskId),
      });

      if (!task || task.status !== "open") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Task is not available for claiming",
        });
      }

      const [updated] = await db
        .update(tasks)
        .set({
          status: "claimed",
          worker_nullifier: ctx.session.nullifier,
          updated_at: new Date(),
        })
        .where(eq(tasks.id, input.taskId))
        .returning();

      return updated;
    }),

  // Worker marks task complete
  markComplete: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const task = await db.query.tasks.findFirst({
        where: (t, { eq }) => eq(t.id, input.taskId),
      });

      if (!task || task.worker_nullifier !== ctx.session.nullifier) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the assigned worker can mark this task complete",
        });
      }

      if (task.status !== "claimed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Task must be in claimed status to mark as complete",
        });
      }

      const [updated] = await db
        .update(tasks)
        .set({ status: "completed", updated_at: new Date() })
        .where(eq(tasks.id, input.taskId))
        .returning();

      return updated;
    }),

  // Human client validates task (agent tasks use /api/mcp instead)
  validate: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const task = await db.query.tasks.findFirst({
        where: (t, { eq }) => eq(t.id, input.taskId),
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      if (task.client_type === "agent") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Agent tasks must be validated via the MCP API",
        });
      }

      if (task.client_nullifier !== ctx.session.nullifier) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the task client can validate this task",
        });
      }

      if (task.status !== "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Task must be in completed status to validate",
        });
      }

      if (task.payment_tx_id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payment already released for this task",
        });
      }

      // Fetch worker to get their Hedera account (if any)
      const worker = task.worker_nullifier
        ? await db.query.users.findFirst({
            where: (u, { eq }) => eq(u.nullifier, task.worker_nullifier!),
          })
        : null;

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found for this task",
        });
      }

      // Execute Hedera payment TX first — DB changes only after confirmed SUCCESS
      let paymentTxId: string;
      try {
        paymentTxId = await releasePayment(
          worker.hedera_account_id,
          task.budget_hbar,
          task.id
        );
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Hedera payment release failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }

      // Wrap all DB updates in a transaction for atomicity
      const updated = await db.transaction(async (tx) => {
        const [updatedTask] = await tx
          .update(tasks)
          .set({
            status: "validated",
            payment_tx_id: paymentTxId,
            updated_at: new Date(),
          })
          .where(and(eq(tasks.id, input.taskId), eq(tasks.status, "completed")))
          .returning();

        if (!updatedTask) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Task was already validated by a concurrent request",
          });
        }

        await tx
          .update(users)
          .set({
            tasks_completed: sql`${users.tasks_completed} + 1`,
            hbar_balance: sql`${users.hbar_balance} + ${task.budget_hbar}`,
          })
          .where(eq(users.id, worker.id));

        return updatedTask;
      });

      return {
        ...updated,
        payment_tx_id: paymentTxId,
        hashscanLink: hashscanUrl(paymentTxId),
      };
    }),
});
