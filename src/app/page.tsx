"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc/client";

// Checkerboard pattern: 1 = blue filled, 0 = transparent
const CHECKER = [1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1];

export default function Home() {
  const router = useRouter();
  const { data: session, isLoading } = trpc.auth.me.useQuery();

  useEffect(() => {
    if (!isLoading && session) {
      router.replace("/dashboard");
    }
  }, [session, isLoading, router]);

  if (isLoading || session) return null;

  return (
    <div className="relative flex flex-col overflow-hidden" style={{ minHeight: "calc(100vh - 56px)", background: "#000" }}>
      {/* Blue ambient glow — bottom left */}
      <div
        className="absolute bottom-0 left-0 pointer-events-none"
        style={{
          width: "700px",
          height: "700px",
          background: "radial-gradient(circle at 0% 100%, rgba(37,99,235,0.4) 0%, transparent 65%)",
        }}
      />

      {/* Top info bar */}
      <div className="relative z-10 mx-6 mt-6 border border-blue-700/60 rounded-2xl flex items-center justify-between px-7 py-3">
        <span className="text-sm text-zinc-400 font-light">Verified Human Marketplace</span>
        <span className="text-sm font-medium tracking-wide" style={{ color: "#3b82f6" }}>
          ETHGlobal Cannes · 2026
        </span>
        <span className="text-sm text-zinc-500 hidden sm:block">humanproof.app</span>
      </div>

      {/* Hero */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-8 py-8">
        <div className="relative">
          {/* Checkerboard — top right of text block */}
          <div className="absolute -top-6 right-0 translate-x-10 hidden md:grid grid-cols-4 gap-1.5">
            {CHECKER.map((filled, i) => (
              <div
                key={i}
                className="w-6 h-6"
                style={{ background: filled ? "#2563eb" : "transparent" }}
              />
            ))}
          </div>

          {/* Line 1 */}
          <div className="leading-none">
            <span
              className="font-black tracking-tighter leading-none block"
              style={{
                fontSize: "clamp(4rem, 13vw, 13rem)",
                color: "#f0ebe0",
                lineHeight: 0.9,
              }}
            >
              Rent a
            </span>
          </div>

          {/* Line 2 with asterisk */}
          <div className="flex items-center leading-none" style={{ marginTop: "-0.05em" }}>
            <span
              className="font-black leading-none"
              style={{
                fontSize: "clamp(3rem, 9vw, 9rem)",
                color: "#2563eb",
                lineHeight: 0.9,
                marginRight: "0.05em",
              }}
            >
              *
            </span>
            <span
              className="font-black tracking-tighter leading-none"
              style={{
                fontSize: "clamp(4rem, 13vw, 13rem)",
                color: "#f0ebe0",
                lineHeight: 0.9,
              }}
            >
              Human.
            </span>
          </div>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/register"
              className="px-6 py-2.5 border border-blue-600/70 rounded-xl text-sm font-mono tracking-widest transition-all hover:bg-blue-600/15 hover:border-blue-500"
              style={{ color: "#60a5fa" }}
            >
              PROVE HUMANITY →
            </Link>
            <Link
              href="/tasks"
              className="text-sm font-mono tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              BROWSE BOUNTIES
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative z-10 flex items-center justify-between px-8 py-6">
        <span className="text-sm font-light" style={{ color: "#f0ebe0" }}>
          HumanProof
        </span>
        <span className="text-sm text-zinc-600 text-center hidden sm:block font-mono tracking-widest">
          WORLD ID · HEDERA · MCP 2.0
        </span>
        <span className="text-sm text-zinc-500">ETH Global 2026</span>
      </div>
    </div>
  );
}
