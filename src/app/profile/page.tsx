"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isLoading: sessionLoading } = trpc.auth.me.useQuery();
  const { data: profile, isLoading: profileLoading } = trpc.auth.profile.useQuery(undefined, { enabled: !!session });

  useEffect(() => {
    if (!sessionLoading && !session) router.push("/");
  }, [session, sessionLoading, router]);

  if (sessionLoading || profileLoading) return (
    <div className="flex flex-1 items-center justify-center">
      <p className="font-mono text-xs text-zinc-500 animate-pulse tracking-widest">LOADING…</p>
    </div>
  );
  if (!session || !profile) return null;

  return (
    <div className="max-w-5xl mx-auto w-full px-6 py-10 flex flex-col gap-10">

      {/* Page header */}
      <div className="flex items-end justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <p className="font-mono text-xs text-zinc-500 tracking-widest mb-2">Identity</p>
          <h1 className="font-mono font-black text-4xl text-white leading-none tracking-tight">
            MY PROFILE
          </h1>
        </div>
        <Link href="/tasks" className="font-mono text-xs text-zinc-500 hover:text-blue-400 transition-colors tracking-widest pb-1">
          ← BOUNTIES
        </Link>
      </div>

      {/* Identity card + stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Verified identity */}
        <div className="border border-zinc-800 rounded-xl bg-zinc-900 px-6 py-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-emerald-900/40 border border-emerald-800 flex items-center justify-center text-emerald-400 font-bold">✓</span>
            <div>
              <p className="font-mono text-xs text-emerald-400 font-bold tracking-widest">HUMAN VERIFIED</p>
              <p className="font-mono text-xs text-zinc-500">Orb-level · World ID 4.0</p>
            </div>
          </div>
          <div className="border-t border-zinc-800 pt-4">
            <p className="font-mono text-xs text-zinc-500 tracking-widest mb-1">NULLIFIER</p>
            <p className="font-mono text-sm text-zinc-300 break-all">{profile.nullifier.slice(0, 24)}…</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-zinc-800 rounded-xl bg-zinc-900 px-5 py-5 flex flex-col gap-2">
            <span className="font-mono text-xs text-zinc-500 tracking-widest">TASKS DONE</span>
            <span className="font-mono font-black text-3xl text-blue-400">{profile.tasksCompleted}</span>
          </div>
          <div className="border border-zinc-800 rounded-xl bg-zinc-900 px-5 py-5 flex flex-col gap-2">
            <span className="font-mono text-xs text-zinc-500 tracking-widest">BALANCE</span>
            <span className="font-mono font-black text-3xl text-blue-400">{profile.hbarBalance} ℏ</span>
          </div>
        </div>
      </div>

      {/* Reputation */}
      <div className="border border-zinc-800 rounded-xl bg-zinc-900 px-6 py-5 flex flex-col gap-4">
        <p className="font-mono text-xs text-zinc-500 tracking-widest">REPUTATION</p>
        {profile.tasksCompleted > 0 ? (
          <p className="text-sm text-zinc-300 leading-relaxed">
            <span className="text-blue-400 font-mono font-bold">{profile.tasksCompleted}</span> task{profile.tasksCompleted !== 1 ? "s" : ""} completed —
            your track record is tied to your World ID nullifier, not a username. Unfakeable.
          </p>
        ) : (
          <p className="text-sm text-zinc-500 leading-relaxed">
            No tasks completed yet. Claim a bounty to start building your verified reputation.
          </p>
        )}
        <Link
          href="/tasks"
          className="w-full sm:w-auto text-center bg-blue-600 text-white font-mono font-bold text-xs tracking-widest px-5 py-3 rounded-xl hover:bg-blue-500 transition-colors"
        >
          BROWSE BOUNTIES →
        </Link>
      </div>
    </div>
  );
}
