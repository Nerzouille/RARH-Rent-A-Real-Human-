import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { tasks } from "@/server/db/schema";
import { CreateTaskSchema, TaskStatusSchema } from "@/lib/schemas";
import { eq } from "drizzle-orm";

export const taskRouter = router({
  // List all open tasks
  list: publicProcedure.query(async () => {
    return db.query.tasks.findMany({
      where: (t, { eq }) => eq(t.status, "open"),
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

  // Create task (human client)
  create: protectedProcedure
    .input(CreateTaskSchema)
    .mutation(async ({ input, ctx }) => {
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
        throw new Error("Task not available");
      }

      const [updated] = await db
        .update(tasks)
        .set({ status: "claimed", worker_nullifier: ctx.session.nullifier })
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
        throw new Error("Not authorized");
      }

      const [updated] = await db
        .update(tasks)
        .set({ status: "completed", updated_at: new Date() })
        .where(eq(tasks.id, input.taskId))
        .returning();

      return updated;
    }),

  // Client validates task
  validate: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const task = await db.query.tasks.findFirst({
        where: (t, { eq }) => eq(t.id, input.taskId),
      });

      if (!task || task.client_nullifier !== ctx.session.nullifier) {
        throw new Error("Not authorized");
      }

      if (task.status !== "completed") {
        throw new Error("Task not ready for validation");
      }

      // TODO (Sacha - Story 4.4): trigger Hedera payment release here
      const [updated] = await db
        .update(tasks)
        .set({ status: "validated", updated_at: new Date() })
        .where(eq(tasks.id, input.taskId))
        .returning();

      return updated;
    }),
});
