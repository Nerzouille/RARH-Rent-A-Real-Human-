import { NextRequest, NextResponse } from 'next/server';
import { getWorkerStats } from '@/lib/worker-store';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const nullifier = req.nextUrl.searchParams.get('nullifier');
  if (!nullifier) return NextResponse.json({ error: 'Missing nullifier' }, { status: 400 });
  return NextResponse.json(getWorkerStats(nullifier));
}
