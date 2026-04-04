import { signRequest } from "@worldcoin/idkit-core/signing";

export async function generateRPContext(action: string) {
  const { sig, nonce, createdAt, expiresAt } = signRequest({
    signingKeyHex: process.env.WORLD_RP_SIGNING_KEY!,
    action,
  });

  return {
    rp_id: process.env.WORLD_RP_ID!,
    nonce,
    created_at: createdAt,
    expires_at: expiresAt,
    signature: sig,
  };
}

export async function verifyWorldIDProof(
  rpId: string,
  idkitResponse: unknown
): Promise<{ nullifier: string; verified: boolean }> {
  // Mock mode for development
  if (process.env.NEXT_PUBLIC_MOCK_WORLDID === "true") {
    return {
      nullifier: `mock-nullifier-${Date.now()}`,
      verified: true,
    };
  }

  const res = await fetch(
    `https://developer.world.org/api/v4/verify/${rpId}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(idkitResponse),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`World ID verification failed: ${JSON.stringify(err)}`);
  }

  const result = await res.json();
  const nullifier = result.nullifier ?? result.nullifier_hash;

  return { nullifier, verified: true };
}
