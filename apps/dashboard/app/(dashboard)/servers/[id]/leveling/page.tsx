'use client';

import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';

export default function LevelingPage() {
  const params = useParams();
  const guildId = params.id as string;
  const { data: settings } = trpc.leveling.getSettings.useQuery({ guildId });
  const { data: levelRoles } = trpc.leveling.getLevelRoles.useQuery({ guildId });
  const { data: leaderboard } = trpc.leveling.getLeaderboard.useQuery({ guildId });
  const updateMutation = trpc.leveling.updateSettings.useMutation();
  const addRoleMutation = trpc.leveling.addLevelRole.useMutation();
  const removeRoleMutation = trpc.leveling.removeLevelRole.useMutation();

  const [enabled, setEnabled] = useState(false);
  const [xpRate, setXpRate] = useState(1);
  const [levelUpDm, setLevelUpDm] = useState(false);
  const [levelUpChannel, setLevelUpChannel] = useState('');
  const [newLevel, setNewLevel] = useState('');
  const [newRoleId, setNewRoleId] = useState('');

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setXpRate(settings.xpRate);
      setLevelUpDm(settings.levelUpDm);
      setLevelUpChannel(settings.levelUpChannel ?? '');
    }
  }, [settings]);

  const handleSave = () => {
    updateMutation.mutate({
      guildId,
      data: { enabled, xpRate, levelUpDm, levelUpChannel: levelUpChannel || null },
    });
  };

  const handleAddRole = () => {
    const level = parseInt(newLevel);
    if (level && newRoleId) {
      addRoleMutation.mutate({ guildId, data: { level, roleId: newRoleId } });
      setNewLevel('');
      setNewRoleId('');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Leveling System</h1>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="enabled">Enable Leveling</Label>
            <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="xpRate">XP Rate Multiplier: {xpRate}x</Label>
            <input
              type="range"
              id="xpRate"
              min="0.1"
              max="10"
              step="0.1"
              value={xpRate}
              onChange={(e) => setXpRate(parseFloat(e.target.value))}
              className="w-full max-w-md"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="dm">Level Up DM</Label>
            <Switch id="dm" checked={levelUpDm} onCheckedChange={setLevelUpDm} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel">Level Up Channel ID</Label>
            <Input id="channel" value={levelUpChannel} onChange={(e) => setLevelUpChannel(e.target.value)} className="max-w-md" />
          </div>

          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Level Roles</CardTitle>
          <CardDescription>Assign roles automatically at certain levels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 max-w-md">
            <Input value={newLevel} onChange={(e) => setNewLevel(e.target.value)} placeholder="Level" type="number" className="w-24" />
            <Input value={newRoleId} onChange={(e) => setNewRoleId(e.target.value)} placeholder="Role ID" />
            <Button onClick={handleAddRole} variant="secondary">Add</Button>
          </div>
          <div className="space-y-2">
            {levelRoles?.map((lr) => (
              <div key={lr.id} className="flex items-center justify-between rounded-md border p-3">
                <span>Level {lr.level} → Role {lr.roleId}</span>
                <Button variant="destructive" size="sm" onClick={() => removeRoleMutation.mutate({ guildId, level: lr.level })}>Remove</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leaderboard (Top 10)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {leaderboard?.map((user, i) => (
              <div key={user.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <span>#{i + 1} — {user.userId}</span>
                <span>Level {user.level} ({user.xp} XP)</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
