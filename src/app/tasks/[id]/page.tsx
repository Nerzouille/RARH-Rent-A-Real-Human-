"use client";

import { use, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { STATUS_COLORS } from "@/lib/constants";
import { AuditTrail } from "@/components/AuditTrail";

function getTaskActionError(
  action: "claim" | "markComplete" | "validate",
  message: string
): string {
  const normalized = message.toLowerCase();

  if (action === "claim") {
    if (normalized.includes("already claimed")) {
      return "Someone else just claimed this task. Refreshing...";
    }
    if (normalized.includes("only workers")) {
      return "Only workers can claim tasks.";
    }
    return "Failed to claim task. Please try again.";
  }

  if (action === "markComplete") {
    if (normalized.includes("assigned worker")) {
      return "Only the assigned worker can mark this task complete.";
    }
    if (normalized.includes("claimed status")) {
      return "This task can no longer be marked complete.";
    }
    return "Failed to submit completion. Please try again.";
  }

  if (normalized.includes("task client")) {
    return "Only the task client can validate this task.";
  }
  if (normalized.includes("completed status")) {
    return "This task is not ready for validation yet.";
  }
  if (normalized.includes("already released")) {
    return "Payment has already been released for this task.";
  }
  if (normalized.includes("mcp api")) {
    return "Agent-posted tasks must be validated via the MCP API.";
  }

  return "Failed to release payment. Please try again.";
}

/**
 * Task detail page showing full description, escrow status, and worker/client actions.
 */
export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const utils = trpc.useUtils();
  const { data: session } = trpc.auth.me.useQuery();
  const { data: task, isLoading } = trpc.task.get.useQuery(
    { id },
    {
      refetchInterval: (query) => {
        const queryTask = query.state.data;
        const shouldPoll =
          session?.role === "client" &&
          !!session.nullifier &&
          queryTask?.status === "claimed" &&
          queryTask.client_nullifier === session.nullifier;
        return shouldPoll ? 5000 : false;
      },
    }
  );
  const [claimError, setClaimError] = useState<string | null>(null);
  const [markCompleteError, setMarkCompleteError] = useState<string | null>(null);
  const [validateError, setValidateError] = useState<string | null>(null);
  const [recentValidation, setRecentValidation] = useState<{
    paymentTxId: string | null;
    hashscanLink: string;
  } | null>(null);

  const clearErrors = () => {
    setClaimError(null);
    setMarkCompleteError(null);
    setValidateError(null);
  };

  const { mutate: claimTask, isPending: isClaiming } = trpc.task.claim.useMutation({
    onSuccess: () => {
      utils.task.get.invalidate({ id });
    },
    onError: (err) => {
      setClaimError(getTaskActionError("claim", err.message));
    },
  });

  const { mutate: markComplete, isPending: isMarkingComplete } = trpc.task.markComplete.useMutation({
    onSuccess: () => {
      utils.task.get.invalidate({ id });
    },
    onError: (err) => {
      setMarkCompleteError(getTaskActionError("markComplete", err.message));
    },
  });

  const { mutate: validateTask, isPending: isValidating } = trpc.task.validate.useMutation({
    onSuccess: (data) => {
      setRecentValidation({
        paymentTxId: data.payment_tx_id ?? null,
        hashscanLink: data.hashscanLink,
      });
      utils.task.get.invalidate({ id });
      void import("canvas-confetti")
        .then(({ default: confetti }) => {
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        })
        .catch(() => {
          // Confetti is cosmetic. Do not block the validated-state refresh if it fails to load.
        });
    },
    onError: (err) => {
      setValidateError(getTaskActionError("validate", err.message));
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
  const showRecentValidationSuccess =
    task.status === "validated" &&
    !!recentValidation &&
    recentValidation.paymentTxId === task.payment_tx_id;
  const paymentLink =
    showRecentValidationSuccess && recentValidation.hashscanLink
      ? recentValidation.hashscanLink
      : task.payment_tx_id
        ? hashscanUrl(task.payment_tx_id)
        : "";

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
                onClick={() => { clearErrors(); claimTask({ taskId: task.id }); }}
                disabled={isClaiming}
                className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isClaiming ? "Claiming…" : "Claim This Task"}
              </button>
              {claimError && <p className="text-sm text-red-600">{claimError}</p>}
            </>
          ) : session.role === "worker" && task.status === "claimed" && !!session.nullifier && task.worker_nullifier === session.nullifier ? (
            <>
              <p className="text-sm text-zinc-500">Complete the work, then tap below.</p>
              <button
                onClick={() => { clearErrors(); markComplete({ taskId: task.id }); }}
                disabled={isMarkingComplete}
                className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isMarkingComplete ? "Submitting…" : "Mark as Complete"}
              </button>
              {markCompleteError && <p className="text-sm text-red-600">{markCompleteError}</p>}
            </>
          ) : session.role === "worker" && task.status === "completed" && !!session.nullifier && task.worker_nullifier === session.nullifier ? (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-3 py-2">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">
                ✅ Completion submitted! Awaiting client validation.
              </p>
            </div>
          ) : session.role === "worker" && task.status === "validated" && !!session.nullifier && task.worker_nullifier === session.nullifier ? (
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
          ) : session.role === "client" && !!session.nullifier && task.client_nullifier === session.nullifier ? (
            <>
              {task.status === "open" ? (
                <p className="text-sm text-zinc-500 italic">
                  Waiting for workers to claim this task...
                </p>
              ) : task.status === "claimed" ? (
                <p className="text-sm text-zinc-500">
                  ⏳ Worker is completing the task. You&apos;ll be notified when they&apos;re done.
                </p>
              ) : task.status === "completed" ? (
                <>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Worker has marked this complete. Review and validate to release payment.
                  </p>
                  <button
                    onClick={() => {
                      clearErrors();
                      setRecentValidation(null);
                      validateTask({ taskId: task.id });
                    }}
                    disabled={isValidating}
                    className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isValidating ? "Releasing payment…" : "Validate & Release"}
                  </button>
                  {validateError && <p className="text-sm text-red-600">{validateError}</p>}
                </>
              ) : task.status === "validated" ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-emerald-600">
                    {showRecentValidationSuccess
                      ? "✅ Task complete. Payment released to worker."
                      : "✅ Task complete. Payment released."}
                  </p>
                  {paymentLink && (
                    <a
                      href={paymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:underline font-mono"
                    >
                      View payment on Hashscan ↗
                    </a>
                  )}
                </div>
              ) : null}
            </>
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
