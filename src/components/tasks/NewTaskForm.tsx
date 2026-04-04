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
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Your balance</span>
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {balanceData?.balance ?? 0} <span className="font-normal text-zinc-400">HBAR</span>
        </span>
      </div>

      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
        >
          Task Title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={form.title}
          onChange={(e) => handleChange("title", e.target.value)}
          placeholder='e.g. "Pick up package in Osaka"'
          className={`w-full rounded-md border px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.title ? "border-red-500" : "border-zinc-300 dark:border-zinc-700"
          }`}
        />
        {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
        >
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          rows={4}
          value={form.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="What exactly needs to be done?"
          className={`w-full rounded-md border px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${
            errors.description ? "border-red-500" : "border-zinc-300 dark:border-zinc-700"
          }`}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-red-600">{errors.description}</p>
        )}
      </div>

      {/* Budget */}
      <div>
        <label
          htmlFor="budget"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
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
          className={`w-full rounded-md border px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.budget_hbar ? "border-red-500" : "border-zinc-300 dark:border-zinc-700"
          }`}
        />
        <p className="mt-1 text-xs text-zinc-400">Held in Hedera escrow on task creation</p>
        {errors.budget_hbar && (
          <p className="mt-1 text-xs text-red-600">{errors.budget_hbar}</p>
        )}
      </div>

      {/* Deadline */}
      <div>
        <label
          htmlFor="deadline"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
        >
          Deadline <span className="text-red-500">*</span>
        </label>
        <input
          id="deadline"
          type="date"
          value={form.deadline}
          min={new Date().toISOString().split("T")[0]}
          onChange={(e) => handleChange("deadline", e.target.value)}
          className={`w-full rounded-md border px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.deadline ? "border-red-500" : "border-zinc-300 dark:border-zinc-700"
          }`}
        />
        {errors.deadline && <p className="mt-1 text-xs text-red-600">{errors.deadline}</p>}
      </div>

      {/* Submit error */}
      {submitError && (
        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950 rounded-md px-3 py-2">
          {submitError}
        </p>
      )}

      {/* Submit button */}
      <Button type="submit" disabled={isDisabled} className="w-full">
        {createTask.isPending ? "Posting…" : "Post Task & Fund Escrow"}
      </Button>

      <p className="text-xs text-zinc-400 text-center">
        By posting, you authorize escrow of the budget amount. You&apos;ll validate completion
        before payment releases.
      </p>

      {/* Simulate Deposit (demo) */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
        <p className="text-xs text-zinc-400 mb-2 text-center">
          Need HBAR? Use the demo deposit:
        </p>
        <SimulateDepositButton />
      </div>
    </form>
  );
}
