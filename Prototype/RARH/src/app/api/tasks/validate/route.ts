import { NextRequest, NextResponse } from 'next/server';
import { parseAgentkitHeader, validateAgentkitMessage, verifyAgentkitSignature, createAgentBookVerifier } from '@worldcoin/agentkit';
import { getTask, updateTask } from '@/lib/task-store';
import { recordTaskValidated } from '@/lib/worker-store';

export const runtime = 'nodejs';

const agentBook = createAgentBookVerifier({
  rpcUrl: 'https://worldchain-mainnet.g.alchemy.com/public',
});

export async function POST(req: NextRequest) {
  const { taskId } = await req.json();
  const agentkitHeader = req.headers.get('agentkit');

  if (!taskId) return NextResponse.json({ success: false, error: 'Missing taskId' }, { status: 400 });

  const task = getTask(taskId);
  if (!task) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
  if (task.status !== 'completed') return NextResponse.json({ success: false, error: 'Task not completed yet' }, { status: 409 });

  if (agentkitHeader) {
    let agentAddress: string;
    try {
      const payload = parseAgentkitHeader(agentkitHeader);

      const validation = await validateAgentkitMessage(payload, req.nextUrl.href, { maxAge: 300_000 });
      if (!validation.valid) return NextResponse.json({ success: false, error: validation.error }, { status: 401 });

      const sigResult = await verifyAgentkitSignature(payload);
      if (!sigResult.valid) return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });

      agentAddress = payload.address;

      // Verify agent is registered in AgentBook
      const humanId = await agentBook.lookupHuman(payload.address, payload.chainId);
      if (!humanId) return NextResponse.json({ success: false, error: 'Agent not registered in AgentBook' }, { status: 403 });

      // Verify this agent is the one who created the task
      if (task.client.toLowerCase() !== agentAddress.toLowerCase()) {
        return NextResponse.json(
          { success: false, error: 'Only the agent who posted this task can validate it' },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid agentkit header' }, { status: 401 });
    }
  }

  updateTask(taskId, { status: 'validated' });

  // Update worker reputation if we have their nullifier
  let workerStats;
  if (task.workerNullifier) {
    const budgetUsdc = Math.round(parseFloat(task.budgetWei) / 1_000_000) || 0;
    workerStats = recordTaskValidated(task.workerNullifier, budgetUsdc);
  }

  return NextResponse.json({
    success: true,
    taskId,
    message: `Payment of ${task.budget} released to worker.`,
    budget: task.budget,
    workerStats: workerStats ?? null,
  });
}
