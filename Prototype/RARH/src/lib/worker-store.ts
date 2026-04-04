// Worker reputation store — keyed by World ID nullifier
// Shared across Next.js route modules via Node.js globals

interface WorkerStats {
  nullifier: string;
  tasksCompleted: number;
  totalEarnedUsdc: number; // integer USDC cents
  reputationScore: number; // 0-100
  badge: 'none' | 'verified_human'; // unlocked at 3+ validated tasks
}

declare global {
  // eslint-disable-next-line no-var
  var __workerStore: Map<string, WorkerStats> | undefined;
}

if (!global.__workerStore) {
  global.__workerStore = new Map();
}

const store = global.__workerStore;

export function getWorkerStats(nullifier: string): WorkerStats {
  return store.get(nullifier) ?? {
    nullifier,
    tasksCompleted: 0,
    totalEarnedUsdc: 0,
    reputationScore: 0,
    badge: 'none',
  };
}

export function recordTaskValidated(nullifier: string, budgetUsdc: number): WorkerStats {
  const current = getWorkerStats(nullifier);
  const tasksCompleted = current.tasksCompleted + 1;
  const totalEarnedUsdc = current.totalEarnedUsdc + budgetUsdc;
  // Score: 10 pts per task, capped at 100, +5 bonus at badge threshold
  const reputationScore = Math.min(100, tasksCompleted * 10 + (tasksCompleted >= 3 ? 5 : 0));
  const badge: WorkerStats['badge'] = tasksCompleted >= 3 ? 'verified_human' : 'none';
  const updated: WorkerStats = { nullifier, tasksCompleted, totalEarnedUsdc, reputationScore, badge };
  store.set(nullifier, updated);
  return updated;
}
