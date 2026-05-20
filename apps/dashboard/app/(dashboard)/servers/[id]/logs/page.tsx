'use client';

import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import type { LogCategory } from '@discord-bot/shared';

const LOG_CATEGORIES: { key: LogCategory; label: string }[] = [
  { key: 'message_edit', label: 'Message Edit' },
  { key: 'message_delete', label: 'Message Delete' },
  { key: 'member_join', label: 'Member Join' },
  { key: 'member_leave', label: 'Member Leave' },
  { key: 'voice_join', label: 'Voice Join' },
  { key: 'voice_leave', label: 'Voice Leave' },
  { key: 'ban', label: 'Ban' },
  { key: 'kick', label: 'Kick' },
  { key: 'mute', label: 'Mute' },
  { key: 'channel_update', label: 'Channel Update' },
  { key: 'role_update', label: 'Role Update' },
];

export default function LogsPage() {
  const params = useParams();
  const guildId = params.id as string;
  const { data: settings } = trpc.logs.getSettings.useQuery({ guildId });
  const updateMutation = trpc.logs.updateSettings.useMutation();

  const [channels, setChannels] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings) {
      const mapped: Record<string, string> = {};
      for (const cat of LOG_CATEGORIES) {
        mapped[cat.key] = (settings as Record<string, string | null>)[cat.key] ?? '';
      }
      setChannels(mapped);
    }
  }, [settings]);

  const handleSave = () => {
    const data: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(channels)) {
      data[key] = value || null;
    }
    updateMutation.mutate({ guildId, data });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Log Channels</h1>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Set a channel ID for each log category</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {LOG_CATEGORIES.map((cat) => (
            <div key={cat.key} className="flex items-center gap-4 max-w-lg">
              <Label className="w-40 text-sm">{cat.label}</Label>
              <Input
                value={channels[cat.key] ?? ''}
                onChange={(e) => setChannels({ ...channels, [cat.key]: e.target.value })}
                placeholder="Channel ID"
              />
            </div>
          ))}

          <Button onClick={handleSave} disabled={updateMutation.isPending} className="mt-4">
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
