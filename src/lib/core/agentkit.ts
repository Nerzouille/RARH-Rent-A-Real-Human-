/**
 * World AgentKit middleware — Story 2.1.
 * Validates the x-agentkit-auth header and extracts the agent wallet address.
 *
 * Header format: "AgentKit 0x<40 hex chars>"
 *
 * Story 2.2 owns the AgentBook lookup (lookupAgentBookOwner stays a stub here).
 */

import { agentKitHeaderSchema } from "@/lib/schemas";

export interface AgentIdentity {
  walletAddress: string;
  humanOwnerNullifier: string | null;
  agentBookVerified: boolean;
}

export class AgentAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentAuthError";
  }
}

const WALLET_CAPTURE_RE = /^AgentKit (0x[0-9a-fA-F]{40})$/;

/**
 * Verify an incoming agent request via the x-agentkit-auth header.
 * Returns the agent identity or throws AgentAuthError if unauthorized.
 */
export async function verifyAgentRequest(
  agentKitHeader: string
): Promise<AgentIdentity> {
  // Mock mode: accept any well-formed header without real SDK calls
  if (process.env.NEXT_PUBLIC_MOCK_WORLDID === "true") {
    const parsed = agentKitHeaderSchema.safeParse(agentKitHeader);
    if (!parsed.success) {
      throw new AgentAuthError("Invalid AgentKit header format (mock mode)");
    }
    const match = WALLET_CAPTURE_RE.exec(agentKitHeader)!;
    return {
      walletAddress: match[1],
      humanOwnerNullifier: null,
      agentBookVerified: false,
    };
  }

  // Production: validate header with Zod schema
  const parsed = agentKitHeaderSchema.safeParse(agentKitHeader);
  if (!parsed.success) {
    throw new AgentAuthError(
      agentKitHeader
        ? "Invalid AgentKit header format — expected: AgentKit 0x<40 hex chars>"
        : "Missing AgentKit authorization header"
    );
  }

  const match = WALLET_CAPTURE_RE.exec(agentKitHeader)!;
  const walletAddress = match[1];

  // AgentBook lookup is Story 2.2 — always null here
  const humanOwnerNullifier = await lookupAgentBookOwner(walletAddress);

  return {
    walletAddress,
    humanOwnerNullifier,
    agentBookVerified: humanOwnerNullifier !== null,
  };
}

/**
 * Look up the human owner of an agent wallet in AgentBook.
 * Story 2.2 replaces this stub with the real AgentBook SDK call.
 * Fail-soft: returns null if unreachable.
 */
export async function lookupAgentBookOwner(
  _walletAddress: string
): Promise<string | null> {
  // TODO (Story 2.2): import { AgentBook } from "@worldcoin/agentkit"
  // const agentBook = new AgentBook()
  // const humanId = await agentBook.getHumanOwner(_walletAddress)
  return null;
}
