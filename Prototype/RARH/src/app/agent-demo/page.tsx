'use client';
import { useState } from 'react';
import Link from 'next/link';

type StepStatus = 'idle' | 'running' | 'done' | 'warning';

interface Step {
  id: number;
  label: string;
  status: StepStatus;
}

const INITIAL_STEPS: Step[] = [
  { id: 1, label: 'Initialize agent wallet', status: 'idle' },
  { id: 2, label: 'Sign AgentKit authentication header', status: 'idle' },
  { id: 3, label: 'Verify against AgentBook on World Chain', status: 'idle' },
  { id: 4, label: 'Post task to HumanProof', status: 'idle' },
];

const STATUS_ICON: Record<StepStatus, string> = {
  idle: '○', running: '⏳', done: '✅', warning: '⚠️',
};
const STATUS_COLOR: Record<StepStatus, string> = {
  idle: 'text-gray-400', running: 'text-blue-500', done: 'text-green-600', warning: 'text-yellow-600',
};

export default function AgentDemoPage() {
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [task, setTask] = useState<{ id: string; title: string } | null>(null);

  const updateStep = (id: number, label: string, status: StepStatus) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, label, status } : s)));
  };

  const runDemo = async () => {
    setRunning(true);
    setDone(false);
    setTask(null);
    setSteps(INITIAL_STEPS);

    const res = await fetch('/api/agent-demo', { method: 'POST' });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done: streamDone, value } = await reader.read();
      if (streamDone) break;
      for (const line of decoder.decode(value).split('\n')) {
        if (!line.startsWith('data: ')) continue;
        try {
          const event = JSON.parse(line.slice(6));
          if (event.done) { setDone(true); setRunning(false); }
          if (event.step) updateStep(event.step, event.label, event.status);
          if (event.task) setTask(event.task);
        } catch { /* ignore */ }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 max-w-lg mx-auto">
      <div className="mb-6">
        <Link href="/tasks" className="text-sm text-blue-600">← Back to tasks</Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🤖</span>
          <h1 className="font-black text-lg">AgentKit Demo</h1>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          An AI agent — backed by a real World ID human — posts a task on HumanProof.
          Once posted, you can claim it manually as a worker.
        </p>
      </div>

      <div className="bg-indigo-50 rounded-2xl p-4 mb-4 text-xs text-indigo-800">
        <p className="font-bold mb-1">Zero-trust: both sides verified</p>
        <div className="flex flex-col gap-1 mt-1">
          <div>🤖 <strong>Client (agent)</strong> — verified via AgentBook + World ID</div>
          <div>👤 <strong>Worker (you)</strong> — verified via World ID Orb scan</div>
          <div>🔒 <strong>Payment</strong> — locked in escrow until validation</div>
        </div>
      </div>

      {/* Steps */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
        <p className="text-xs font-bold text-gray-400 uppercase mb-3">Agent execution</p>
        <div className="flex flex-col gap-3">
          {steps.map((step) => (
            <div key={step.id} className="flex items-start gap-3">
              <span className={`text-sm mt-0.5 w-5 shrink-0 ${STATUS_COLOR[step.status]}`}>
                {STATUS_ICON[step.status]}
              </span>
              <p className={`text-sm font-medium ${STATUS_COLOR[step.status]}`}>{step.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Task posted */}
      {done && task && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4">
          <p className="font-bold text-green-800 mb-1">✅ Task posted by AI agent!</p>
          <p className="text-xs text-green-700 mb-3">"{task.title}"</p>
          <Link
            href={`/tasks/${task.id}`}
            className="inline-block bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-xl"
          >
            Claim this task as a worker →
          </Link>
        </div>
      )}

      <button
        onClick={runDemo}
        disabled={running}
        className={`w-full py-4 rounded-2xl font-bold text-white text-sm transition-all ${
          running ? 'bg-blue-400' : 'bg-blue-600 active:scale-[0.98]'
        }`}
      >
        {running ? '⏳ Agent running...' : done ? '🔄 Post another task' : '▶ Run agent — post a task'}
      </button>
    </div>
  );
}
