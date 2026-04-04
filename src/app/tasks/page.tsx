"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { SimulateDepositButton } from "@/components/simulate-deposit-button";

export default function TasksPage() {
  const router = useRouter();
  const { data: session, isLoading } = trpc.auth.me.useQuery();
  const { data: balanceData } = trpc.payment.getBalance.useQuery(undefined, {
    enabled: !!session,
  });

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

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex flex-col items-center gap-6 text-center px-6 py-24 max-w-2xl w-full">
        <span className="text-4xl">✅</span>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Task Marketplace
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Welcome, {session.nullifier.slice(0, 12)}...
          <br />
          You are registered as a verified human worker.
        </p>

        {/* Balance & Deposit Section */}
        <div className="w-full max-w-sm rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
          <div className="text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Your Balance</p>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {balanceData?.balance ?? 0} <span className="text-lg font-normal text-zinc-400">HBAR</span>
            </p>
          </div>
          <SimulateDepositButton />
        </div>

        <p className="text-sm text-zinc-400">
          Available tasks will appear here once task listings are implemented (story 3.3).
        </p>
      </main>
    </div>
  );
}
