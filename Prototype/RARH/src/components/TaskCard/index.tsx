'use client';
import Link from 'next/link';
import type { Task } from '@/types';
import { categoryConfig, clientTypeConfig, formatDeadline } from '@/types';

interface TaskCardProps {
  task: Task;
}

const statusConfig = {
  open:      { label: 'Open',      color: 'bg-green-100 text-green-700' },
  assigned:  { label: 'Assigned',  color: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700' },
  validated: { label: 'Validated', color: 'bg-gray-100 text-gray-500' },
  disputed:  { label: 'Disputed',  color: 'bg-red-100 text-red-700' },
};

export function TaskCard({ task }: TaskCardProps) {
  const cat = categoryConfig[task.category];
  const client = clientTypeConfig[task.clientType];
  const status = statusConfig[task.status];

  return (
    <Link href={`/tasks/${task.id}`}>
      <div className="rounded-2xl border border-gray-100 bg-white p-4 flex flex-col gap-3 shadow-sm active:scale-[0.98] transition-transform">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-bold text-sm leading-tight flex-1">{task.title}</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${status.color}`}>
            {status.label}
          </span>
        </div>

        {/* Description */}
        <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">
          {task.description}
        </p>

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-50">
          <div className="flex items-center gap-2">
            {/* Client type */}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${client.color}`}>
              {client.emoji} {task.clientName ?? client.label}
            </span>
            {/* Category */}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.color}`}>
              {cat.emoji} {cat.label}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400 text-xs">{formatDeadline(task.deadline)}</span>
            <span className="font-bold text-green-600">{task.budget}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
