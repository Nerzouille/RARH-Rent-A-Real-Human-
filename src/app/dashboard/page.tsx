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
    <div className="max-w-5xl mx-auto w-full px-6 py-10 flex flex-col gap-10">

      {/* Page header */}
      <div className="flex items-end justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <p className="font-mono text-xs text-zinc-500 tracking-widest mb-2">Dashboard</p>
          <h1 className="font-mono font-black text-4xl text-white leading-none tracking-tight">
            {session.nullifier.slice(0, 10).toUpperCase()}<span className="text-blue-400">…</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 pb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-xs text-emerald-400 font-bold tracking-widest">HUMAN VERIFIED</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "BALANCE", value: `${balanceData?.balance ?? 0} ℏ`, color: "text-blue-400" },
          { label: "TASKS DONE", value: profile?.tasksCompleted ?? 0, color: "text-emerald-400" },
          { label: "ACTIVE JOBS", value: activeClaimed.length, color: "text-blue-300" },
          { label: "POSTED JOBS", value: activePosted.length, color: "text-violet-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="border border-zinc-800 rounded-xl bg-zinc-900 px-5 py-5 flex flex-col gap-2">
            <span className="font-mono text-xs text-zinc-500 tracking-widest">{label}</span>
            <span className={`font-mono font-black text-3xl ${color}`}>{value}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/tasks"
          className="group border border-zinc-800 hover:border-blue-600/60 rounded-xl bg-zinc-900 p-7 flex flex-col gap-3 transition-colors"
        >
          <span className="font-mono text-xs text-zinc-500 tracking-widest">AS A WORKER</span>
          <p className="font-mono font-black text-2xl text-zinc-50 group-hover:text-blue-400 transition-colors">
            FIND A JOB →
          </p>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Browse open bounties. Claim, complete, get paid in HBAR.
          </p>
        </Link>
        <Link
          href="/client/new-task"
          className="group border border-zinc-800 hover:border-blue-600/60 rounded-xl bg-zinc-900 p-7 flex flex-col gap-3 transition-colors"
        >
          <span className="font-mono text-xs text-zinc-500 tracking-widest">AS A CLIENT</span>
          <p className="font-mono font-black text-2xl text-zinc-50 group-hover:text-blue-400 transition-colors">
            POST A JOB →
          </p>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Post a bounty with HBAR escrow. Only verified humans apply.
          </p>
        </Link>
      </div>

      {/* Active jobs */}
      {activeClaimed.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="font-mono text-xs text-zinc-500 tracking-widest">YOUR ACTIVE JOBS</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeClaimed.map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="border border-zinc-800 hover:border-zinc-700 rounded-xl bg-zinc-900 px-5 py-4 flex items-center justify-between gap-4 transition-colors group"
              >
                <span className="text-sm text-zinc-400 group-hover:text-zinc-100 truncate">{task.title}</span>
                <span className="font-mono text-sm text-blue-400 shrink-0 font-bold">{task.budget_hbar} ℏ</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
