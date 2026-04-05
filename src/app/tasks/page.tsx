"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { TaskCard } from "@/components/tasks/TaskCard";

type BudgetFilter = "all" | "lt10" | "gt10";

export default function TasksPage() {
  const router = useRouter();
  const { data: session, isLoading } = trpc.auth.me.useQuery();
  const { data: balanceData } = trpc.payment.getBalance.useQuery(undefined, { enabled: !!session });
  const { data: tasks = [], isLoading: tasksLoading } = trpc.task.list.useQuery(undefined, {
    refetchInterval: 5000,
    enabled: !!session,
  });
  const { data: myTasks = [] } = trpc.task.myTasks.useQuery(undefined, { enabled: !!session });
  const { data: myPostedTasks = [] } = trpc.task.myPostedTasks.useQuery(undefined, { enabled: !!session });
  const [budgetFilter, setBudgetFilter] = useState<BudgetFilter>("all");

  useEffect(() => {
    if (!isLoading && !session) router.push("/");
  }, [session, isLoading, router]);

  if (isLoading) return (
    <div className="flex flex-1 items-center justify-center">
      <p className="font-mono text-xs text-zinc-500 animate-pulse tracking-widest">LOADING…</p>
    </div>
  );
  if (!session) return null;

  const filtered = tasks.filter((t) => {
    if (budgetFilter === "lt10") return t.budget_hbar < 10;
    if (budgetFilter === "gt10") return t.budget_hbar >= 10;
    return true;
  });

  const pills: { label: string; value: BudgetFilter }[] = [
    { label: "ALL", value: "all" },
    { label: "< 10 ℏ", value: "lt10" },
    { label: "> 10 ℏ", value: "gt10" },
  ];

  return (
    <div className="max-w-5xl mx-auto w-full px-6 py-10 flex flex-col gap-10">

      {/* Page header */}
      <div className="flex items-end justify-between gap-4 pb-6 border-b border-zinc-800 flex-wrap">
        <div>
          <p className="font-mono text-xs text-zinc-500 tracking-widest mb-2">Bounty Board</p>
          <h1 className="font-mono font-black text-4xl text-white leading-none tracking-tight">
            OPEN BOUNTIES
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="border border-zinc-800 rounded-xl bg-zinc-900 px-4 py-3 text-right">
            <p className="font-mono text-xs text-zinc-500 tracking-widest">BALANCE</p>
            <p className="font-mono font-black text-blue-400 text-lg leading-none mt-1">{balanceData?.balance ?? 0} ℏ</p>
          </div>
          <Link
            href="/client/new-task"
            className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs tracking-widest rounded-xl transition-colors"
          >
            + POST →
          </Link>
        </div>
      </div>

      {/* Filter + count */}
      <div className="flex items-center justify-between gap-3 flex-wrap -mt-4">
        <p className="font-mono text-xs text-zinc-500 tracking-widest">
          {tasksLoading ? "SCANNING…" : `${filtered.length} AVAILABLE`}
        </p>
        <div className="flex gap-2">
          {pills.map((pill) => (
            <button
              key={pill.value}
              onClick={() => setBudgetFilter(pill.value)}
              className={`font-mono px-3 py-1.5 rounded-lg text-xs transition-colors ${
                budgetFilter === pill.value
                  ? "bg-blue-600 text-white font-bold"
                  : "border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bounties grid */}
      {tasksLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="border border-zinc-800 rounded-xl bg-zinc-900/50 h-28 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-zinc-800 rounded-2xl bg-zinc-900/40 py-20 text-center flex flex-col items-center gap-4">
          <p className="font-mono text-xs text-zinc-500 tracking-widest">NO BOUNTIES POSTED YET.</p>
          <Link href="/client/new-task" className="font-mono text-xs text-blue-400 hover:text-blue-300 tracking-widest">
            BE THE FIRST TO POST →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      {/* Personal sections */}
      {myTasks.length > 0 && (
        <section className="flex flex-col gap-3 border-t border-zinc-800 pt-8">
          <p className="font-mono text-xs text-zinc-500 tracking-widest">JOBS YOU&apos;RE WORKING</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {myTasks.map((task) => <TaskCard key={task.id} task={task} />)}
          </div>
        </section>
      )}

      {myPostedTasks.length > 0 && (
        <section className="flex flex-col gap-3 border-t border-zinc-800 pt-8">
          <p className="font-mono text-xs text-zinc-500 tracking-widest">JOBS YOU POSTED</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {myPostedTasks.map((task) => <TaskCard key={task.id} task={task} />)}
          </div>
        </section>
      )}
    </div>
  );
}
