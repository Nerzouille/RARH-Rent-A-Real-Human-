import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, tasks, nullifiers } from "@/server/db/schema";
import { runSeed } from "@/server/db/seed";

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-admin-key");

  if (key !== process.env.ADMIN_RESET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shouldSeed = req.nextUrl.searchParams.get("seed") === "true";

  await db.delete(nullifiers);
  await db.delete(tasks);
  await db.delete(users);

  // Clear session cookie to avoid ghost sessions
  const cookieStore = await cookies();
  cookieStore.delete("session");

  let seeded: { users: number; tasks: number } | null = null;
  if (shouldSeed) {
    seeded = await runSeed(db);
  }

  return NextResponse.json({
    success: true,
    message: shouldSeed
      ? `Platform reset and seeded. ${seeded!.users} users, ${seeded!.tasks} tasks ready.`
      : "Platform reset. Ready for next judge.",
    seeded,
    timestamp: new Date().toISOString(),
  });
}
