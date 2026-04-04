"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { HumanVerifiedBadge } from "@/components/identity/HumanVerifiedBadge";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isLoading: sessionLoading } = trpc.auth.me.useQuery();
  const { data: profile, isLoading: profileLoading } = trpc.auth.profile.useQuery(undefined, {
    enabled: !!session,
  });

  useEffect(() => {
    if (!sessionLoading && !session) {
      router.push("/");
    }
  }, [session, sessionLoading, router]);

  if (sessionLoading || profileLoading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center">
        <p className="font-mono text-xs text-zinc-500 animate-pulse tracking-widest">LOADING…</p>
      </div>
    );
  }

  if (!session || !profile) return null;

  return (
    <div className="max-w-lg mx-auto w-full px-6 py-10 flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs text-zinc-500 tracking-widest uppercase mb-1">Identity</p>
          <h1 className="font-mono font-black text-3xl text-zinc-50 leading-none">
            MY<br />
            <span className="text-blue-500">PROFILE.</span>
          </h1>
        </div>
        <Link href="/tasks" className="font-mono text-xs text-zinc-500 hover:text-blue-500 transition-colors tracking-widest">
          ← JOBS
        </Link>
      </div>

      <HumanVerifiedBadge
        nullifier={profile.nullifier}
        role={profile.role}
        tasksCompleted={profile.tasksCompleted}
        hbarBalance={profile.hbarBalance}
      />

      <div className="border border-zinc-800 rounded bg-zinc-900 px-5 py-4 flex flex-col gap-3">
        <p className="font-mono text-xs text-zinc-500 tracking-widest">REPUTATION</p>
        {profile.tasksCompleted > 0 ? (
          <p className="text-sm text-zinc-300 leading-relaxed">
            <span className="text-blue-500 font-mono font-bold">{profile.tasksCompleted}</span> task{profile.tasksCompleted !== 1 ? "s" : ""} completed —
            your track record is tied to your World ID nullifier, not to a username. Unfakeable.
          </p>
        ) : (
          <p className="text-sm text-zinc-500 leading-relaxed">
            No tasks completed yet. Claim a bounty to start building your verified reputation.
          </p>
        )}
        <Link
          href="/tasks"
          className="inline-flex items-center justify-center px-5 py-3 bg-blue-500 text-zinc-950 font-mono font-bold text-sm tracking-widest rounded hover:bg-blue-400 transition-colors"
        >
          BROWSE BOUNTIES →
        </Link>
      </div>
    </div>
  );
}
