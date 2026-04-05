"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { NewTaskForm } from "@/components/tasks/NewTaskForm";

export default function NewTaskPage() {
  const router = useRouter();
  const { data: session, isLoading } = trpc.auth.me.useQuery();

  useEffect(() => {
    if (!isLoading && !session) router.push("/register");
  }, [session, isLoading, router]);

  if (isLoading) return (
    <div className="flex flex-1 items-center justify-center">
      <p className="font-mono text-xs text-zinc-500 animate-pulse tracking-widest">LOADING…</p>
    </div>
  );
  if (!session) return null;

  return (
    <div className="max-w-5xl mx-auto w-full px-6 py-10 flex flex-col gap-10">

      {/* Page header */}
      <div className="flex items-end justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <p className="font-mono text-xs text-zinc-500 tracking-widest mb-2">Post a Bounty</p>
          <h1 className="font-mono font-black text-4xl text-white leading-none tracking-tight">
            HIRE A HUMAN
          </h1>
        </div>
        <Link href="/dashboard" className="font-mono text-xs text-zinc-500 hover:text-blue-400 transition-colors tracking-widest pb-1">
          ← BACK
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Form */}
        <div>
          <NewTaskForm />
        </div>

        {/* Info panel */}
        <div className="flex flex-col gap-4">
          <div className="border border-zinc-800 rounded-xl bg-zinc-900 px-6 py-5 flex flex-col gap-3">
            <p className="font-mono text-xs text-zinc-500 tracking-widest">HOW IT WORKS</p>
            {[
              { step: "01", text: "Post your task with a HBAR budget — funds are locked in Hedera escrow." },
              { step: "02", text: "A World ID verified human claims your bounty." },
              { step: "03", text: "They complete the work and mark it done." },
              { step: "04", text: "You validate, payment releases instantly on-chain." },
            ].map(({ step, text }) => (
              <div key={step} className="flex gap-3">
                <span className="font-mono text-xs text-blue-400 font-bold shrink-0 mt-0.5">{step}</span>
                <p className="text-sm text-zinc-400 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
          <div className="border border-zinc-800 rounded-xl bg-zinc-900 px-6 py-4">
            <p className="font-mono text-xs text-zinc-500 tracking-widest mb-3">GUARANTEES</p>
            {[
              "Every worker is World ID verified — no bots",
              "Funds held in Hedera escrow until validation",
              "Zero personal data collected or stored",
            ].map((line) => (
              <p key={line} className="flex items-start gap-2 text-xs text-zinc-500 mb-2">
                <span className="text-emerald-400 shrink-0">✓</span>{line}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
