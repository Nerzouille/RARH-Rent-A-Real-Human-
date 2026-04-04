import { NextRequest, NextResponse } from 'next/server';
import { getTask, updateTask } from '@/lib/task-store';

export async function POST(req: NextRequest) {
  const { taskId, proofText } = await req.json();

  if (!taskId || !proofText) {
    return NextResponse.json({ success: false, error: 'Missing taskId or proofText' }, { status: 400 });
  }

  const task = getTask(taskId);
  if (!task) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
  if (task.status !== 'assigned') return NextResponse.json({ success: false, error: 'Task not claimed' }, { status: 409 });

  updateTask(taskId, { status: 'completed', completionProofUri: proofText });

  return NextResponse.json({ success: true, taskId });
}
