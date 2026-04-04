"use client";

import { use } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";

function hashscanUrl(txId: string): string {
  const [accountPart, timestampPart] = txId.split("@");
  if (!timestampPart) return `https://hashscan.io/testnet/transaction/${txId}`;
  const formatted = `${accountPart}-${timestampPart.replace(".", "-")}`;
  return `https://hashscan.io/testnet/transaction/${formatted}`;
}

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: task, isLoading } = trpc.task.get.useQuery({ id });

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

  const statusColors: Record<string, string> = {
    open: "bg-green-100 text-green-800",
    claimed: "bg-amber-100 text-amber-800",
    completed: "bg-blue-100 text-blue-800",
    validated: "bg-gray-100 text-gray-600",
    expired: "bg-red-100 text-red-700",
    refunded: "bg-red-100 text-red-700",
  };

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
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[task.status] ?? "bg-zinc-100 text-zinc-600"}`}>
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

        {task.escrow_tx_id && (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-3">
            <p className="text-xs text-zinc-500 mb-1">Hedera Escrow</p>
            {task.escrow_tx_id.startsWith("mock-") ? (
              <p className="text-xs text-zinc-400 font-mono">{task.escrow_tx_id} (mock)</p>
            ) : (
              <a
                href={hashscanUrl(task.escrow_tx_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-600 hover:underline font-mono"
              >
                {task.escrow_tx_id.slice(0, 20)}… ↗
              </a>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
