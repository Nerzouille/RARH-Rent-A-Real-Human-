import { NextRequest, NextResponse } from 'next/server';
import { getTask, updateTask } from '@/lib/task-store';

const claimedTasks = new Map<string, string>(); // taskId => nullifier

export async function POST(req: NextRequest) {
  const { taskId, proof } = await req.json();
  const rpId = process.env.RP_ID;

  if (!taskId || !proof) {
    return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
  }

  const task = getTask(taskId);
  if (!task) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
  if (task.status !== 'open') return NextResponse.json({ success: false, error: 'Task not available' }, { status: 409 });

  const verifyRes = await fetch(
    `https://developer.world.org/api/v4/verify/${rpId}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(proof) }
  );
  const data = await verifyRes.json() as { success: boolean; nullifier?: string; detail?: string; code?: string };

  if (!verifyRes.ok || !data.success) {
    return NextResponse.json({ success: false, error: data.detail ?? data.code ?? 'World ID verification failed' }, { status: 400 });
  }

  const nullifier = data.nullifier ?? String(proof.responses?.[0]?.nullifier);
  if (claimedTasks.has(taskId)) {
    return NextResponse.json({ success: false, error: 'Task already claimed' }, { status: 409 });
  }

  claimedTasks.set(taskId, nullifier);
  updateTask(taskId, { status: 'assigned', assignedWorker: nullifier.slice(0, 10), workerNullifier: nullifier });

  return NextResponse.json({ success: true, taskId });
}
