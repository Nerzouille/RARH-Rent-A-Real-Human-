"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Bot,
  Landmark,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { hashscanUrl } from "@/lib/core/hashscan";

interface AuditTrailProps {
  clientType: "human" | "agent";
  clientNullifier: string | null;
  clientAgentWallet: string | null;
  clientAgentOwnerNullifier: string | null;
  workerNullifier: string | null;
  escrowTxId: string | null;
  paymentTxId: string | null;
  status: string;
}

type EventStatus = "success" | "pending" | "inactive" | "warning";

interface AuditEvent {
  id: string;
  icon: React.ReactNode;
  label: string;
  status: EventStatus;
  detail: string | null;
  link: string | null;
}

function truncate(str: string, start = 6, end = 4): string {
  if (str.length <= start + end + 3) return str;
  return `${str.slice(0, start)}...${str.slice(-end)}`;
}

const STATUS_STYLES: Record<EventStatus, { dot: string; text: string; bg: string }> = {
  success: {
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
  },
  pending: {
    dot: "bg-amber-500 animate-pulse",
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-900/20",
  },
  inactive: {
    dot: "bg-zinc-300 dark:bg-zinc-600",
    text: "text-zinc-400 dark:text-zinc-500",
    bg: "bg-zinc-50 dark:bg-zinc-800/50",
  },
  warning: {
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-900/20",
  },
};

function buildEvents(props: AuditTrailProps): AuditEvent[] {
  const events: AuditEvent[] = [];

  if (props.clientType === "human") {
    events.push({
      id: "client-worldid",
      icon: <ShieldCheck className="h-4 w-4" />,
      label: "Client World ID",
      status: props.clientNullifier ? "success" : "inactive",
      detail: props.clientNullifier ? truncate(props.clientNullifier) : null,
      link: null,
    });
  } else {
    events.push({
      id: "agent-auth",
      icon: <Bot className="h-4 w-4" />,
      label: "Agent Authenticated",
      status: props.clientAgentWallet ? "success" : "inactive",
      detail: props.clientAgentWallet ? truncate(props.clientAgentWallet) : null,
      link: null,
    });
    events.push({
      id: "agentbook-owner",
      icon: <ShieldCheck className="h-4 w-4" />,
      label: "AgentBook Owner",
      status: props.clientAgentOwnerNullifier
        ? "success"
        : props.clientAgentWallet
          ? "warning"
          : "inactive",
      detail: props.clientAgentOwnerNullifier
        ? truncate(props.clientAgentOwnerNullifier)
        : props.clientAgentWallet
          ? "Offline / Not Registered"
          : null,
      link: null,
    });
  }

  const workerStatuses = ["claimed", "completed", "validated"];
  events.push({
    id: "worker-worldid",
    icon: <ShieldCheck className="h-4 w-4" />,
    label: "Worker World ID",
    status: props.workerNullifier
      ? "success"
      : workerStatuses.includes(props.status)
        ? "pending"
        : "inactive",
    detail: props.workerNullifier ? truncate(props.workerNullifier) : null,
    link: null,
  });

  const isMockEscrow = props.escrowTxId?.startsWith("mock-");
  events.push({
    id: "escrow",
    icon: <Landmark className="h-4 w-4" />,
    label: "Hedera Escrow",
    status: props.escrowTxId ? "success" : "inactive",
    detail: props.escrowTxId
      ? isMockEscrow
        ? `${props.escrowTxId} (mock)`
        : truncate(props.escrowTxId, 10, 6)
      : null,
    link: props.escrowTxId && !isMockEscrow ? hashscanUrl(props.escrowTxId) : null,
  });

  const isMockPayment = props.paymentTxId?.startsWith("mock-");
  const paymentPending = props.status === "validated" && !props.paymentTxId;
  events.push({
    id: "payment",
    icon: <ArrowRightLeft className="h-4 w-4" />,
    label: "Payment Released",
    status: props.paymentTxId ? "success" : paymentPending ? "pending" : "inactive",
    detail: props.paymentTxId
      ? isMockPayment
        ? `${props.paymentTxId} (mock)`
        : truncate(props.paymentTxId, 10, 6)
      : null,
    link: props.paymentTxId && !isMockPayment ? hashscanUrl(props.paymentTxId) : null,
  });

  return events;
}

/**
 * Visual audit trail showing cryptographic events for a task lifecycle.
 * Displays World ID verifications, AgentBook lookups, and Hedera transactions
 * with expandable details and Hashscan links.
 */
export function AuditTrail(props: AuditTrailProps) {
  const [expanded, setExpanded] = useState(false);
  const events = buildEvents(props);

  const successCount = events.filter((e) => e.status === "success").length;
  const totalCount = events.length;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Audit Trail
          </span>
          <span className="text-xs text-zinc-500">
            {successCount}/{totalCount} verified
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {events.map((e) => (
              <span
                key={e.id}
                className={`h-2 w-2 rounded-full ${STATUS_STYLES[e.status].dot}`}
                title={e.label}
              />
            ))}
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-zinc-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-3 space-y-2">
          {events.map((event, i) => {
            const style = STATUS_STYLES[event.status];
            return (
              <div key={event.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center pt-0.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${style.dot} flex-shrink-0`} />
                  {i < events.length - 1 && (
                    <span className="w-px h-full min-h-[16px] bg-zinc-200 dark:bg-zinc-700" />
                  )}
                </div>

                <div className={`flex-1 rounded-md px-3 py-2 ${style.bg}`}>
                  <div className="flex items-center gap-2">
                    <span className={style.text}>{event.icon}</span>
                    <span className={`text-xs font-medium ${style.text}`}>
                      {event.label}
                    </span>
                    {event.status === "success" && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        Verified
                      </span>
                    )}
                    {event.status === "pending" && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        Pending
                      </span>
                    )}
                    {event.status === "warning" && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        Caution
                      </span>
                    )}
                  </div>
                  {event.detail && (
                    <div className="mt-1 flex items-center gap-1">
                      <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                        {event.detail}
                      </span>
                      {event.link && (
                        <a
                          href={event.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
