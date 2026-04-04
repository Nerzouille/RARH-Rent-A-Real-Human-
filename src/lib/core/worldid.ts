import { signRequest } from "@worldcoin/idkit-core/signing";

export async function generateRPContext(action: string) {
  const { sig, nonce, createdAt, expiresAt } = signRequest({
    signingKeyHex: process.env.RP_SIGNING_KEY!,
    action,
  });

  return {
    rp_id: process.env.RP_ID!,
    nonce,
    created_at: createdAt,
    expires_at: expiresAt,
    signature: sig,
  };
}

// The RP ID is always sourced from the server environment — never from the caller.
export async function verifyWorldIDProof(
  idkitResponse: unknown
): Promise<{ nullifier: string; verified: boolean }> {
  // Mock mode for development — returns a deterministic nullifier from the input
  if (process.env.NEXT_PUBLIC_MOCK_WORLDID === "true") {
    const raw = JSON.stringify(idkitResponse ?? {});
    const hash = (Array.from(new TextEncoder().encode(raw))
      .reduce((h, b) => ((h << 5) - h + b) | 0, 0) >>> 0)
      .toString(16);
    return {
      nullifier: `mock-nullifier-${hash}`,
      verified: true,
    };
  }

  const rpId = process.env.WORLD_RP_ID?.trim();
  if (!rpId) {
    throw new Error("WORLD_RP_ID is not configured");
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
    const err = await res.json().catch(() => ({}));
    throw new Error(`World ID verification failed: ${JSON.stringify(err)}`);
  }

  const result = await res.json().catch(() => ({}));
  const nullifier = result.nullifier ?? result.nullifier_hash;

  if (!nullifier || typeof nullifier !== "string") {
    throw new Error("World ID verification returned invalid or missing nullifier");
  }


  return { nullifier, verified: true };
}
