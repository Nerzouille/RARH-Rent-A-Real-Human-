import type { Task } from '@/types';
import { MOCK_TASKS } from './mock-data';

// Use a Node.js global to share state across route module instances in Next.js dev
declare global {
  // eslint-disable-next-line no-var
  var __taskStore: Task[] | undefined;
  // eslint-disable-next-line no-var
  var __taskNextId: number | undefined;
}

if (!global.__taskStore) {
  global.__taskStore = [...MOCK_TASKS];
  global.__taskNextId = MOCK_TASKS.length + 1;
}

const tasks = global.__taskStore;

export function getAllTasks(): Task[] {
  return tasks;
}

export function getTask(id: string): Task | undefined {
  return tasks.find((t) => t.id === id);
}

export function addTask(task: Omit<Task, 'id' | 'createdAt' | 'status'>): Task {
  const newTask: Task = {
    ...task,
    id: String(global.__taskNextId!++),
    status: 'open',
    createdAt: Date.now(),
  };
  tasks.push(newTask);
  return newTask;
}

export function updateTask(id: string, patch: Partial<Task>): Task | undefined {
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return undefined;
  tasks[idx] = { ...tasks[idx], ...patch };
  return tasks[idx];
}
