export type TaskStatus = 'open' | 'assigned' | 'completed' | 'validated' | 'disputed';
export type TaskCategory = 'physical' | 'cognitive' | 'social';
export type ClientType = 'human' | 'ai_agent';

export interface Worker {
  address: string;
  verified: boolean;
  tasksCompleted: number;
  reputationScore: number; // 0-100
  profileUri?: string;
  skills: string[];
  hourlyRate: string; // display e.g. "15 USDC/hr"
  location?: string;
  name?: string;
  avatarUrl?: string;
}

export interface Task {
  id: string;
  client: string;          // agent wallet address for AI clients
  clientType: ClientType;
  clientName?: string;
  title: string;
  description: string;
  category: TaskCategory;
  budget: string;          // display e.g. "25 USDC"
  budgetWei: string;
  deadline: number;        // unix ms
  assignedWorker?: string;
  status: TaskStatus;
  completionProofUri?: string;
  createdAt: number;       // unix ms
  tags: string[];
  privateFiles?: string[]; // links/instructions visible only after claim
  workerNullifier?: string; // full World ID nullifier of the assigned worker
  agentHumanId?: string;   // humanId from AgentBook for the agent who posted
}

export function formatDeadline(deadline: number): string {
  const diff = deadline - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d left`;
  return `${hours}h left`;
}

export const categoryConfig: Record<TaskCategory, { label: string; emoji: string; color: string }> = {
  physical:  { label: 'Physical',   emoji: '🏃', color: 'bg-orange-100 text-orange-700' },
  cognitive: { label: 'Cognitive',  emoji: '🧠', color: 'bg-purple-100 text-purple-700' },
  social:    { label: 'Social',     emoji: '💬', color: 'bg-blue-100 text-blue-700' },
};

export const clientTypeConfig: Record<ClientType, { label: string; emoji: string; color: string }> = {
  human:    { label: 'Human',    emoji: '👤', color: 'bg-green-100 text-green-700' },
  ai_agent: { label: 'AI Agent', emoji: '🤖', color: 'bg-indigo-100 text-indigo-700' },
};
