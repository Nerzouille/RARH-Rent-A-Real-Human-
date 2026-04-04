import { NextResponse, type NextRequest } from "next/server";
import { generateRPContext } from "@/lib/core/worldid";

export async function POST(req: NextRequest) {
  const { action } = await req.json();

  if (!action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }

  // Mock mode: return a fake RP context
  if (process.env.NEXT_PUBLIC_MOCK_WORLDID === "true") {
    return NextResponse.json({
      rp_id: "mock-rp-id",
      nonce: `mock-nonce-${Date.now()}`,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      signature: "mock-signature",
    });
  }

  const context = await generateRPContext(action);
  return NextResponse.json(context);
}
