import type { Metadata } from "next";
import { RegisterWidget } from "@/components/identity/RegisterWidget";

export const metadata: Metadata = {
  title: "Register as Client — HumanProof",
  description: "Verify your identity with World ID to post tasks on the verified human marketplace.",
};

export default function ClientRegisterPage() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex flex-col items-center gap-8 text-center px-6 py-24 max-w-md w-full">
        <div className="flex flex-col items-center gap-3">
          <span className="text-3xl">📋</span>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Register as Client
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Verify your identity with World ID to post tasks. Your budget will be held in Hedera
            escrow until your worker completes the job.
          </p>
        </div>

        <RegisterWidget role="client" redirectTo="/client/new-task" />

        <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-xs">
          Your World ID nullifier is stored to prevent duplicate accounts. No personal data is
          collected.
        </p>
      </main>
    </div>
  );
}
