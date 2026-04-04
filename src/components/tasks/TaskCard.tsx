import Link from "next/link";
import type { Task } from "@/lib/schemas";
import { STATUS_COLORS } from "@/lib/constants";

export function TaskCard({ task }: { task: Task }) {
  const deadline = new Date(task.deadline).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Link
      href={`/tasks/${task.id}`}
      className="group block border border-zinc-800 hover:border-blue-500/50 rounded bg-zinc-900 p-5 flex flex-col gap-3 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-mono font-bold text-zinc-50 group-hover:text-blue-500 transition-colors line-clamp-2 text-sm leading-snug flex-1">
          {task.title}
        </h2>
        <span className="font-mono font-black text-blue-500 text-lg shrink-0 leading-none">
          {task.budget_hbar} ℏ
        </span>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {task.client_type === "agent" ? (
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-violet-900/40 text-violet-300 border border-violet-800">
              BOT CLIENT
            </span>
          ) : (
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 border border-emerald-800">
              HUMAN CLIENT
            </span>
          )}
          <span
            className={`font-mono text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[task.status] ?? "bg-zinc-800 text-zinc-400"}`}
          >
            {task.status.toUpperCase()}
          </span>
        </div>
        <span className="font-mono text-xs text-zinc-500">DUE {deadline.toUpperCase()}</span>
      </div>
    </Link>
  );
}
