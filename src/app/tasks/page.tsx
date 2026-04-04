"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { SimulateDepositButton } from "@/components/simulate-deposit-button";
import { TaskCard } from "@/components/tasks/TaskCard";
import { HumanVerifiedBadge } from "@/components/identity/HumanVerifiedBadge";

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
    enabled: !!session && session.role === "worker",
  });
  const { data: myPostedTasks = [] } = trpc.task.myPostedTasks.useQuery(undefined, {
    enabled: !!session && session.role === "client",
  });

  const [budgetFilter, setBudgetFilter] = useState<BudgetFilter>("all");

  useEffect(() => {
    if (!isLoading && !session) {
      router.push("/");
    }
  }, [session, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-500 animate-pulse">Checking session...</p>
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
    { label: "All", value: "all" },
    { label: "< 10 HBAR", value: "lt10" },
    { label: "> 10 HBAR", value: "gt10" },
  ];

  return (
    <div className="flex flex-col flex-1 items-start bg-zinc-50 dark:bg-black">
      <main className="flex flex-col gap-8 px-6 py-12 max-w-2xl w-full mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Task Marketplace
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Welcome, {session.nullifier.slice(0, 12)}…
            </p>
          </div>
          <div className="flex items-center gap-3">
            <HumanVerifiedBadge
              nullifier={session.nullifier}
              role={session.role}
              tasksCompleted={0}
              hbarBalance={0}
              compact
            />
            <Link
              href="/profile"
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors underline underline-offset-2"
            >
              My profile
            </Link>
          </div>
        </div>

        {/* Balance & Deposit Section */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Your Balance</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {balanceData?.balance ?? 0}{" "}
              <span className="text-base font-normal text-zinc-400">HBAR</span>
            </p>
          </div>
          <SimulateDepositButton />
        </div>

        {/* Available Tasks */}
        <section>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Available Tasks
            </h2>
            {/* Budget filter pills */}
            <div className="flex gap-2">
              {filterPills.map((pill) => (
                <button
                  key={pill.value}
                  onClick={() => setBudgetFilter(pill.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    budgetFilter === pill.value
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {tasksLoading ? (
            <p className="text-sm text-zinc-500 animate-pulse">Loading tasks...</p>
          ) : filteredTasks.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No tasks available right now. New tasks are posted frequently — check back soon.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </section>

        {/* My Claimed Tasks — workers only */}
        {session.role === "worker" && myTasks.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
              My Claimed Tasks
            </h2>
            <div className="flex flex-col gap-3">
              {myTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </section>
        )}

        {/* My Posted Tasks — clients only */}
        {session.role === "client" && myPostedTasks.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
              My Posted Tasks
            </h2>
            <div className="flex flex-col gap-3">
              {myPostedTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
