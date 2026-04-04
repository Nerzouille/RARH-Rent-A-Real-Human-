"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { NewTaskForm } from "@/components/tasks/NewTaskForm";

export default function NewTaskPage() {
  const router = useRouter();
  const { data: session, isLoading } = trpc.auth.me.useQuery();

  useEffect(() => {
    if (!isLoading && !session) {
      router.push("/register");
    }
  }, [session, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center">
        <p className="font-mono text-xs text-zinc-500 animate-pulse tracking-widest">LOADING…</p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="max-w-lg mx-auto w-full px-6 py-10 flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link href="/dashboard" className="font-mono text-xs text-zinc-500 hover:text-blue-500 transition-colors tracking-widest">
          ← BACK
        </Link>
        <p className="font-mono text-xs text-zinc-500 tracking-widest uppercase">Post a Bounty</p>
        <h1 className="font-mono font-black text-3xl text-zinc-50 leading-none">
          HIRE A<br />
          <span className="text-blue-500">HUMAN.</span>
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Describe your task. A verified human will claim it, complete it, and get paid in HBAR on validation.
        </p>
      </div>

      <NewTaskForm />
    </div>
  );
}
