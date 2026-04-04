import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex flex-col items-center gap-10 text-center px-6 py-24 max-w-2xl">
        <div className="flex flex-col items-center gap-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            ETHGlobal Cannes 2026
          </span>
          <h1 className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            HumanProof
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-md leading-relaxed">
            The first marketplace where every worker is a{" "}
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              cryptographically verified human
            </span>
            . Powered by World ID 4.0.
          </p>
        </div>

        <div className="flex w-full flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="/register"
            className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
          >
            I&apos;m a Worker
          </Link>
          <Link
            href="/client/register"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "w-full sm:w-auto"
            )}
          >
            I&apos;m a Client
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-6 mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          <div className="flex flex-col items-center gap-1">
            <span className="text-xl">🌍</span>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">World ID</span>
            <span>Orb-verified humans only</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xl">🤖</span>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">AgentKit</span>
            <span>AI agents post tasks</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xl">⚡</span>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Hedera</span>
            <span>Instant HBAR payments</span>
          </div>
        </div>
      </main>
    </div>
  );
}
