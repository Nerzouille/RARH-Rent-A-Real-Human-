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
  const { data: balanceData } = trpc.payment.getBalance.useQuery(undefined, {
    enabled: !!session,
  });
  const { data: tasks = [], isLoading: tasksLoading } = trpc.task.list.useQuery(undefined, {
    refetchInterval: 5000,
    enabled: !!session,
  });
  const { data: myTasks = [] } = trpc.task.myTasks.useQuery(undefined, {
    enabled: !!session,
  });
  const { data: myPostedTasks = [] } = trpc.task.myPostedTasks.useQuery(undefined, {
    enabled: !!session,
  });

  const [budgetFilter, setBudgetFilter] = useState<BudgetFilter>("all");

  useEffect(() => {
    if (!isLoading && !session) {
      router.push("/");
    }
  }, [session, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center">
        <p className="font-mono text-xs text-zinc-500 animate-pulse tracking-widest">LOADING…</p>
      </div>
    );
  }

  if (!session) return null;

  const filteredTasks = tasks.filter((task) => {
    if (budgetFilter === "lt10") return task.budget_hbar < 10;
    if (budgetFilter === "gt10") return task.budget_hbar >= 10;
    return true;
  });

  const filterPills: { label: string; value: BudgetFilter }[] = [
    { label: "ALL", value: "all" },
    { label: "< 10 ℏ", value: "lt10" },
    { label: "> 10 ℏ", value: "gt10" },
  ];

  return (
    <div className="max-w-3xl mx-auto w-full px-6 py-10 flex flex-col gap-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-xs text-zinc-500 tracking-widest uppercase mb-1">Bounty Board</p>
          <h1 className="font-mono font-black text-3xl text-zinc-50 tracking-tight leading-none">
            OPEN<br />
            <span className="text-blue-500">BOUNTIES.</span>
          </h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="border border-zinc-800 rounded bg-zinc-900 px-4 py-3 text-right">
            <p className="font-mono text-xs text-zinc-500 tracking-widest">YOUR BALANCE</p>
            <p className="font-mono font-black text-blue-500 text-xl">{balanceData?.balance ?? 0} ℏ</p>
          </div>
          <Link
            href="/client/new-task"
            className="font-mono text-xs text-zinc-400 hover:text-blue-500 transition-colors tracking-widest"
          >
            + POST A JOB →
          </Link>
        </div>
      </div>

      {/* Open bounties */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="font-mono text-xs text-zinc-500 tracking-widest uppercase">Available Now</p>
          <div className="flex gap-2">
            {filterPills.map((pill) => (
              <button
                key={pill.value}
                onClick={() => setBudgetFilter(pill.value)}
                className={`font-mono px-3 py-1 rounded text-xs transition-colors ${
                  budgetFilter === pill.value
                    ? "bg-blue-500 text-zinc-950 font-bold"
                    : "border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {tasksLoading ? (
          <p className="font-mono text-xs text-zinc-500 animate-pulse tracking-widest">SCANNING BOARD…</p>
        ) : filteredTasks.length === 0 ? (
          <div className="border border-zinc-800 rounded bg-zinc-900 p-8 text-center">
            <p className="font-mono text-xs text-zinc-500 tracking-widest">NO BOUNTIES POSTED YET.</p>
            <Link
              href="/client/new-task"
              className="inline-block mt-3 font-mono text-xs text-blue-500 hover:text-blue-400 tracking-widest"
            >
              BE THE FIRST TO POST →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </section>

      {/* My active jobs */}
      {myTasks.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="font-mono text-xs text-zinc-500 tracking-widest uppercase">Jobs You&apos;re Working</p>
          <div className="flex flex-col gap-3">
            {myTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}

      {/* My posted jobs */}
      {myPostedTasks.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="font-mono text-xs text-zinc-500 tracking-widest uppercase">Jobs You Posted</p>
          <div className="flex flex-col gap-3">
            {myPostedTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
