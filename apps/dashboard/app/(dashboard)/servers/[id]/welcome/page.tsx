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

export default function WelcomePage() {
  const params = useParams();
  const guildId = params.id as string;
  const { data: settings } = trpc.welcome.getSettings.useQuery({ guildId });
  const updateMutation = trpc.welcome.updateSettings.useMutation();

  const [enabled, setEnabled] = useState(false);
  const [channelId, setChannelId] = useState('');
  const [message, setMessage] = useState('');
  const [imageEnabled, setImageEnabled] = useState(false);
  const [autoRoles, setAutoRoles] = useState<string[]>([]);
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setChannelId(settings.channelId ?? '');
      setMessage(settings.message);
      setImageEnabled(settings.imageEnabled);
      setAutoRoles(settings.autoRoles);
    }
  }, [settings]);

  const handleSave = () => {
    updateMutation.mutate({
      guildId,
      data: { enabled, channelId: channelId || null, message, imageEnabled, autoRoles },
    });
  };

  const addRole = () => {
    if (newRole && !autoRoles.includes(newRole)) {
      setAutoRoles([...autoRoles, newRole]);
      setNewRole('');
    }
  };

  const previewMessage = message
    .replace('{user}', '@NewUser')
    .replace('{server}', 'My Server')
    .replace('{membercount}', '42');

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Welcome System</h1>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Set up welcome messages for new members</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="enabled">Enable Welcome System</Label>
            <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel">Welcome Channel ID</Label>
            <Input
              id="channel"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              placeholder="Channel ID"
              className="max-w-md"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Welcome Message</Label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Welcome {user} to {server}!"
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground">
              Variables: {'{user}'}, {'{server}'}, {'{membercount}'}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="rounded-md border bg-muted p-4 text-sm">{previewMessage}</div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="image">Welcome Image</Label>
            <Switch id="image" checked={imageEnabled} onCheckedChange={setImageEnabled} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auto Roles</CardTitle>
          <CardDescription>Roles assigned automatically when a member joins</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 max-w-md">
            <Input
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              placeholder="Role ID"
              onKeyDown={(e) => e.key === 'Enter' && addRole()}
            />
            <Button onClick={addRole} variant="secondary">Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {autoRoles.map((role) => (
              <Badge
                key={role}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => setAutoRoles(autoRoles.filter((r) => r !== role))}
              >
                {role} x
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={updateMutation.isPending}>
        {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
}
