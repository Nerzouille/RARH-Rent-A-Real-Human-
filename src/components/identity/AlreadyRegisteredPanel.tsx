"use client";

import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";

interface AlreadyRegisteredPanelProps {
  onReset: () => void;
}

export function AlreadyRegisteredPanel({ onReset }: AlreadyRegisteredPanelProps) {
  const [resetDone, setResetDone] = useState(false);
  const resetMutation = trpc.auth.adminReset.useMutation({
    onSuccess: () => {
      setResetDone(true);
      toast.success("Database reset. Ready for next judge!");
    },
    onError: () => {
      toast.error("Reset failed — check ADMIN_RESET_KEY in .env.local");
    },
  });

  if (resetDone) {
    return (
      <div className="w-full rounded-xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-6 flex flex-col items-center gap-4 text-center">
        <span className="text-3xl">✓</span>
        <p className="font-semibold text-emerald-700 dark:text-emerald-400">
          Platform reset complete
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          All users, tasks and nullifiers cleared. Ready for the next judge.
        </p>
        <Button variant="outline" size="sm" onClick={onReset} className="w-full">
          Register now
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-0.5">⚠</span>
        <div>
          <p className="font-semibold text-amber-800 dark:text-amber-300">
            Identity Already Registered
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
            This World ID nullifier is already in the system — nullifier uniqueness is working correctly.
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-amber-200 dark:border-amber-700" />

      {/* Judge explanation */}
      <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
        <p className="font-medium text-zinc-700 dark:text-zinc-300">What this means:</p>
        <ul className="list-disc list-inside space-y-1 pl-1">
          <li>Each World ID can only register once per action</li>
          <li>Duplicate attempts are cryptographically rejected</li>
          <li>No workaround is possible without resetting the demo DB</li>
        </ul>
      </div>

      {/* Demo operator reset */}
      <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 p-4 flex flex-col gap-2">
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Demo Operator
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Reset the database to let the next judge register fresh.
        </p>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => resetMutation.mutate()}
          disabled={resetMutation.isPending}
          className="w-full mt-1"
        >
          {resetMutation.isPending ? "Resetting…" : "Reset Demo Database"}
        </Button>
      </div>
    </div>
  );
}
