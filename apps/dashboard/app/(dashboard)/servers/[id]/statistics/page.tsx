'use client';

import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function StatisticsPage() {
  const params = useParams();
  const guildId = params.id as string;

  const { data: overview } = trpc.stats.getOverview.useQuery({ guildId });
  const { data: modStats } = trpc.stats.getModerationStats.useQuery({ guildId });
  const { data: levelLeaderboard } = trpc.stats.getLevelingLeaderboard.useQuery({ guildId });
  const { data: economyLeaderboard } = trpc.stats.getEconomyLeaderboard.useQuery({ guildId });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Statistics</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{overview?.totalUsers ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Moderation Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{overview?.totalModerationActions ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{overview?.totalTickets ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Warns (This Week)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{overview?.recentWarns ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Moderation Actions Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="font-medium">Today</p>
              {modStats?.today.map((s) => (
                <div key={s.action} className="flex justify-between text-sm">
                  <Badge variant="outline">{s.action}</Badge>
                  <span>{s._count}</span>
                </div>
              ))}
              {(!modStats?.today || modStats.today.length === 0) && <p className="text-sm text-muted-foreground">No actions</p>}
            </div>
            <div className="space-y-2">
              <p className="font-medium">This Week</p>
              {modStats?.week.map((s) => (
                <div key={s.action} className="flex justify-between text-sm">
                  <Badge variant="outline">{s.action}</Badge>
                  <span>{s._count}</span>
                </div>
              ))}
              {(!modStats?.week || modStats.week.length === 0) && <p className="text-sm text-muted-foreground">No actions</p>}
            </div>
            <div className="space-y-2">
              <p className="font-medium">This Month</p>
              {modStats?.month.map((s) => (
                <div key={s.action} className="flex justify-between text-sm">
                  <Badge variant="outline">{s.action}</Badge>
                  <span>{s._count}</span>
                </div>
              ))}
              {(!modStats?.month || modStats.month.length === 0) && <p className="text-sm text-muted-foreground">No actions</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Level Leaderboard (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {levelLeaderboard?.map((user, i) => (
                <div key={user.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <span>#{i + 1} — {user.userId}</span>
                  <span>Level {user.level} ({user.xp} XP)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Economy Leaderboard (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {economyLeaderboard?.map((user, i) => (
                <div key={user.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <span>#{i + 1} — {user.userId}</span>
                  <span>{user.coins} coins</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
