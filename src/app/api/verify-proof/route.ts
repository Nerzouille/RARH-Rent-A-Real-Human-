import { NextResponse, type NextRequest } from "next/server";
import { verifyWorldIDProof } from "@/lib/core/worldid";
import { db } from "@/lib/db";
import { users, nullifiers } from "@/server/db/schema";
import { createSession } from "@/lib/core/session";

export async function POST(req: NextRequest) {
  const { rp_id, idkit_response, role } = await req.json();

  try {
    const { nullifier } = await verifyWorldIDProof(rp_id, idkit_response);

    // Check uniqueness
    const existing = await db.query.nullifiers.findFirst({
      where: (n, { and, eq }) =>
        and(eq(n.nullifier, nullifier), eq(n.action, "register")),
    });

    if (existing) {
      return NextResponse.json(
        {
          error: "HUMAN_ALREADY_REGISTERED",
          message: "This World ID is already registered. Use /api/admin/reset to clear for demo.",
        },
        { status: 409 }
      );
    }

    // Upsert user
    const [user] = await db
      .insert(users)
      .values({ nullifier, role: role ?? "worker" })
      .onConflictDoUpdate({ target: users.nullifier, set: { role: role ?? "worker" } })
      .returning();

    await db
      .insert(nullifiers)
      .values({ nullifier, action: "register" })
      .onConflictDoNothing();

    const token = await createSession({ nullifier, role: user.role, userId: user.id });

    const response = NextResponse.json({ success: true, userId: user.id });
    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (err) {
    return NextResponse.json(
      { error: "Verification failed", details: String(err) },
      { status: 400 }
    );
  }
}
