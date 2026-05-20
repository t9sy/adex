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

export default function ModerationPage() {
  const params = useParams();
  const guildId = params.id as string;
  const { data: settings } = trpc.moderation.getSettings.useQuery({ guildId });
  const { data: logs } = trpc.moderation.getLogs.useQuery({ guildId, limit: 20 });
  const updateMutation = trpc.moderation.updateSettings.useMutation();

  const [enabled, setEnabled] = useState(false);
  const [spamDetection, setSpamDetection] = useState(false);
  const [logChannelId, setLogChannelId] = useState('');
  const [warnThreshold, setWarnThreshold] = useState(3);
  const [warnAction, setWarnAction] = useState<'mute' | 'kick' | 'ban'>('mute');
  const [bannedWords, setBannedWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState('');

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setSpamDetection(settings.spamDetection);
      setLogChannelId(settings.logChannelId ?? '');
      setWarnThreshold(settings.warnThreshold);
      setWarnAction(settings.warnAction);
      setBannedWords(settings.bannedWords);
    }
  }, [settings]);

  const handleSave = () => {
    updateMutation.mutate({
      guildId,
      data: { enabled, spamDetection, logChannelId: logChannelId || null, warnThreshold, warnAction, bannedWords },
    });
  };

  const addWord = () => {
    if (newWord && !bannedWords.includes(newWord)) {
      setBannedWords([...bannedWords, newWord]);
      setNewWord('');
    }
  };

  const removeWord = (word: string) => {
    setBannedWords(bannedWords.filter((w) => w !== word));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Moderation</h1>

      <Card>
        <CardHeader>
          <CardTitle>Auto-Moderation</CardTitle>
          <CardDescription>Configure automatic moderation features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="enabled">Enable Auto-Moderation</Label>
            <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="spam">Spam Detection</Label>
            <Switch id="spam" checked={spamDetection} onCheckedChange={setSpamDetection} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logChannel">Log Channel ID</Label>
            <Input
              id="logChannel"
              value={logChannelId}
              onChange={(e) => setLogChannelId(e.target.value)}
              placeholder="Channel ID for moderation logs"
              className="max-w-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="threshold">Warn Threshold</Label>
              <Input
                id="threshold"
                type="number"
                min={1}
                max={10}
                value={warnThreshold}
                onChange={(e) => setWarnThreshold(parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="action">Warn Escalation Action</Label>
              <select
                id="action"
                value={warnAction}
                onChange={(e) => setWarnAction(e.target.value as 'mute' | 'kick' | 'ban')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="mute">Mute</option>
                <option value="kick">Kick</option>
                <option value="ban">Ban</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Word Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 max-w-md">
            <Input
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="Add banned word"
              onKeyDown={(e) => e.key === 'Enter' && addWord()}
            />
            <Button onClick={addWord} variant="secondary">Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {bannedWords.map((word) => (
              <Badge key={word} variant="secondary" className="cursor-pointer" onClick={() => removeWord(word)}>
                {word} x
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={updateMutation.isPending}>
        {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Recent Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {logs?.map((log) => (
              <div key={log.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <Badge variant={log.action === 'ban' ? 'destructive' : 'secondary'}>{log.action}</Badge>
                  <span className="ml-2">User: {log.userId}</span>
                </div>
                <span className="text-muted-foreground">{new Date(log.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
            {(!logs || logs.length === 0) && (
              <p className="text-muted-foreground text-center py-4">No moderation actions yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
