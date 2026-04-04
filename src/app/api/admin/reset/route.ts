import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, tasks, nullifiers } from "@/server/db/schema";

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-admin-key");

  if (key !== process.env.ADMIN_RESET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db.delete(nullifiers);
  await db.delete(tasks);
  await db.delete(users);

  return NextResponse.json({
    success: true,
    message: "Platform reset. Ready for next judge.",
    timestamp: new Date().toISOString(),
  });
}
