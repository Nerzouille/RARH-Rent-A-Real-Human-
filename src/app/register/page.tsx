import type { Metadata } from "next";
import { RegisterWidget } from "@/components/identity/RegisterWidget";

export const metadata: Metadata = {
  title: "Prove Your Humanity — RARH",
  description: "Iris-scan verified. Zero-knowledge. One nullifier. No bots.",
};

export default function RegisterPage() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs text-zinc-500 tracking-widest uppercase">
            Identity Verification
          </p>
          <h1 className="font-mono font-black text-4xl text-zinc-50 leading-none">
            PROVE<br />
            <span className="text-blue-500">YOU&apos;RE</span><br />
            HUMAN.
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Your iris scan stays on your device. Only a cryptographic nullifier is stored —
            unique to you, untraceable to your identity.
          </p>
        </div>

        <RegisterWidget redirectTo="/dashboard" />

        <div className="border border-zinc-800 rounded p-4 flex flex-col gap-2">
          {[
            "One nullifier per human — no duplicates possible",
            "Zero personal data stored on-chain or in DB",
            "Verify once, access everything",
          ].map((line) => (
            <p key={line} className="flex items-start gap-2 text-xs text-zinc-500">
              <span className="text-emerald-400 shrink-0 mt-0.5">✓</span>
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
