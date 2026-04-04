import { NextResponse } from 'next/server';
import { getAllTasks } from '@/lib/task-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getAllTasks());
}
