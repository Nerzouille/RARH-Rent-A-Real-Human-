interface HumanVerifiedBadgeProps {
  nullifier: string;
  role: "worker" | "client" | "admin";
  tasksCompleted: number;
  hbarBalance: number;
  compact?: boolean;
}

function truncate(s: string, n = 20) {
  return s.length <= n ? s : `${s.slice(0, 8)}…${s.slice(-6)}`;
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
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
        <span aria-hidden>✓</span>
        VERIFIED
      </span>
    );
  }

  return (
    <div className="border border-zinc-800 rounded-xl bg-zinc-900 p-6 flex flex-col gap-4 w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-900/40 text-emerald-400 text-xl font-bold border border-emerald-800">
          ✓
        </span>
        <div>
          <p className="font-mono text-sm font-bold text-emerald-400 tracking-widest">HUMAN VERIFIED</p>
          <p className="font-mono text-xs text-zinc-500">Orb-level · World ID 4.0</p>
        </div>
      </div>

      <div className="border-t border-zinc-800" />

      {/* Nullifier */}
      <div className="flex flex-col gap-1">
        <p className="font-mono text-xs text-zinc-500 tracking-widest">NULLIFIER</p>
        <p className="font-mono text-sm text-zinc-300">{truncate(nullifier)}</p>
      </div>

      {/* Role — shown but de-emphasized since everyone can do both */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-zinc-500 tracking-widest">ROLE</span>
        <span className="font-mono px-2 py-0.5 rounded text-xs font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase">
          {role}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-zinc-800 rounded bg-zinc-950 px-4 py-3 text-center">
          <p className="font-mono font-black text-xl text-blue-400">{tasksCompleted}</p>
          <p className="font-mono text-xs text-zinc-500 tracking-widest">TASKS DONE</p>
        </div>
        <div className="border border-zinc-800 rounded bg-zinc-950 px-4 py-3 text-center">
          <p className="font-mono font-black text-xl text-blue-400">{hbarBalance} ℏ</p>
          <p className="font-mono text-xs text-zinc-500 tracking-widest">BALANCE</p>
        </div>
      </div>
    </div>
  );
}
