'use client';
import { useState, useEffect } from 'react';
import { Page } from '@/components/PageLayout';
import { IDKitRequestWidget, orbLegacy, type IDKitResult, type RpContext } from '@worldcoin/idkit';

interface WorkerStats {
  tasksCompleted: number;
  totalEarnedUsdc: number;
  reputationScore: number;
  badge: 'none' | 'verified_human';
}

export default function WorkerPage() {
  const [verified, setVerified] = useState(false);
  const [nullifier, setNullifier] = useState<string | null>(null);
  const [stats, setStats] = useState<WorkerStats>({ tasksCompleted: 0, totalEarnedUsdc: 0, reputationScore: 0, badge: 'none' });
  const [open, setOpen] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | undefined>(undefined);

  // Load stats when nullifier is known
  useEffect(() => {
    if (!nullifier) return;
    fetch(`/api/workers/stats?nullifier=${encodeURIComponent(nullifier)}`)
      .then((r) => r.json())
      .then((data) => setStats(data));
  }, [nullifier]);

  const openWidget = async () => {
    const rpRes = await fetch('/api/rp-signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'humanproof-register-worker' }),
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

  const handleVerify = async (result: IDKitResult) => {
    const res = await fetch('/api/workers/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proof: result, action: 'humanproof-register-worker' }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    if (data.nullifier) setNullifier(data.nullifier);
  };

  const onSuccess = (_result: IDKitResult) => {
    setVerified(true);
    setOpen(false);
  };

  const earnedDisplay = stats.totalEarnedUsdc > 0
    ? `${stats.totalEarnedUsdc} USDC`
    : '0 USDC';

  return (
    <>
      <Page.Header>
        <div className="px-4 py-3">
          <h1 className="font-bold text-lg">My Worker Profile</h1>
        </div>
      </Page.Header>
      <Page.Main className="flex flex-col gap-4 px-4 pb-20 pt-4">

        {rpContext && (
          <IDKitRequestWidget
            app_id={process.env.NEXT_PUBLIC_APP_ID as `app_${string}`}
            action="humanproof-register-worker"
            rp_context={rpContext}
            preset={orbLegacy({ signal: '' })}
            allow_legacy_proofs={true}
            open={open}
            onOpenChange={setOpen}
            handleVerify={handleVerify}
            onSuccess={onSuccess}
          />
        )}

        {/* Verification status */}
        {verified ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">✅</div>
            <div>
              <p className="font-bold text-green-800">Human Verified</p>
              <p className="text-xs text-green-600">Your World ID is confirmed. You can now claim tasks.</p>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-2xl">🌍</div>
              <div>
                <p className="font-bold text-yellow-800">Verification Required</p>
                <p className="text-xs text-yellow-700">Verify your humanity to start earning</p>
              </div>
            </div>
            <button
              onClick={openWidget}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm bg-blue-600 active:scale-[0.98] transition-all"
            >
              🌍 Verify with World ID
            </button>
          </div>
        )}

        {/* Badge */}
        {stats.badge === 'verified_human' && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-4 flex items-center gap-3 text-white">
            <div className="text-3xl">🏅</div>
            <div>
              <p className="font-bold text-sm">Verified Human Worker</p>
              <p className="text-xs opacity-80">Awarded for 3+ validated tasks — trusted by AI agents</p>
            </div>
          </div>
        )}

        {/* Reputation */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-3">
          <p className="font-bold text-sm">Reputation Score</p>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-black text-indigo-600">{stats.reputationScore}</div>
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.reputationScore}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {stats.reputationScore < 100
                  ? `${Math.ceil((100 - stats.reputationScore) / 10)} more tasks to reach 100`
                  : 'Maximum reputation reached!'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Tasks done', value: String(stats.tasksCompleted) },
            { label: 'Earned', value: earnedDisplay },
            { label: 'Badge', value: stats.badge === 'verified_human' ? '🏅' : '—' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-gray-100 rounded-2xl p-3 text-center">
              <p className="font-bold text-base">{stat.value}</p>
              <p className="text-xs text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="bg-indigo-50 rounded-2xl p-4">
          <p className="text-sm font-bold text-indigo-900 mb-2">How to earn on HumanProof</p>
          <ol className="text-xs text-indigo-800 flex flex-col gap-1.5 list-decimal list-inside">
            <li>Verify your humanity with World ID (once)</li>
            <li>Browse available tasks from humans and AI agents</li>
            <li>Claim a task that matches your skills</li>
            <li>Complete it and submit proof</li>
            <li>Get paid automatically when validated</li>
          </ol>
        </div>

      </Page.Main>
    </>
  );
}
