"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type ResetResult = {
  success: boolean;
  message: string;
  seeded: { users: number; tasks: number } | null;
  timestamp: string;
};

export default function AdminPage() {
  const [loading, setLoading] = useState<"reset" | "seed" | null>(null);
  const [lastResult, setLastResult] = useState<ResetResult | null>(null);
  const [adminKey, setAdminKey] = useState("");

  async function handleReset(withSeed: boolean) {
    if (!adminKey) {
      toast.error("Please enter the admin reset key");
      return;
    }

    const confirmMsg = withSeed
      ? "Reset and seed the platform? This will delete ALL current data."
      : "Reset the platform to a clean state? This will delete ALL current data.";

    if (!window.confirm(confirmMsg)) return;

    const key = withSeed ? "seed" : "reset";
    setLoading(key);
    try {
      const url = withSeed ? "/api/admin/reset?seed=true" : "/api/admin/reset";
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "x-admin-key": adminKey,
        },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Reset failed");
      }
      const result = (await res.json()) as ResetResult;

      setLastResult(result);
      toast.success(withSeed ? "Reset & seeded" : "Platform reset", {
        description: result.message,
      });
    } catch (err) {
      toast.error("Reset failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 dark:bg-black px-6 py-12">
      <div className="w-full max-w-lg space-y-8">

        {/* Header */}
        <div className="text-center space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Admin
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Demo Reset
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Clear all data for a clean judge demo loop
          </p>
        </div>

        {/* Warning */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <span className="font-semibold">Admin-only — </span>
          do not share this URL. All data will be permanently deleted.
        </div>

        {/* Actions */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Reset Platform
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Deletes all tasks, users, and nullifiers. Greenfield state — no demo data.
            </p>
          </div>
          <Button
            variant="destructive"
            className="w-full"
            disabled={loading !== null}
            onClick={() => handleReset(false)}
          >
            {loading === "reset" ? "Resetting..." : "Reset Platform"}
          </Button>

          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-1">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Reset & Seed Demo Data
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Clears everything then re-populates with demo users and tasks. Use this for the fastest judge loop.
            </p>
          </div>
          <Button
            className="w-full bg-amber-600 text-white hover:bg-amber-700"
            disabled={loading !== null}
            onClick={() => handleReset(true)}
          >
            {loading === "seed" ? "Resetting & Seeding..." : "Reset & Seed Demo Data"}
          </Button>
        </div>

        {/* Last result */}
        {lastResult && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950 px-4 py-3 space-y-1">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              {lastResult.message}
            </p>
            {lastResult.seeded && (
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Seeded: {lastResult.seeded.users} users · {lastResult.seeded.tasks} tasks
              </p>
            )}
            <p className="text-xs text-emerald-600 dark:text-emerald-500">
              {new Date(lastResult.timestamp).toLocaleTimeString()}
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-center gap-4 pt-2 text-sm">
          <Link
            href="/judges"
            className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline underline-offset-4"
          >
            Judges Dashboard
          </Link>
          <Link
            href="/tasks"
            className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline underline-offset-4"
          >
            Task List
          </Link>
        </div>

      </div>
    </div>
  );
}
          Judges Dashboard
          </Link>
          <Link
            href="/tasks"
            className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline underline-offset-4"
          >
            Task List
          </Link>
        </div>

      </div>
    </div>
  );
}
