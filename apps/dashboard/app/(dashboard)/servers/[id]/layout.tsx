'use client';

import { useParams } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';

export default function ServerLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const guildId = params.id as string;

  return (
    <div className="flex h-screen">
      <Sidebar guildId={guildId} />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
