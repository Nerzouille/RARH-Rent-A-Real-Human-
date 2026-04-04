interface HumanVerifiedBadgeProps {
  nullifier: string;
  role: "worker" | "client" | "admin";
  tasksCompleted: number;
  hbarBalance: number;
  compact?: boolean;
}

function truncate(s: string, n = 12) {
  return s.length <= n ? s : `${s.slice(0, 6)}…${s.slice(-4)}`;
}

export function HumanVerifiedBadge({
  nullifier,
  role,
  tasksCompleted,
  hbarBalance,
  compact = false,
}: HumanVerifiedBadgeProps) {
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
        <span aria-hidden>✓</span>
        Human Verified
      </span>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 flex flex-col gap-4 w-full max-w-sm">
      {/* Badge */}
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-xl font-bold">
          ✓
        </span>
        <div>
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            Human Verified
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Orb-level · World ID 4.0
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-zinc-100 dark:border-zinc-800" />

      {/* Identity */}
      <div className="flex flex-col gap-1">
        <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide font-medium">
          Nullifier
        </p>
        <p className="font-mono text-sm text-zinc-700 dark:text-zinc-300">
          {truncate(nullifier, 20)}
        </p>
      </div>

      {/* Role */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide font-medium">
          Role
        </span>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 capitalize">
          {role}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 px-4 py-3 text-center">
          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{tasksCompleted}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Tasks done</p>
        </div>
        <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 px-4 py-3 text-center">
          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{hbarBalance}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">ℏ Balance</p>
        </div>
      </div>
    </div>
  );
}
