"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IDKitRequestWidget, orbLegacy } from "@worldcoin/idkit";
import type { IDKitResult, RpContext } from "@worldcoin/idkit";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { AlreadyRegisteredPanel } from "@/components/identity/AlreadyRegisteredPanel";

const isMock = process.env.NEXT_PUBLIC_MOCK_WORLDID === "true";

export function RegisterWidget({
  role = "worker",
  redirectTo = "/tasks",
}: {
  role?: "worker" | "client";
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [fetchError, setFetchError] = useState(false);

  const registerMutation = trpc.auth.register.useMutation();
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  // Fetch RP context for staging/prod widget (not needed in mock mode)
  useEffect(() => {
    if (isMock) return;

    const controller = new AbortController();
    setFetchError(false);

    async function loadContext() {
      try {
        const res = await fetch("/api/rp-context", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "register" }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("Failed to load context");

        const ctx: RpContext = await res.json();
        setRpContext(ctx);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setFetchError(true);
        toast.error("Failed to load verification context. Please refresh.");
      }
    }

    loadContext();
    return () => controller.abort();
  }, []);

  // ─── Error helper ───────────────────────────────────────────────────────────
  function handleRegisterError(err: unknown) {
    const errorMessage =
      err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message
        : "";

    if (errorMessage === "HUMAN_ALREADY_REGISTERED") {
      setAlreadyRegistered(true);
      return;
    }

    toast.error("Registration failed. Please try again.");
  }

  // ─── Mock mode ──────────────────────────────────────────────────────────────
  async function handleMockRegister() {
    try {
      await registerMutation.mutateAsync({
        rp_id: "mock-rp-id",
        // Added Math.random() for better entropy in mock nullifier generation
        idkit_response: { mock: true, action: "register", timestamp: Date.now() + Math.random() },
        role,
      });
      router.push(redirectTo);
    } catch (err) {
      handleRegisterError(err);
    }
  }

  if (alreadyRegistered) {
    return <AlreadyRegisteredPanel onReset={() => setAlreadyRegistered(false)} />;
  }

  if (isMock) {
    return (
      <Button
        size="lg"
        onClick={handleMockRegister}
        disabled={registerMutation.isPending}
        className="w-full"
      >
        {registerMutation.isPending ? "Registering…" : "Simulate Registration"}
      </Button>
    );
  }

  // ─── Staging / production widget ────────────────────────────────────────────
  async function handleVerify(result: IDKitResult) {
    if (!rpContext) {
      toast.error("Verification context missing. Please refresh.");
      throw new Error("Missing context");
    }

    try {
      await registerMutation.mutateAsync({
        rp_id: rpContext.rp_id,
        idkit_response: result,
        role,
      });
    } catch (err) {
      handleRegisterError(err);
      throw err; // Re-throw so IDKit shows an error state, not onSuccess
    }
  }

  function onSuccess() {
    router.push(redirectTo);
  }

  const appId = process.env.NEXT_PUBLIC_APP_ID;
  const canOpenWidget = !isMock && !!rpContext && !!appId;

  return (
    <>
      <Button
        size="lg"
        onClick={() => setOpen(true)}
        disabled={!canOpenWidget || registerMutation.isPending}
        className="w-full"
      >
        {fetchError
          ? "Error loading widget"
          : rpContext
          ? "Register with World ID"
          : "Loading…"}
      </Button>

      {canOpenWidget && (
        <IDKitRequestWidget
          open={open}
          onOpenChange={setOpen}
          app_id={appId as `app_${string}`}
          action="register"
          rp_context={rpContext}
          allow_legacy_proofs={true}
          preset={orbLegacy()}
          handleVerify={handleVerify}
          onSuccess={onSuccess}
        />
      )}
      {!isMock && !appId && (
        <p className="text-xs text-red-500 mt-2">NEXT_PUBLIC_APP_ID is missing.</p>
      )}
    </>
  );
}
