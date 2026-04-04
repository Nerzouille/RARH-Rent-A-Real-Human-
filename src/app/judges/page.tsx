"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";

const PERSONAS = [
  {
    key: "kenji-worker",
    name: "Kenji",
    role: "Worker",
    description: "Verified human worker. Claims tasks and earns HBAR.",
    color: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800",
    buttonClass: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
  {
    key: "sophie-client",
    name: "Sophie",
    role: "Client",
    description: "Human client. Posts tasks with HBAR escrow.",
    color: "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800",
    buttonClass: "bg-blue-600 text-white hover:bg-blue-700",
  },
  {
    key: "aria-agent",
    name: "Aria",
    role: "AI Agent",
    description: "Autonomous agent. Creates tasks via MCP protocol.",
    color: "bg-violet-50 border-violet-200 dark:bg-violet-950 dark:border-violet-800",
    buttonClass: "bg-violet-600 text-white hover:bg-violet-700",
  },
] as const;

async function callSwitch(persona: string) {
  const res = await fetch("/api/judges/switch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": process.env.NEXT_PUBLIC_ADMIN_RESET_KEY ?? "",
    },
    body: JSON.stringify({ persona }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Switch failed");
  }
  return res.json();
}

async function callReset() {
  const res = await fetch("/api/admin/reset", {
    method: "POST",
    headers: {
      "x-admin-key": process.env.NEXT_PUBLIC_ADMIN_RESET_KEY ?? "",
    },
  });
  if (!res.ok) throw new Error("Reset failed");
  return res.json();
}

export default function JudgesDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const me = trpc.auth.me.useQuery();

  async function handlePersonaClick(personaKey: string) {
    setLoading(personaKey);
    try {
      const result = await callSwitch(personaKey);

      if (personaKey === "aria-agent") {
        const taskInfo = result.taskId ? `Task ID: ${result.taskId}` : "Task created";
        const escrowInfo = result.escrowTxId ? ` | Escrow: ${result.escrowTxId}` : "";
        toast.success("Agent Aria triggered a task", {
          description: `${taskInfo}${escrowInfo}`,
        });
      } else if (result.redirect) {
        toast.success(`Switched to ${result.user?.role ?? personaKey}`);
        router.push(result.redirect);
        return;
      }
    } catch (err) {
      toast.error("Switch failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(null);
      me.refetch();
    }
  }

  async function handleReset() {
    setLoading("reset");
    try {
      await callReset();
      toast.success("Platform reset complete");
      me.refetch();
    } catch {
      toast.error("Reset failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 dark:bg-black px-6 py-12">
      <div className="w-full max-w-3xl space-y-8">
        <div className="text-center space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Demo Control Panel
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Judges Dashboard
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            One-click session switching for the 3 bounty flows
          </p>
        </div>

        {/* Current session */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4">
          <div className="text-center">
            <span className="text-xs uppercase tracking-wider text-zinc-400">Current Session</span>
            <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {me.data
                ? `${me.data.role} (${me.data.nullifier.slice(0, 20)}...)`
                : "No session"}
            </p>
          </div>
          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
            <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2 text-center">
              Authorization
            </label>
            <input
              type="password"
              placeholder="Enter ADMIN_RESET_KEY"
              className="w-full rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-black px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-center"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
            />
          </div>
        </div>

        {/* Persona cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {PERSONAS.map((p) => (
            <div
              key={p.key}
              className={`rounded-xl border p-5 flex flex-col items-center gap-3 ${p.color}`}
            >
              <div className="text-center">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {p.name}
                </h2>
                <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  {p.role}
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 text-center leading-relaxed">
                {p.description}
              </p>
              <Button
                className={`w-full mt-auto ${p.buttonClass}`}
                size="lg"
                disabled={loading !== null}
                onClick={() => handlePersonaClick(p.key)}
              >
                {loading === p.key
                  ? "Switching..."
                  : p.key === "aria-agent"
                    ? `Trigger Agent ${p.name}`
                    : `Login as ${p.name}`}
              </Button>
            </div>
          ))}
        </div>

        {/* Reset */}
        <div className="flex justify-center pt-4">
          <Button
            variant="destructive"
            size="lg"
            disabled={loading !== null}
            onClick={handleReset}
          >
            {loading === "reset" ? "Resetting..." : "Reset Platform"}
          </Button>
        </div>
      </div>
    </div>
  );
}
