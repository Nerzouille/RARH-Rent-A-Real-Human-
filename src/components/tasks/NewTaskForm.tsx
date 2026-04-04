"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { SimulateDepositButton } from "@/components/simulate-deposit-button";
import { CreateTaskSchema } from "@/lib/schemas";

type FormData = {
  title: string;
  description: string;
  budget_hbar: string;
  deadline: string;
};

type FieldErrors = Partial<Record<keyof FormData, string>>;

/**
 * Form component for human clients to post new tasks.
 * Validates inputs client-side with Zod and handles Hedera escrow via tRPC.
 */
export function NewTaskForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    title: "",
    description: "",
    budget_hbar: "",
    deadline: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: balanceData } = trpc.payment.getBalance.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const createTask = trpc.task.create.useMutation({
    onSuccess: (data) => {
      toast.success("Task posted!", {
        description: `Escrow funded on Hedera (TX: ${data.escrow_tx_id.slice(0, 12)}…).`,
        action: data.hashscanLink
          ? {
              label: "View on Hashscan",
              onClick: () => window.open(data.hashscanLink, "_blank"),
            }
          : undefined,
      });
      utils.task.list.invalidate();
      utils.payment.getBalance.invalidate();
      router.push(`/tasks/${data.id}`);
    },
    onError: (error) => {
      setSubmitError(error.message);
    },
  });

  /**
   * Normalizes a date to end-of-day in the user's local timezone
   * and converts it to an ISO string for the server.
   */
  function normalizeDeadline(dateStr: string): string {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    date.setHours(23, 59, 59, 999);
    return date.toISOString();
  }

  function validate(): boolean {
    const deadlineISO = normalizeDeadline(form.deadline);

    const result = CreateTaskSchema.safeParse({
      title: form.title,
      description: form.description,
      budget_hbar: parseFloat(form.budget_hbar) || 0,
      deadline: deadlineISO,
    });

    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FormData;
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      // Validate deadline is in the future (local comparison)
      if (form.deadline) {
        const selected = new Date(form.deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selected < today) {
          fieldErrors.deadline = "Must be a future date";
        }
      }
      setErrors(fieldErrors);
      return false;
    }

    // Extra check: deadline must be today or future in local time
    const selected = new Date(form.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selected < today) {
      setErrors({ deadline: "Must be a future date" });
      return false;
    }

    setErrors({});
    return true;
  }

  function handleChange(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    setSubmitError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const deadlineISO = normalizeDeadline(form.deadline);
    createTask.mutate({
      title: form.title,
      description: form.description,
      budget_hbar: Math.floor(parseFloat(form.budget_hbar)),
      deadline: deadlineISO,
    });
  }

  const isFormEmpty =
    !form.title || !form.description || !form.budget_hbar || !form.deadline;
  const hasErrors = Object.keys(errors).length > 0;
  const isDisabled = isFormEmpty || hasErrors || createTask.isPending;

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5 text-left">
      {/* Balance display */}
      <div className="border border-zinc-800 rounded bg-zinc-900 px-4 py-3 flex items-center justify-between">
        <span className="font-mono text-xs text-zinc-500 tracking-widest">YOUR BALANCE</span>
        <span className="font-mono font-black text-blue-500 text-lg">
          {balanceData?.balance ?? 0} ℏ
        </span>
      </div>

      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block font-mono text-xs text-zinc-400 tracking-widest mb-1"
        >
          Task Title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={form.title}
          onChange={(e) => handleChange("title", e.target.value)}
          placeholder='e.g. "Pick up package in Osaka"'
          className={`w-full rounded border px-3 py-2 text-sm bg-zinc-900 text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono ${
            errors.title ? "border-red-500" : "border-zinc-700 focus:border-blue-500"
          }`}
        />
        {errors.title && <p className="mt-1 font-mono text-xs text-red-400">{errors.title}</p>}
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block font-mono text-xs text-zinc-400 tracking-widest mb-1"
        >
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          rows={4}
          value={form.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="What exactly needs to be done?"
          className={`w-full rounded border px-3 py-2 text-sm bg-zinc-900 text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono resize-none ${
            errors.description ? "border-red-500" : "border-zinc-700 focus:border-blue-500"
          }`}
        />
        {errors.description && (
          <p className="mt-1 font-mono text-xs text-red-400">{errors.description}</p>
        )}
      </div>

      {/* Budget */}
      <div>
        <label
          htmlFor="budget"
          className="block font-mono text-xs text-zinc-400 tracking-widest mb-1"
        >
          Budget (HBAR) <span className="text-red-500">*</span>
        </label>
        <input
          id="budget"
          type="number"
          min={1}
          step={1}
          value={form.budget_hbar}
          onChange={(e) => handleChange("budget_hbar", e.target.value)}
          placeholder="15"
          className={`w-full rounded border px-3 py-2 text-sm bg-zinc-900 text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono ${
            errors.budget_hbar ? "border-red-500" : "border-zinc-700 focus:border-blue-500"
          }`}
        />
        <p className="mt-1 font-mono text-xs text-zinc-600">Held in Hedera escrow on task creation</p>
        {errors.budget_hbar && (
          <p className="mt-1 font-mono text-xs text-red-400">{errors.budget_hbar}</p>
        )}
      </div>

      {/* Deadline */}
      <div>
        <label
          htmlFor="deadline"
          className="block font-mono text-xs text-zinc-400 tracking-widest mb-1"
        >
          Deadline <span className="text-red-500">*</span>
        </label>
        <input
          id="deadline"
          type="date"
          value={form.deadline}
          min={new Date().toISOString().split("T")[0]}
          onChange={(e) => handleChange("deadline", e.target.value)}
          className={`w-full rounded border px-3 py-2 text-sm bg-zinc-900 text-zinc-50 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono ${
            errors.deadline ? "border-red-500" : "border-zinc-700 focus:border-blue-500"
          }`}
        />
        {errors.deadline && <p className="mt-1 font-mono text-xs text-red-400">{errors.deadline}</p>}
      </div>

      {/* Submit error */}
      {submitError && (
        <p className="font-mono text-xs text-red-400 border border-red-800 rounded bg-red-900/20 px-3 py-2">
          {submitError}
        </p>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isDisabled}
        className="w-full bg-blue-500 text-zinc-950 font-mono font-bold text-sm tracking-widest px-4 py-3 rounded hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {createTask.isPending ? "POSTING…" : "POST BOUNTY & FUND ESCROW →"}
      </button>

      <p className="font-mono text-xs text-zinc-600 text-center leading-relaxed">
        Budget is locked in Hedera escrow. Released to the worker when you validate completion.
      </p>

      {/* Simulate Deposit (demo) */}
      <div className="border-t border-zinc-800 pt-4 flex flex-col gap-2">
        <p className="font-mono text-xs text-zinc-600 text-center tracking-widest">NEED ℏ? USE THE DEMO FAUCET:</p>
        <SimulateDepositButton />
      </div>
    </form>
  );
}
