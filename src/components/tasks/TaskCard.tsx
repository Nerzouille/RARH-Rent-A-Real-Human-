import Link from "next/link";
import type { Task } from "@/lib/schemas";

const statusColors: Record<string, string> = {
  open: "bg-green-100 text-green-800",
  claimed: "bg-amber-100 text-amber-800",
  completed: "bg-blue-100 text-blue-800",
  validated: "bg-gray-100 text-gray-600",
  expired: "bg-red-100 text-red-700",
  refunded: "bg-red-100 text-red-700",
};

export function TaskCard({ task }: { task: Task }) {
  const deadline = new Date(task.deadline).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-3">
      <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 line-clamp-2 text-left">
        {task.title}
      </h2>

      <div className="flex gap-3 text-sm flex-wrap">
        <span className="text-indigo-600 font-medium">{task.budget_hbar} HBAR</span>
        <span className="text-zinc-500">Due: {deadline}</span>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {task.client_type === "agent" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 px-2.5 py-0.5 text-xs font-medium">
              🤖 Autonomous Agent
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-2.5 py-0.5 text-xs font-medium">
              👤 Verified Human
            </span>
          )}
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[task.status] ?? "bg-zinc-100 text-zinc-600"}`}
          >
            {task.status.toUpperCase()}
          </span>
        </div>

        <Link
          href={`/tasks/${task.id}`}
          className="text-sm text-indigo-600 hover:underline"
        >
          View Task →
        </Link>
      </div>
    </div>
  );
}
