import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { tasks } from "@/server/db/schema";
import { CreateTaskSchema, TaskStatusSchema } from "@/lib/schemas";
import { eq } from "drizzle-orm";

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

  // Create task (human client)
  create: protectedProcedure
    .input(CreateTaskSchema)
    .mutation(async ({ input, ctx }) => {
      // TODO (story 4.3): trigger Hedera escrow lock here before insert
      const [task] = await db
        .insert(tasks)
        .values({
          ...input,
          deadline: new Date(input.deadline),
          client_type: "human",
          client_nullifier: ctx.session.nullifier,
          status: "open",
        })
        .returning();

      return task;
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

      // Agent tasks must be validated via the MCP API, not tRPC
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

      // TODO (story 4.4): trigger Hedera payment release here
      const [updated] = await db
        .update(tasks)
        .set({ status: "validated", updated_at: new Date() })
        .where(eq(tasks.id, input.taskId))
        .returning();

      return updated;
    }),
});
