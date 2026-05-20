'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Shield,
  Hand,
  Ticket,
  TrendingUp,
  Coins,
  Music,
  ScrollText,
  Settings,
  BarChart3,
  Tags,
} from 'lucide-react';

const menuItems = [
  { label: 'General', href: '', icon: Settings },
  { label: 'Moderation', href: '/moderation', icon: Shield },
  { label: 'Welcome', href: '/welcome', icon: Hand },
  { label: 'Tickets', href: '/tickets', icon: Ticket },
  { label: 'Leveling', href: '/leveling', icon: TrendingUp },
  { label: 'Economy', href: '/economy', icon: Coins },
  { label: 'Reaction Roles', href: '/reaction-roles', icon: Tags },
  { label: 'Music', href: '/music', icon: Music },
  { label: 'Logs', href: '/logs', icon: ScrollText },
  { label: 'Statistics', href: '/statistics', icon: BarChart3 },
];

interface SidebarProps {
  guildId: string;
  guildName?: string;
}

export function Sidebar({ guildId, guildName }: SidebarProps) {
  const pathname = usePathname();
  const basePath = `/dashboard/servers/${guildId}`;

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold truncate">{guildName ?? 'Server'}</h2>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {menuItems.map((item) => {
          const href = `${basePath}${item.href}`;
          const isActive = pathname === href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
