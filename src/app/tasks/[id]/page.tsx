"use client";

import { use, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { STATUS_COLORS } from "@/lib/constants";
import { AuditTrail } from "@/components/AuditTrail";
import { hashscanUrl } from "@/lib/core/hashscan";

function getTaskActionError(
  action: "claim" | "markComplete" | "validate",
  message: string
): string {
  const normalized = message.toLowerCase();

  if (action === "claim") {
    if (normalized.includes("already claimed")) return "Someone else just claimed this task. Refreshing...";
    return "Failed to claim task. Please try again.";
  }

  if (action === "markComplete") {
    if (normalized.includes("assigned worker")) return "Only the assigned worker can mark this task complete.";
    if (normalized.includes("claimed status")) return "This task can no longer be marked complete.";
    return "Failed to submit completion. Please try again.";
  }

  if (normalized.includes("task client")) return "Only the task client can validate this task.";
  if (normalized.includes("completed status")) return "This task is not ready for validation yet.";
  if (normalized.includes("already released")) return "Payment has already been released for this task.";
  if (normalized.includes("mcp api")) return "Agent-posted tasks must be validated via the MCP API.";

  return "Failed to release payment. Please try again.";
}

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const utils = trpc.useUtils();
  const { data: session } = trpc.auth.me.useQuery();
  const { data: task, isLoading } = trpc.task.get.useQuery(
    { id },
    {
      refetchInterval: (query) => {
        const queryTask = query.state.data;
        const isMyTask =
          session?.nullifier &&
          queryTask?.client_nullifier === session.nullifier &&
          queryTask?.status === "claimed";
        return isMyTask ? 5000 : false;
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
    onSuccess: () => utils.task.get.invalidate({ id }),
    onError: (err) => setClaimError(getTaskActionError("claim", err.message)),
  });

  const { mutate: markComplete, isPending: isMarkingComplete } = trpc.task.markComplete.useMutation({
    onSuccess: () => utils.task.get.invalidate({ id }),
    onError: (err) => setMarkCompleteError(getTaskActionError("markComplete", err.message)),
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
        .catch(() => {});
    },
    onError: (err) => setValidateError(getTaskActionError("validate", err.message)),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center">
        <p className="font-mono text-xs text-zinc-500 animate-pulse tracking-widest">LOADING BOUNTY…</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-4">
        <p className="font-mono text-sm text-zinc-500">BOUNTY NOT FOUND.</p>
        <Link href="/tasks" className="font-mono text-xs text-blue-500 hover:text-blue-400 tracking-widest">
          ← BACK TO BOARD
        </Link>
      </div>
    );
  }

  const deadline = new Date(task.deadline);
  const deadlineStr = deadline.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const myNullifier = session?.nullifier ?? null;
  const isWorker = task.worker_nullifier === myNullifier;
  const isClient = task.client_nullifier === myNullifier;

  const showRecentValidationSuccess =
    task.status === "validated" && !!recentValidation && recentValidation.paymentTxId === task.payment_tx_id;
  const paymentLink =
    showRecentValidationSuccess && recentValidation.hashscanLink
      ? recentValidation.hashscanLink
      : task.payment_tx_id
        ? hashscanUrl(task.payment_tx_id)
        : "";

  return (
    <div className="max-w-2xl mx-auto w-full px-6 py-10 flex flex-col gap-8">
      <Link href="/tasks" className="font-mono text-xs text-zinc-500 hover:text-blue-500 transition-colors tracking-widest">
        ← BACK TO BOARD
      </Link>

      {/* Title + status */}
      <div className="flex flex-col gap-3">
        <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full w-fit ${STATUS_COLORS[task.status] ?? "bg-zinc-800 text-zinc-400"}`}>
          {task.status.toUpperCase()}
        </span>
        <h1 className="font-mono font-black text-2xl text-zinc-50 leading-tight">
          {task.title}
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-zinc-800 rounded bg-zinc-900 px-4 py-3 text-center">
          <p className="font-mono text-xs text-zinc-500 tracking-widest">BOUNTY</p>
          <p className="font-mono font-black text-blue-500 text-xl">{task.budget_hbar} ℏ</p>
        </div>
        <div className="border border-zinc-800 rounded bg-zinc-900 px-4 py-3 text-center">
          <p className="font-mono text-xs text-zinc-500 tracking-widest">DEADLINE</p>
          <p className="font-mono text-sm text-zinc-50 font-semibold">{deadlineStr.toUpperCase()}</p>
        </div>
        <div className="border border-zinc-800 rounded bg-zinc-900 px-4 py-3 text-center">
          <p className="font-mono text-xs text-zinc-500 tracking-widest">CLIENT</p>
          <p className="font-mono text-sm font-semibold">
            {task.client_type === "agent"
              ? <span className="text-violet-400">BOT</span>
              : <span className="text-emerald-400">HUMAN</span>
            }
          </p>
        </div>
      </div>

      {/* Description */}
      <div className="border border-zinc-800 rounded bg-zinc-900 px-5 py-4">
        <p className="font-mono text-xs text-zinc-500 tracking-widest mb-2">BRIEF</p>
        <p className="text-sm text-zinc-300 leading-relaxed">{task.description}</p>
      </div>

      {/* Action section */}
      <div className="border border-zinc-800 rounded bg-zinc-900 px-5 py-5 flex flex-col gap-3">
        <p className="font-mono text-xs text-zinc-500 tracking-widest">ACTION</p>

        {!session ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-zinc-400">Verify your humanity to claim bounties.</p>
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-5 py-3 bg-blue-500 text-zinc-950 font-mono font-bold text-sm tracking-widest rounded hover:bg-blue-400 transition-colors"
            >
              PROVE YOU&apos;RE HUMAN →
            </Link>
          </div>
        ) : task.status === "open" && !isClient ? (
          <>
            <p className="text-xs text-zinc-500">Payment held in escrow. Released on validation.</p>
            <button
              onClick={() => { clearErrors(); claimTask({ taskId: task.id }); }}
              disabled={isClaiming}
              className="w-full bg-blue-500 text-zinc-950 font-mono font-bold text-sm tracking-widest px-4 py-3 rounded hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isClaiming ? "CLAIMING…" : "CLAIM THIS BOUNTY →"}
            </button>
            {claimError && <p className="font-mono text-xs text-red-400">{claimError}</p>}
          </>
        ) : task.status === "open" && isClient ? (
          <p className="text-sm text-zinc-500 italic">Waiting for a human to claim this bounty…</p>
        ) : isWorker && task.status === "claimed" ? (
          <>
            <p className="text-xs text-zinc-500">Complete the work, then mark it done.</p>
            <button
              onClick={() => { clearErrors(); markComplete({ taskId: task.id }); }}
              disabled={isMarkingComplete}
              className="w-full bg-blue-500 text-zinc-950 font-mono font-bold text-sm tracking-widest px-4 py-3 rounded hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isMarkingComplete ? "SUBMITTING…" : "MARK AS COMPLETE →"}
            </button>
            {markCompleteError && <p className="font-mono text-xs text-red-400">{markCompleteError}</p>}
          </>
        ) : isWorker && task.status === "completed" ? (
          <div className="border border-emerald-800 rounded bg-emerald-900/20 px-4 py-3">
            <p className="font-mono text-xs text-emerald-400 font-bold tracking-widest">
              SUBMITTED — AWAITING VALIDATION
            </p>
          </div>
        ) : isWorker && task.status === "validated" ? (
          <div className="border border-emerald-800 rounded bg-emerald-900/20 px-4 py-3">
            <p className="font-mono text-xs text-emerald-400 font-bold tracking-widest">
              VALIDATED — PAYMENT RECEIVED
            </p>
          </div>
        ) : isClient && task.status === "claimed" ? (
          <p className="text-sm text-zinc-400">⏳ Worker is on it. You&apos;ll see an update when they&apos;re done.</p>
        ) : isClient && task.status === "completed" ? (
          <>
            <p className="text-sm text-zinc-300">Worker marked it done. Review and release payment.</p>
            <button
              onClick={() => { clearErrors(); setRecentValidation(null); validateTask({ taskId: task.id }); }}
              disabled={isValidating}
              className="w-full bg-emerald-500 text-zinc-950 font-mono font-bold text-sm tracking-widest px-4 py-3 rounded hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isValidating ? "RELEASING…" : "VALIDATE & RELEASE PAYMENT →"}
            </button>
            {validateError && <p className="font-mono text-xs text-red-400">{validateError}</p>}
          </>
        ) : isClient && task.status === "validated" ? (
          <div className="flex flex-col gap-2">
            <p className="font-mono text-xs text-emerald-400 font-bold tracking-widest">
              {showRecentValidationSuccess ? "PAYMENT RELEASED TO WORKER." : "TASK COMPLETE."}
            </p>
            {paymentLink && (
              <a href={paymentLink} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-zinc-400 hover:text-blue-500 transition-colors">
                VIEW ON HASHSCAN ↗
              </a>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            This bounty is already claimed.{" "}
            <Link href="/tasks" className="text-blue-500 hover:text-blue-400">
              Browse others →
            </Link>
          </p>
        )}
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
    </div>
  );
}
