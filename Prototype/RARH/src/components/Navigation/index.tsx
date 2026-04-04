'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/tasks',  label: 'Tasks',   emoji: '📋' },
  { href: '/worker', label: 'Profile',  emoji: '👤' },
];

export const Navigation = () => {
  const pathname = usePathname();

  return (
    <nav className="flex border-t border-gray-100 bg-white">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-xs font-medium transition-colors ${
              active ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <span className="text-xl">{tab.emoji}</span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
