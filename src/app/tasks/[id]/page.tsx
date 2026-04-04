"use client";

import { use, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { trpc } from "@/lib/trpc/client";
import { STATUS_COLORS } from "@/lib/constants";
import { AuditTrail } from "@/components/AuditTrail";

/**
 * Task detail page showing full description, escrow status, and worker/client actions.
 */
export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const utils = trpc.useUtils();
  const { data: task, isLoading } = trpc.task.get.useQuery(
    { id },
    {
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status === "claimed" ? 5000 : false;
      },
    }
  );
  const { data: session } = trpc.auth.me.useQuery();
  const [claimError, setClaimError] = useState<string | null>(null);
  const [markCompleteError, setMarkCompleteError] = useState<string | null>(null);
  const [validateError, setValidateError] = useState<string | null>(null);

  const { mutate: claimTask, isPending: isClaiming } = trpc.task.claim.useMutation({
    onSuccess: () => {
      utils.task.get.invalidate({ id });
    },
    onError: (err) => {
      // Avoid exposing raw tRPC/DB errors; map to user-friendly messages
      const msg = err.message.includes("already claimed")
        ? "Someone else just claimed this task. Refreshing..."
        : "Failed to claim task. Please try again.";
      setClaimError(msg);
    },
  });

  const { mutate: markComplete, isPending: isMarkingComplete } = trpc.task.markComplete.useMutation({
    onSuccess: () => {
      utils.task.get.invalidate({ id });
    },
    onError: () => {
      setMarkCompleteError("Failed to submit completion. Please try again.");
    },
  });

  const { mutate: validateTask, isPending: isValidating } = trpc.task.validate.useMutation({
    onSuccess: () => {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      utils.task.get.invalidate({ id });
    },
    onError: () => {
      setValidateError("Failed to release payment. Please try again.");
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-500 animate-pulse">Loading task...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-500">Task not found or no longer available.</p>
        <Link href="/tasks" className="mt-4 text-sm text-indigo-600 hover:underline">
          ← Back to tasks
        </Link>
      </div>
    );
  }

  const deadline = new Date(task.deadline);
  const deadlineStr = deadline.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 dark:bg-black">
      <main className="flex flex-col gap-6 px-6 py-16 max-w-lg w-full">
        <Link href="/tasks" className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
          ← Back to tasks
        </Link>

        <div className="flex items-start gap-3">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[task.status] ?? "bg-zinc-100 text-zinc-600"}`}>
            {task.status.toUpperCase()}
          </span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {task.title}
        </h1>

        <div className="flex gap-3 flex-wrap">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-3 text-center">
            <p className="text-xs text-zinc-500">Budget</p>
            <p className="text-lg font-bold text-indigo-600">{task.budget_hbar} <span className="text-sm font-normal text-zinc-400">HBAR</span></p>
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-3 text-center">
            <p className="text-xs text-zinc-500">Deadline</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{deadlineStr}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-3 text-center">
            <p className="text-xs text-zinc-500">Client</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {task.client_type === "agent" ? "🤖 Agent" : "👤 Human"}
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Description</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{task.description}</p>
        </div>

        {/* Action section — role + status state machine */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-4 flex flex-col gap-3">
          {!session ? (
            <p className="text-sm text-zinc-500">
              Verify your identity to claim tasks.{" "}
              <Link href="/register" className="text-indigo-600 hover:underline">
                Verify with World ID →
              </Link>
            </p>
          ) : session.role === "worker" && task.status === "open" ? (
            <>
              <p className="text-xs text-zinc-500">
                Payment is held in escrow until your work is validated.
              </p>
              <button
                onClick={() => { setClaimError(null); claimTask({ taskId: task.id }); }}
                disabled={isClaiming}
                className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isClaiming ? "Claiming…" : "Claim This Task"}
              </button>
              {claimError && <p className="text-sm text-red-600">{claimError}</p>}
            </>
          ) : session.role === "worker" && task.status === "claimed" && task.worker_nullifier === session.nullifier ? (
            <>
              <p className="text-sm text-zinc-500">Complete the work, then tap below.</p>
              <button
                onClick={() => { setMarkCompleteError(null); markComplete({ taskId: task.id }); }}
                disabled={isMarkingComplete}
                className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isMarkingComplete ? "Submitting…" : "Mark as Complete"}
              </button>
              {markCompleteError && <p className="text-sm text-red-600">{markCompleteError}</p>}
            </>
          ) : session.role === "worker" && task.status === "completed" && task.worker_nullifier === session.nullifier ? (
            <p className="text-sm font-medium text-emerald-600">
              ✅ Completion submitted! Awaiting client validation.
            </p>
          ) : session.role === "worker" && task.status === "validated" && task.worker_nullifier === session.nullifier ? (
            <p className="text-sm font-medium text-emerald-600">
              ✅ Task validated. Payment received.
            </p>
          ) : session.role === "worker" ? (
            <p className="text-sm text-zinc-500">
              This task has been claimed.{" "}
              <Link href="/tasks" className="text-indigo-600 hover:underline">
                Browse other available tasks →
              </Link>
            </p>
          ) : session.role === "client" && task.client_nullifier === session.nullifier && task.status === "claimed" ? (
            <p className="text-sm text-zinc-500">
              ⏳ Worker is completing the task. You&apos;ll be notified when they&apos;re done.
            </p>
          ) : session.role === "client" && task.client_nullifier === session.nullifier && task.status === "completed" ? (
            <>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Worker has marked this complete. Review and validate to release payment to the worker.
              </p>
              <button
                onClick={() => { setValidateError(null); validateTask({ taskId: task.id }); }}
                disabled={isValidating}
                className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isValidating ? "Releasing payment…" : "Validate & Release"}
              </button>
              {validateError && <p className="text-sm text-red-600">{validateError}</p>}
            </>
          ) : session.role === "client" && task.client_nullifier === session.nullifier && task.status === "validated" ? (
            <p className="text-sm font-medium text-emerald-600">
              ✅ Task complete. Payment released to worker.
            </p>
          ) : null}
        </div>

        <AuditTrail
          clientType={task.client_type}
          clientNullifier={task.client_nullifier}
          clientAgentWallet={task.client_agent_wallet}
          clientAgentOwnerNullifier={task.client_agent_owner_nullifier}
          workerNullifier={task.worker_nullifier}
          escrowTxId={task.escrow_tx_id}
          paymentTxId={task.payment_tx_id}
          status={task.status}
        />
      </main>
    </div>
  );
}
