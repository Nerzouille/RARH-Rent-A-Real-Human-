"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc/client";

// 4 cols × 3 rows — 1 = blue square, 0 = empty
const CHECKER: (0 | 1)[] = [1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1];

const CREAM = "#f0ebe0";
const BLUE  = "#2563eb";
const BLUE_LIGHT = "#3b82f6";

export default function Home() {
  const router = useRouter();
  const { data: session, isLoading } = trpc.auth.me.useQuery();

  useEffect(() => {
    if (!isLoading && session) router.replace("/dashboard");
  }, [session, isLoading, router]);

  if (isLoading || session) return null;

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 56px)",
        background: "#000",
        overflow: "hidden",
      }}
    >
      {/* ── Orbe bleu — bas gauche, grand et intense ── */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: "-15%",
          left: "-15%",
          width: "70vw",
          height: "70vw",
          background: `radial-gradient(circle, rgba(37,99,235,0.6) 0%, rgba(37,99,235,0.25) 40%, transparent 70%)`,
          filter: "blur(60px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* ── Barre info en haut ── */}
      <div style={{ position: "relative", zIndex: 1, flexShrink: 0, padding: "1.25rem 1.25rem 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.65rem 1.5rem",
            border: `1px solid rgba(37,99,235,0.55)`,
            borderRadius: "1rem",
          }}
        >
          <span style={{ color: "#9ca3af", fontSize: "0.875rem", fontWeight: 300 }}>
            Verified Human Marketplace
          </span>
          <span style={{ color: BLUE_LIGHT, fontSize: "0.875rem", fontWeight: 500, letterSpacing: "0.05em" }}>
            ETHGlobal Cannes · 2026
          </span>
          <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>
            humanproof.app
          </span>
        </div>
      </div>

      {/* ── Hero — occupe tout l'espace restant ── */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 6vw",
        }}
      >
        {/*
          Bloc de texte.
          L'astérisque est en position absolue à gauche de la ligne 2.
          Le damier est en position absolue à droite de la ligne 2.
        */}
        <div style={{ position: "relative" }}>

          {/* ── Ligne 1 : "Rent a" ── */}
          <div
            style={{
              fontSize: "clamp(3.5rem, 13.5vw, 15rem)",
              fontWeight: 900,
              color: CREAM,
              letterSpacing: "-0.04em",
              lineHeight: 0.9,
              display: "block",
            }}
          >
            Rent a
          </div>

          {/* ── Ligne 2 : [*] Human. [damier] ── */}
          <div
            style={{
              position: "relative",
              display: "inline-block",
              marginTop: "-0.04em",
            }}
          >
            {/* Astérisque — accroché à gauche, chevauchant les deux lignes */}
            <span
              aria-hidden
              style={{
                position: "absolute",
                right: "100%",
                top: 0,
                transform: "translateY(-48%)",
                fontSize: "clamp(2.5rem, 10vw, 11rem)",
                fontWeight: 900,
                color: BLUE,
                lineHeight: 1,
                paddingRight: "0.12em",
                display: "block",
                userSelect: "none",
              }}
            >
              *
            </span>

            {/* Texte ligne 2 */}
            <span
              style={{
                fontSize: "clamp(3.5rem, 13.5vw, 15rem)",
                fontWeight: 900,
                color: CREAM,
                letterSpacing: "-0.04em",
                lineHeight: 0.9,
                display: "block",
              }}
            >
              Human.
            </span>

            {/* Damier — accroché à droite, centré sur la ligne 2 */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                left: "100%",
                top: "50%",
                transform: "translateY(-50%)",
                paddingLeft: "0.35em",
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "clamp(4px, 0.5vw, 9px)",
                userSelect: "none",
              }}
            >
              {CHECKER.map((filled, i) => (
                <div
                  key={i}
                  style={{
                    width:  "clamp(14px, 1.9vw, 30px)",
                    height: "clamp(14px, 1.9vw, 30px)",
                    background: filled ? BLUE : "transparent",
                  }}
                />
              ))}
            </div>
          </div>

          {/* ── CTA discrets ── */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "1.25rem",
              marginTop: "2.75rem",
            }}
          >
            <Link
              href="/register"
              style={{
                padding: "0.55rem 1.4rem",
                border: `1px solid rgba(37,99,235,0.6)`,
                borderRadius: "0.75rem",
                color: "#60a5fa",
                fontSize: "0.7rem",
                fontFamily: "monospace",
                letterSpacing: "0.18em",
                textDecoration: "none",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = "rgba(37,99,235,0.12)";
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(59,130,246,0.8)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(37,99,235,0.6)";
              }}
            >
              PROVE HUMANITY →
            </Link>
            <Link
              href="/tasks"
              style={{
                color: "#6b7280",
                fontSize: "0.7rem",
                fontFamily: "monospace",
                letterSpacing: "0.18em",
                textDecoration: "none",
                transition: "color 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#d1d5db"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#6b7280"; }}
            >
              BROWSE BOUNTIES
            </Link>
          </div>
        </div>
      </div>

      {/* ── Barre du bas ── */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem 2rem",
        }}
      >
        <span style={{ color: CREAM, fontSize: "0.875rem", fontWeight: 300 }}>HumanProof</span>
        <span
          style={{ color: "#374151", fontSize: "0.7rem", fontFamily: "monospace", letterSpacing: "0.12em" }}
          className="hidden sm:block"
        >
          WORLD ID · HEDERA · MCP 2.0
        </span>
        <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>ETH Global 2026</span>
      </div>
    </div>
  );
}
