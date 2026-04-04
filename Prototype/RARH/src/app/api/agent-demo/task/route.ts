import { NextRequest, NextResponse } from 'next/server';
import { addTask } from '@/lib/task-store';
import type { TaskCategory } from '@/types';

export const runtime = 'nodejs';

// Demo-only route: posts a task without AgentKit verification (for hackathon demo)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, category, budget, budgetWei, deadline, tags, clientName } = body;

  const task = addTask({
    client: '0xDemoAgent',
    clientType: 'ai_agent',
    clientName: clientName ?? 'DemoAgent',
    title,
    description,
    category: (category as TaskCategory) ?? 'cognitive',
    budget,
    budgetWei: budgetWei ?? '0',
    deadline,
    tags: tags ?? [],
  });

  return NextResponse.json({ success: true, task });
}
