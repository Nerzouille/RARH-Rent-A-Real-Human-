'use client';
import type { ReactNode } from 'react';

interface ClientProvidersProps {
  children: ReactNode;
  session: unknown;
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  return <>{children}</>;
}
