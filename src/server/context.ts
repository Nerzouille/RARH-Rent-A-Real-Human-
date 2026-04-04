import { type NextRequest } from "next/server";
import { verifySession } from "@/lib/core/session";
import { type SessionPayload } from "@/lib/schemas";

export async function createContext(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  let session: SessionPayload | null = null;

  if (token) {
    session = await verifySession(token);
  }

  return { session, req };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
