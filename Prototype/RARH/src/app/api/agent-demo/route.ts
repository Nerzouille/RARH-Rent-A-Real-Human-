import { NextRequest } from 'next/server';
import { formatSIWEMessage } from '@worldcoin/agentkit';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';

export const runtime = 'nodejs';

const DEMO_AGENT_PRIVATE_KEY = (process.env.DEMO_AGENT_PRIVATE_KEY ?? generatePrivateKey()) as `0x${string}`;

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const baseUrl = req.nextUrl.origin;
  const hostname = req.nextUrl.hostname;
  const createUrl = `${baseUrl}/api/tasks/create`;

  const stream = new ReadableStream({
    async start(controller) {
      function send(step: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(step)}\n\n`));
      }

      try {
        // Step 1 — Wallet
        send({ step: 1, label: 'Agent initializing wallet...', status: 'running' });
        await delay(600);
        const account = privateKeyToAccount(DEMO_AGENT_PRIVATE_KEY);
        send({ step: 1, label: `Wallet ready: ${account.address.slice(0, 10)}...`, status: 'done' });
        await delay(300);

        // Step 2 — Sign AgentKit header
        send({ step: 2, label: 'Signing AgentKit authentication header...', status: 'running' });
        await delay(400);

        const info = {
          domain: hostname,
          uri: createUrl,
          statement: 'Post a task on HumanProof as a verified human-backed agent.',
          version: '1' as const,
          nonce: Math.random().toString(36).slice(2, 18),
          issuedAt: new Date().toISOString(),
          chainId: 'eip155:480',
          type: 'eip191' as const,
        };
        const message = formatSIWEMessage(info, account.address);
        const signature = await account.signMessage({ message });
        const headerPayload = btoa(JSON.stringify({ ...info, address: account.address, signature }));

        send({ step: 2, label: 'AgentKit header signed ✓', status: 'done' });
        await delay(300);

        // Step 3 — AgentBook
        send({ step: 3, label: 'Checking AgentBook on World Chain...', status: 'running' });
        await delay(800);

        // Step 4 — Post task
        send({ step: 4, label: 'Posting task to HumanProof...', status: 'running' });
        await delay(300);

        const taskPayload = {
          title: 'Testbot task for demo',
          description:
            'I am an AI agent managing product listings for an e-commerce platform. I need a human to review 20 AI-generated product descriptions and rate their naturalness, accuracy, and persuasiveness on a scale of 1-5. This is RLHF data collection — your feedback will directly improve my writing quality.',
          category: 'cognitive',
          budget: '15 USDC',
          budgetWei: '15000000',
          deadline: Date.now() + 24 * 3600000,
          tags: ['RLHF', 'content', 'evaluation', 'AI training'],
          clientName: 'testbot V12',
          privateFiles: [
            'https://docs.google.com/spreadsheets/d/demo-sheet — 20 product descriptions to evaluate',
            'https://forms.gle/demo-form — Rating form to fill in',
          ],
        };

        const res = await fetch(createUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'agentkit': headerPayload },
          body: JSON.stringify(taskPayload),
        });
        const data = await res.json();

        if (res.ok && data.success) {
          send({ step: 3, label: `AgentBook verified ✓ humanId: ${data.humanId?.slice(0, 14)}...`, status: 'done' });
          send({ step: 4, label: `Task #${data.task.id} posted — "${data.task.title}"`, status: 'done', task: data.task });
        } else {
          send({ step: 3, label: 'AgentBook: wallet not registered (demo mode)', status: 'warning' });
          const demoRes = await fetch(`${baseUrl}/api/agent-demo/task`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskPayload),
          });
          const demoData = await demoRes.json().catch(() => ({}));
          send({ step: 4, label: `Task #${demoData.task?.id} posted (demo mode)`, status: 'done', task: demoData.task });
        }

        send({ done: true });
      } catch (err) {
        send({ error: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
