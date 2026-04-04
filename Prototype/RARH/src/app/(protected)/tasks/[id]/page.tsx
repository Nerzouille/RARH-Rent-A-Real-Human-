'use client';
import { use, useState, useEffect } from 'react';
import { Page } from '@/components/PageLayout';
import { categoryConfig, clientTypeConfig, formatDeadline, type Task } from '@/types';
import { IDKitRequestWidget, orbLegacy, type IDKitRequestWidgetProps, type IDKitResult, type RpContext } from '@worldcoin/idkit';
import Link from 'next/link';

interface Props {
  params: Promise<{ id: string }>;
}

export default function TaskDetailPage({ params }: Props) {
  const { id } = use(params);

  const [task, setTask] = useState<Task | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [status, setStatus] = useState<Task['status']>('open');
  const [open, setOpen] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | undefined>(undefined);
  const [proofText, setProofText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/tasks/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((t) => { if (t) { setTask(t); setStatus(t.status); } });
  }, [id]);

  if (notFound) return (
    <div className="p-8 text-center">
      <p className="text-gray-500">Task not found.</p>
      <Link href="/tasks" className="text-blue-600 text-sm mt-2 inline-block">← Back to tasks</Link>
    </div>
  );

  if (!task) return (
    <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
  );

  const cat = categoryConfig[task.category];
  const client = clientTypeConfig[task.clientType];

  // --- Claim ---
  const openClaimWidget = async () => {
    const rpRes = await fetch('/api/rp-signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'humanproof-claim-task' }),
    });
    if (!rpRes.ok) return;
    const rpSig = await rpRes.json();
    setRpContext({
      rp_id: rpSig.rp_id,
      nonce: rpSig.nonce,
      created_at: rpSig.created_at,
      expires_at: rpSig.expires_at,
      signature: rpSig.sig,
    });
    setOpen(true);
  };

  const handleClaim: IDKitRequestWidgetProps['handleVerify'] = async (result) => {
    const res = await fetch('/api/tasks/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: task.id, proof: result }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  };

  const onClaimSuccess = (_result: IDKitResult) => {
    setStatus('assigned');
    setOpen(false);
  };

  // --- Submit ---
  const handleSubmit = async () => {
    if (!proofText.trim()) return;
    setSubmitting(true);
    const res = await fetch('/api/tasks/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: task.id, proofText }),
    });
    const data = await res.json();
    if (data.success) setStatus('completed');
    setSubmitting(false);
  };

  return (
    <>
      <Page.Header>
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/tasks" className="text-sm text-blue-600 font-medium">← Back</Link>
          <h1 className="font-bold text-base truncate">{task.title}</h1>
        </div>
      </Page.Header>

      <Page.Main className="flex flex-col gap-4 px-4 pt-4 pb-24">

        {rpContext && (
          <IDKitRequestWidget
            app_id={process.env.NEXT_PUBLIC_APP_ID as `app_${string}`}
            action="humanproof-claim-task"
            rp_context={rpContext}
            preset={orbLegacy({ signal: '' })}
            allow_legacy_proofs={true}
            open={open}
            onOpenChange={setOpen}
            handleVerify={handleClaim}
            onSuccess={onClaimSuccess}
          />
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${client.color}`}>
            {client.emoji} {task.clientName ?? client.label}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${cat.color}`}>
            {cat.emoji} {cat.label}
          </span>
          {task.tags.map((tag) => (
            <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              #{tag}
            </span>
          ))}
        </div>

        {/* Budget & deadline */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-green-600">{task.budget}</p>
            <p className="text-xs text-green-700">Secured in escrow</p>
          </div>
          <div className="bg-orange-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-orange-600">{formatDeadline(task.deadline)}</p>
            <p className="text-xs text-orange-700">to complete</p>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Description</p>
          <p className="text-sm text-gray-700 leading-relaxed">{task.description}</p>
        </div>

        {/* Private files — visible only after claim */}
        {status !== 'open' && task.privateFiles && task.privateFiles.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-purple-800 uppercase mb-2">🔐 Private resources (worker only)</p>
            <div className="flex flex-col gap-2">
              {task.privateFiles.map((file, i) => (
                <a
                  key={i}
                  href={file.split(' — ')[0]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-700 underline break-all"
                >
                  {file}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="bg-blue-50 rounded-2xl p-4">
          <p className="text-sm font-bold text-blue-900 mb-1">🔒 Payment secured in escrow</p>
          <p className="text-xs text-blue-700">
            {task.budget} is locked in a smart contract. You get paid automatically once the client validates your work.
          </p>
        </div>

        {/* Agent transparency */}
        {task.clientType === 'ai_agent' && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex flex-col gap-1">
            <p className="text-xs font-bold text-indigo-800 uppercase">🤖 Agent Identity</p>
            <p className="text-xs text-indigo-700">
              <span className="font-semibold">Wallet:</span> {task.client.slice(0, 10)}...
            </p>
            {task.agentHumanId && (
              <p className="text-xs text-indigo-700">
                <span className="font-semibold">Backed by human:</span>{' '}
                <span className="font-mono bg-indigo-100 px-1 rounded">{task.agentHumanId.slice(0, 20)}...</span>
              </p>
            )}
            <p className="text-xs text-indigo-500 mt-1">
              ✓ Verified via AgentKit — this agent is controlled by a real human
            </p>
          </div>
        )}

        {/* Pipeline */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Pipeline</p>
          <div className="flex flex-col gap-2">
            {[
              { label: '1. Task posted by agent',      done: true },
              { label: '2. Claimed by verified human', done: status !== 'open' },
              { label: '3. Work submitted',            done: ['completed','validated'].includes(status) },
              { label: '4. Agent validates & pays',    done: status === 'validated' },
            ].map((step) => (
              <div key={step.label} className="flex items-center gap-2">
                <span className={step.done ? 'text-green-500' : 'text-gray-300'}>{step.done ? '✅' : '○'}</span>
                <span className={`text-xs ${step.done ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step 1 — Claim */}
        {status === 'open' && (
          <button onClick={openClaimWidget} className="w-full py-4 rounded-2xl font-bold text-white text-sm bg-blue-600 active:scale-[0.98] transition-all">
            🌍 Claim Task with World ID
          </button>
        )}

        {/* Step 2 — Submit proof */}
        {status === 'assigned' && (
          <div className="flex flex-col gap-3">
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
              <p className="font-bold text-yellow-800">✅ Task claimed — submit your work</p>
              <p className="text-xs text-yellow-700 mt-1">Describe what you did or paste a link to your deliverable.</p>
            </div>
            <textarea
              value={proofText}
              onChange={(e) => setProofText(e.target.value)}
              placeholder="Describe your work or paste a link..."
              className="w-full border border-gray-200 rounded-2xl p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button
              onClick={handleSubmit}
              disabled={submitting || !proofText.trim()}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm bg-indigo-600 disabled:opacity-50 active:scale-[0.98] transition-all"
            >
              {submitting ? '⏳ Submitting...' : '📤 Submit Work'}
            </button>
          </div>
        )}

        {/* Step 3 — Waiting for validation */}
        {status === 'completed' && (
          <div className="flex flex-col gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
              <p className="font-bold text-blue-800">📤 Work submitted</p>
              <p className="text-xs text-blue-700 mt-1">Waiting for the client to validate and release payment.</p>
            </div>
            <button
              onClick={async () => {
                const res = await fetch('/api/agent-demo/validate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ taskId: task.id }),
                });
                const data = await res.json();
                if (data.success) setStatus('validated');
                else alert(data.error);
              }}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm bg-green-600 active:scale-[0.98] transition-all"
            >
              🤖 Validate as Agent & Release Payment
            </button>
          </div>
        )}

        {/* Step 4 — Paid */}
        {status === 'validated' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <p className="font-bold text-green-800 text-lg">🎉 Task completed & paid!</p>
            <p className="text-xs text-green-700 mt-1">{task.budget} released to your wallet.</p>
          </div>
        )}

      </Page.Main>
    </>
  );
}
