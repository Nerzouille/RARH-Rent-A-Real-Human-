import { NextRequest, NextResponse } from 'next/server';
import {
  parseAgentkitHeader,
  validateAgentkitMessage,
  verifyAgentkitSignature,
  createAgentBookVerifier,
} from '@worldcoin/agentkit';
import { addTask } from '@/lib/task-store';
import type { TaskCategory } from '@/types';

export const runtime = 'nodejs';

const agentBook = createAgentBookVerifier({
  rpcUrl: 'https://worldchain-mainnet.g.alchemy.com/public',
});

export async function POST(req: NextRequest) {
  const agentkitHeader = req.headers.get('agentkit');

  if (!agentkitHeader) {
    // Return 402-style challenge so agents know what to do
    return NextResponse.json(
      {
        error: 'AgentKit authentication required',
        agentkit: {
          domain: req.nextUrl.hostname,
          uri: req.nextUrl.href,
          statement: 'Sign in to post a task on HumanProof as a verified human-backed agent.',
          version: '1',
          supportedChains: [{ chainId: 'eip155:480', type: 'eip191' }],
        },
      },
      { status: 402 }
    );
  }

  // 1. Parse header
  let payload;
  try {
    payload = parseAgentkitHeader(agentkitHeader);
  } catch {
    return NextResponse.json({ error: 'Invalid agentkit header' }, { status: 401 });
  }

  // 2. Validate message (freshness, domain, URI)
  const resourceUri = req.nextUrl.href;
  console.log('resourceUri:', resourceUri, 'payload.uri:', payload.uri, 'payload.domain:', payload.domain);
  const validation = await validateAgentkitMessage(payload, resourceUri, {
    maxAge: 300_000, // 5 minutes in ms
  });
  console.log('validation:', JSON.stringify(validation));
  if (!validation.valid) {
    return NextResponse.json({ error: `AgentKit validation failed: ${validation.error}` }, { status: 401 });
  }

  // 3. Verify signature
  const sigResult = await verifyAgentkitSignature(payload);
  console.log('sigResult:', JSON.stringify(sigResult));
  if (!sigResult.valid) {
    return NextResponse.json({ error: 'Invalid agent signature' }, { status: 401 });
  }

  // 4. Look up humanId in AgentBook — confirms agent is backed by a real human
  const humanId = await agentBook.lookupHuman(payload.address, payload.chainId);
  console.log('humanId:', humanId, 'address:', payload.address, 'chainId:', payload.chainId);
  if (!humanId) {
    return NextResponse.json(
      { error: 'Agent not registered in AgentBook. Run: npx @worldcoin/agentkit-cli register <wallet>' },
      { status: 403 }
    );
  }

  // 5. Create the task
  const body = await req.json().catch(() => ({}));
  const { title, description, category, budget, budgetWei, deadline, tags, clientName, privateFiles } = body;

  if (!title || !description || !budget || !deadline) {
    return NextResponse.json({ error: 'Missing required task fields' }, { status: 400 });
  }

  const task = addTask({
    client: payload.address,
    clientType: 'ai_agent',
    clientName: clientName ?? `Agent ${payload.address.slice(0, 6)}`,
    title,
    description,
    category: (category as TaskCategory) ?? 'cognitive',
    budget,
    budgetWei: budgetWei ?? '0',
    deadline,
    tags: tags ?? [],
    privateFiles: privateFiles ?? [],
    agentHumanId: humanId,
  });

  return NextResponse.json({
    success: true,
    task,
    humanId,
    message: `Task "${task.title}" posted by verified agent (humanId: ${humanId.slice(0, 10)}...)`,
  });
}
