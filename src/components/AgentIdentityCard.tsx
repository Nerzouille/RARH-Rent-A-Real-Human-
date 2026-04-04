interface AgentIdentityCardProps {
  walletAddress: string;
  humanOwnerNullifier: string | null;
  agentBookVerified: boolean;
  agentBookStatus: "verified" | "not-registered" | "offline";
}

function truncate(str: string, start = 6, end = 4): string {
  if (str.length <= start + end + 3) return str;
  return `${str.slice(0, start)}...${str.slice(-end)}`;
}

export function AgentIdentityCard({
  walletAddress,
  humanOwnerNullifier,
  agentBookVerified,
  agentBookStatus,
}: AgentIdentityCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3 text-sm">

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-zinc-900 dark:text-zinc-50">Client Info</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 dark:bg-violet-900/30 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
          Autonomous Agent
        </span>
      </div>

      {/* Wallet */}
      <div className="space-y-0.5">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Agent Wallet</p>
        <p className="font-mono text-zinc-900 dark:text-zinc-100">{truncate(walletAddress)}</p>
      </div>

      {/* AgentBook status */}
      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 space-y-0.5">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">AgentBook — Human Owner</p>

        {agentBookVerified && humanOwnerNullifier ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Verified
            </span>
            <span className="font-mono text-zinc-700 dark:text-zinc-300">
              {truncate(humanOwnerNullifier)}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {agentBookStatus === "offline" ? "AgentBook Offline — Caution" : "Not Registered"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
