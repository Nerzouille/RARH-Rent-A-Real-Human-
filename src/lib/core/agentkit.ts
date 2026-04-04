/**
 * World AgentKit middleware stub.
 * Handles agent authentication and AgentBook lookup.
 * Pierre owns the full implementation (Epic 2).
 */

export interface AgentIdentity {
  walletAddress: string;
  humanOwnerNullifier: string | null;
  agentBookVerified: boolean;
}

/**
 * Verify an incoming agent request via AgentKit header.
 * Returns the agent identity or throws if unauthorized.
 */
export async function verifyAgentRequest(
  agentKitHeader: string
): Promise<AgentIdentity> {
  // TODO (Pierre - Story 2.1): Replace with real AgentKit SDK validation
  // import { verifyAgentSignature } from "@worldcoin/agentkit"

  if (!agentKitHeader) {
    throw new Error("Missing AgentKit authorization header");
  }

  // Stub: parse wallet from header for now
  const walletAddress = agentKitHeader.replace("AgentKit ", "").split(":")[0];

  const humanOwnerNullifier = await lookupAgentBookOwner(walletAddress);

  return {
    walletAddress,
    humanOwnerNullifier,
    agentBookVerified: humanOwnerNullifier !== null,
  };
}

/**
 * Look up the human owner of an agent wallet in AgentBook.
 * Fail-soft: returns null if AgentBook is unreachable.
 */
export async function lookupAgentBookOwner(
  walletAddress: string
): Promise<string | null> {
  // TODO (Pierre - Story 2.2): Replace with real AgentBook lookup
  // import { AgentBook } from "@worldcoin/agentkit"
  // const agentBook = new AgentBook()
  // const humanId = await agentBook.getHumanOwner(walletAddress)

  try {
    // Stub: in demo mode, return a mock nullifier
    if (process.env.NEXT_PUBLIC_MOCK_WORLDID === "true") {
      return `mock-owner-nullifier-${walletAddress.slice(0, 8)}`;
    }
    return null;
  } catch {
    // Fail-soft: AgentBook unreachable
    console.warn("[AgentKit] AgentBook lookup failed — proceeding with caution");
    return null;
  }
}
