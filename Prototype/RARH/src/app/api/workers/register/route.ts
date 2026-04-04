import { NextRequest, NextResponse } from 'next/server';

// In-memory store for hackathon demo
// Production: store on-chain via HumanProof.sol#registerWorker
const registeredWorkers = new Set<string>(); // Set of nullifier hashes

export async function POST(req: NextRequest) {
  const { proof, action } = await req.json();
  const rpId = process.env.RP_ID;

  if (!proof || !action) {
    return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
  }

  // Forward proof as-is to World ID v4 API (developer.world.org, using RP ID)
  const verifyRes = await fetch(
    `https://developer.world.org/api/v4/verify/${rpId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proof),
    }
  );

  const data = await verifyRes.json() as { success: boolean; nullifier?: string; detail?: string; code?: string };
  console.log('Worldcoin v4 verify response:', JSON.stringify(data));

  if (!verifyRes.ok || !data.success) {
    return NextResponse.json({ success: false, error: data.detail ?? data.code ?? 'World ID verification failed' }, { status: 400 });
  }

  const nullifier = data.nullifier ?? String(proof.responses?.[0]?.nullifier);

  if (registeredWorkers.has(nullifier)) {
    return NextResponse.json({ success: false, error: 'Already registered as a worker' }, { status: 409 });
  }

  registeredWorkers.add(nullifier);

  return NextResponse.json({
    success: true,
    nullifier,
    message: 'Worker registered. You are now verified human on HumanProof.',
  });
}
