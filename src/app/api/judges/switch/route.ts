import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { users, nullifiers } from "@/server/db/schema";
import { createSession, SESSION_COOKIE_OPTIONS } from "@/lib/core/session";

const PERSONAS = {
  "kenji-worker": {
    nullifier: "judge-demo-kenji-worker",
    role: "worker" as const,
    redirect: "/tasks",
    hbar_balance: 0,
  },
  "sophie-client": {
    nullifier: "judge-demo-sophie-client",
    role: "client" as const,
    redirect: "/client/new-task",
    hbar_balance: 500,
  },
  "aria-agent": {
    wallet: "0x-demo-agent-aria",
  },
} as const;

type HumanPersona = "kenji-worker" | "sophie-client";
type PersonaKey = keyof typeof PERSONAS;

function isHumanPersona(key: PersonaKey): key is HumanPersona {
  return key === "kenji-worker" || key === "sophie-client";
}

/**
 * Upserts a demo persona user and nullifier, then creates a session.
 * Returns the JWT token and redirect URL.
 */
async function switchToHuman(personaKey: HumanPersona) {
  const persona = PERSONAS[personaKey];

  const [user] = await db
    .insert(users)
    .values({
      nullifier: persona.nullifier,
      role: persona.role,
      hbar_balance: persona.hbar_balance,
    })
    .onConflictDoUpdate({
      target: users.nullifier,
      set: { role: persona.role },
    })
    .returning();

  await db
    .insert(nullifiers)
    .values({ nullifier: persona.nullifier, action: "register" })
    .onConflictDoNothing();

  const token = await createSession({
    nullifier: user.nullifier,
    role: user.role,
    userId: user.id,
  });

  return { token, redirect: persona.redirect, user };
}

/**
 * Triggers an agent task creation via the MCP endpoint.
 */
async function triggerAgent(req: NextRequest) {
  const agentWallet = PERSONAS["aria-agent"].wallet;
  const origin = req.nextUrl.origin;

  const mcpBody = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "create_task",
      arguments: {
        title: "Demo: Translate landing page to French",
        description:
          "Translate the HumanProof landing page copy into French for the ETHGlobal Cannes demo.",
        budget_hbar: 50,
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  };

  const mcpResponse = await fetch(`${origin}/api/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-agentkit-auth": agentWallet,
    },
    body: JSON.stringify(mcpBody),
  });

  const result = await mcpResponse.json();
  return { mcpResponse: result, agentWallet };
}

export async function POST(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== process.env.ADMIN_RESET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const persona = body.persona as PersonaKey | undefined;

  if (!persona || !(persona in PERSONAS)) {
    return NextResponse.json(
      { error: "Invalid persona. Use: kenji-worker, sophie-client, or aria-agent" },
      { status: 400 }
    );
  }

  if (isHumanPersona(persona)) {
    const { token, redirect, user } = await switchToHuman(persona);

    const cookieStore = await cookies();
    cookieStore.set("session", token, SESSION_COOKIE_OPTIONS);

    return NextResponse.json({
      success: true,
      persona,
      redirect,
      user: { id: user.id, nullifier: user.nullifier, role: user.role },
    });
  }

  // aria-agent
  const { mcpResponse, agentWallet } = await triggerAgent(req);

  return NextResponse.json({
    success: true,
    persona: "aria-agent",
    agentWallet,
    mcpResult: mcpResponse,
  });
}
