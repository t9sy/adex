'use client';

import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

export default function MusicPage() {
  const params = useParams();
  const guildId = params.id as string;
  const { data: settings } = trpc.music.getSettings.useQuery({ guildId });
  const updateMutation = trpc.music.updateSettings.useMutation();

  const [defaultVolume, setDefaultVolume] = useState(50);
  const [djRoleId, setDjRoleId] = useState('');

  useEffect(() => {
    if (settings) {
      setDefaultVolume(settings.defaultVolume);
      setDjRoleId(settings.djRoleId ?? '');
    }
  }, [settings]);

  const handleSave = () => {
    updateMutation.mutate({
      guildId,
      data: { defaultVolume, djRoleId: djRoleId || null },
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Music Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="volume">Default Volume: {defaultVolume}%</Label>
            <input
              type="range"
              id="volume"
              min="0"
              max="100"
              value={defaultVolume}
              onChange={(e) => setDefaultVolume(parseInt(e.target.value))}
              className="w-full max-w-md"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="djRole">DJ Role ID</Label>
            <Input id="djRole" value={djRoleId} onChange={(e) => setDjRoleId(e.target.value)} placeholder="Only this role can control music" className="max-w-md" />
          </div>

          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
