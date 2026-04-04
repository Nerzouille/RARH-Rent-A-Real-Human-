import { NextResponse, type NextRequest } from "next/server";
import { completeRegistration, HumanAlreadyRegisteredError } from "@/lib/core/auth-register";
import { SESSION_COOKIE_OPTIONS } from "@/lib/core/session";

export async function POST(req: NextRequest) {
  const body = await req.json();
  // rp_id is accepted for backward-compat with existing clients but ignored server-side;
  // the server always uses WORLD_RP_ID from the environment.
  const { idkit_response, role } = body;

  if (idkit_response === undefined) {
    return NextResponse.json(
      { error: "Missing required field: idkit_response" },
      { status: 400 }
    );
  }

  try {
    const { user, token } = await completeRegistration(idkit_response, role ?? "worker");

    const response = NextResponse.json({ success: true, userId: user.id });
    response.cookies.set("session", token, SESSION_COOKIE_OPTIONS);
    return response;
  } catch (err) {
    if (err instanceof HumanAlreadyRegisteredError) {
      return NextResponse.json(
        {
          error: "HUMAN_ALREADY_REGISTERED",
          message: "This World ID is already registered. Use /api/admin/reset to clear for demo.",
        },
        { status: 409 }
      );
    }
    console.error("Verification error:", err);
    return NextResponse.json(
      { error: "Verification failed", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}
