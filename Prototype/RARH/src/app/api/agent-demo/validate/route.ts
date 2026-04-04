import { NextRequest, NextResponse } from 'next/server';
import { formatSIWEMessage } from '@worldcoin/agentkit';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';

export const runtime = 'nodejs';

const DEMO_AGENT_PRIVATE_KEY = (process.env.DEMO_AGENT_PRIVATE_KEY ?? generatePrivateKey()) as `0x${string}`;

export async function POST(req: NextRequest) {
  const { taskId } = await req.json();
  const baseUrl = req.nextUrl.origin;
  const validateUrl = `${baseUrl}/api/tasks/validate`;

  const account = privateKeyToAccount(DEMO_AGENT_PRIVATE_KEY);

  const info = {
    domain: req.nextUrl.hostname,
    uri: validateUrl,
    statement: 'Validate a completed task on HumanProof.',
    version: '1' as const,
    nonce: Math.random().toString(36).slice(2, 18),
    issuedAt: new Date().toISOString(),
    chainId: 'eip155:480',
    type: 'eip191' as const,
  };
  const message = formatSIWEMessage(info, account.address);
  const signature = await account.signMessage({ message });
  const headerPayload = btoa(JSON.stringify({ ...info, address: account.address, signature }));

  const res = await fetch(validateUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'agentkit': headerPayload },
    body: JSON.stringify({ taskId }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
