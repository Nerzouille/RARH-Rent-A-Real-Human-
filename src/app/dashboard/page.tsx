"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc/client";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isLoading } = trpc.auth.me.useQuery();
  const { data: profile } = trpc.auth.profile.useQuery(undefined, { enabled: !!session });
  const { data: balanceData } = trpc.payment.getBalance.useQuery(undefined, { enabled: !!session });
  const { data: myTasks = [] } = trpc.task.myTasks.useQuery(undefined, { enabled: !!session });
  const { data: myPostedTasks = [] } = trpc.task.myPostedTasks.useQuery(undefined, { enabled: !!session });

  useEffect(() => {
    if (!isLoading && !session) router.replace("/");
  }, [session, isLoading, router]);

  if (isLoading || !session) return null;

  const activeClaimed = myTasks.filter((t) => t.status === "claimed" || t.status === "completed");
  const activePosted = myPostedTasks.filter((t) => t.status !== "validated" && t.status !== "refunded");

  return (
    <div className="max-w-5xl mx-auto w-full px-6 py-10 flex flex-col gap-8">
      {/* Welcome */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-xs text-zinc-500 tracking-widest uppercase mb-1">Dashboard</p>
          <h1 className="font-mono font-black text-3xl text-zinc-50 tracking-tight">
            WELCOME BACK,{" "}
            <span className="text-blue-500">{session.nullifier.slice(0, 10).toUpperCase()}…</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-xs text-emerald-400 font-bold tracking-widest">HUMAN VERIFIED</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "BALANCE", value: `${balanceData?.balance ?? 0} ℏ`, accent: "text-blue-500" },
          { label: "TASKS DONE", value: profile?.tasksCompleted ?? 0, accent: "text-emerald-400" },
          { label: "ACTIVE JOBS", value: activeClaimed.length, accent: "text-blue-400" },
          { label: "POSTED JOBS", value: activePosted.length, accent: "text-violet-400" },
        ].map(({ label, value, accent }) => (
          <div key={label} className="border border-zinc-800 rounded bg-zinc-900 px-4 py-4 flex flex-col gap-1">
            <span className="font-mono text-xs text-zinc-500 tracking-widest">{label}</span>
            <span className={`font-mono font-black text-2xl ${accent}`}>{value}</span>
          </div>
        ))}
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/tasks"
          className="group border border-zinc-800 hover:border-blue-500/50 rounded bg-zinc-900 p-6 flex flex-col gap-3 transition-colors"
        >
          <span className="font-mono text-xs text-zinc-500 tracking-widest">AS A WORKER</span>
          <p className="font-mono font-black text-xl text-zinc-50 group-hover:text-blue-500 transition-colors">
            FIND A JOB →
          </p>
          <p className="text-sm text-zinc-400">
            Browse open bounties posted by humans and AI agents. Claim, complete, get paid in HBAR.
          </p>
        </Link>

        <Link
          href="/client/new-task"
          className="group border border-zinc-800 hover:border-blue-500/50 rounded bg-zinc-900 p-6 flex flex-col gap-3 transition-colors"
        >
          <span className="font-mono text-xs text-zinc-500 tracking-widest">AS A CLIENT</span>
          <p className="font-mono font-black text-xl text-zinc-50 group-hover:text-blue-500 transition-colors">
            POST A JOB →
          </p>
          <p className="text-sm text-zinc-400">
            Need a verified human for a task? Post a bounty with HBAR escrow. Only real humans apply.
          </p>
        </Link>
      </div>

      {/* Active jobs quick view */}
      {activeClaimed.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="font-mono text-xs text-zinc-500 tracking-widest uppercase">YOUR ACTIVE JOBS</p>
          {activeClaimed.map((task) => (
            <Link
              key={task.id}
              href={`/tasks/${task.id}`}
              className="border border-zinc-800 hover:border-zinc-600 rounded bg-zinc-900 px-4 py-3 flex items-center justify-between gap-4 transition-colors group"
            >
              <span className="text-sm text-zinc-300 group-hover:text-zinc-50 truncate">{task.title}</span>
              <span className="font-mono text-xs text-blue-500 shrink-0">{task.budget_hbar} ℏ</span>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
