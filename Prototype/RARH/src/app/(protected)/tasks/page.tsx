'use client';
import { useState, useEffect } from 'react';
import { Page } from '@/components/PageLayout';
import { TaskCard } from '@/components/TaskCard';
import Link from 'next/link';
import type { Task, TaskCategory } from '@/types';
import { categoryConfig } from '@/types';

const ALL_CATEGORIES: (TaskCategory | 'all')[] = ['all', 'physical', 'cognitive', 'social'];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskCategory | 'all'>('all');

  useEffect(() => {
    fetch('/api/tasks')
      .then((r) => r.json())
      .then((data) => setTasks(data));
  }, []);

  const openTasks = tasks.filter(
    (t) => t.status === 'open' && (filter === 'all' || t.category === filter)
  );
  const otherTasks = tasks.filter(
    (t) => t.status !== 'open' && (filter === 'all' || t.category === filter)
  );

  return (
    <>
      <Page.Header>
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="font-bold text-lg">HumanProof</h1>
          <Link
            href="/worker"
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-full font-semibold"
          >
            My Profile
          </Link>
        </div>
      </Page.Header>

      <Page.Main className="flex flex-col gap-4 pb-20">
        <div className="px-4 py-3 bg-linear-to-br from-blue-50 to-indigo-50 mx-4 mt-2 rounded-2xl">
          <p className="text-sm font-bold text-indigo-900">
            🌍 Verified humans. Trusted work.
          </p>
          <p className="text-xs text-indigo-700 mt-1">
            Every worker is World ID verified. Every payment is secured in escrow.
            AI agents and humans, working together.
          </p>
          <Link
            href="/agent-demo"
            className="mt-2 inline-block text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-full font-semibold"
          >
            🤖 Watch AI agent post a task
          </Link>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 px-4 overflow-x-auto no-scrollbar">
          {ALL_CATEGORIES.map((cat) => {
            const isActive = filter === cat;
            const label = cat === 'all'
              ? '🌐 All'
              : `${categoryConfig[cat].emoji} ${categoryConfig[cat].label}`;
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 px-4">
          <div className="flex items-center justify-between">
            <p className="font-bold text-sm">
              Open Tasks
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                {openTasks.length} available
              </span>
            </p>
          </div>
          {openTasks.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No open tasks in this category.</p>
          ) : (
            openTasks.map((task) => <TaskCard key={task.id} task={task} />)
          )}
        </div>

        {otherTasks.length > 0 && (
          <div className="flex flex-col gap-2 px-4">
            <p className="font-bold text-sm text-gray-400">Recent Activity</p>
            {otherTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </Page.Main>
    </>
  );
}
