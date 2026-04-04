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
      router.push("/client/register");
    }
  }, [session, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-500 animate-pulse">Checking session...</p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 dark:bg-black">
      <main className="flex flex-col gap-6 px-6 py-16 max-w-lg w-full">
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            ← Back
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Post a New Task
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            A verified human will complete it.
          </p>
        </div>

        {session.role === "worker" && (
          <div className="rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            You&apos;re registered as a worker. To post tasks, register as a client.{" "}
            <Link href="/client/register" className="underline font-medium">
              Register as client →
            </Link>
          </div>
        )}

        <NewTaskForm />
      </main>
    </div>
  );
}
