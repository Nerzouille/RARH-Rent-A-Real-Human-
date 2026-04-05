"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

const NAV = [
  { href: "/tasks", label: "BOUNTIES" },
  { href: "/client/new-task", label: "POST" },
  { href: "/profile", label: "IDENTITY" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: session } = trpc.auth.me.useQuery();

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      router.push("/");
      router.refresh();
    },
  });

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-black/90 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link
          href={session ? "/dashboard" : "/"}
          className="font-mono font-bold tracking-tighter text-lg hover:opacity-80 transition-opacity shrink-0"
          style={{ color: "#60a5fa" }}
        >
          OpenHuman
        </Link>

        {/* Nav */}
        {session && (
          <nav className="flex items-center gap-1">
            {NAV.map(({ href, label }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-1.5 rounded text-xs font-mono font-semibold tracking-widest transition-colors ${
                    active
                      ? "bg-blue-600 text-white"
                      : "text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/70"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right */}
        {session ? (
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/profile" className="flex items-center gap-2 group">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors hidden sm:block">
                {session.nullifier.slice(0, 10)}…
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                VERIFIED
              </span>
            </Link>
            <button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="px-2.5 py-1 rounded text-xs font-mono text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/70 transition-colors disabled:opacity-40"
            >
              {logoutMutation.isPending ? "…" : "EXIT"}
            </button>
          </div>
        ) : (
          <Link
            href="/register"
            className="px-3 py-1.5 rounded text-xs font-mono font-bold border border-blue-700/60 text-blue-400 hover:bg-blue-600/10 hover:border-blue-500 transition-all"
          >
            PROVE HUMANITY →
          </Link>
        )}
      </div>
    </header>
  );
}
