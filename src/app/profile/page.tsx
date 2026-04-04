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
      <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-500 animate-pulse">Loading profile...</p>
      </div>
    );
  }

  if (!session || !profile) return null;

  return (
    <div className="flex flex-col flex-1 bg-zinc-50 dark:bg-black">
      <div className="max-w-2xl mx-auto w-full px-6 py-12 flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">My Profile</h1>
          <Link
            href="/tasks"
            className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            ← Back to tasks
          </Link>
        </div>

        {/* Verification card */}
        <HumanVerifiedBadge
          nullifier={profile.nullifier}
          role={profile.role}
          tasksCompleted={profile.tasksCompleted}
          hbarBalance={profile.hbarBalance}
        />

        {/* Reputation detail */}
        {profile.tasksCompleted > 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
            🏆 {profile.tasksCompleted} task{profile.tasksCompleted !== 1 ? "s" : ""} completed —
            your reputation is on-chain via your World ID nullifier.
          </p>
        )}

        {profile.tasksCompleted === 0 && (
          <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center">
            Complete your first task to start building your verified reputation.
          </p>
        )}
      </div>
    </div>
  );
}
