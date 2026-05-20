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

export default function TicketsPage() {
  const params = useParams();
  const guildId = params.id as string;
  const { data: settings } = trpc.ticket.getSettings.useQuery({ guildId });
  const { data: tickets } = trpc.ticket.list.useQuery({ guildId });
  const updateMutation = trpc.ticket.updateSettings.useMutation();

  const [enabled, setEnabled] = useState(false);
  const [supportRoleId, setSupportRoleId] = useState('');
  const [logChannelId, setLogChannelId] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setSupportRoleId(settings.supportRoleId ?? '');
      setLogChannelId(settings.logChannelId ?? '');
      setCategories(settings.categories);
    }
  }, [settings]);

  const handleSave = () => {
    updateMutation.mutate({
      guildId,
      data: {
        enabled,
        supportRoleId: supportRoleId || null,
        logChannelId: logChannelId || null,
        categories,
      },
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Ticket System</h1>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="enabled">Enable Ticket System</Label>
            <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supportRole">Support Role ID</Label>
            <Input id="supportRole" value={supportRoleId} onChange={(e) => setSupportRoleId(e.target.value)} className="max-w-md" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logChannel">Log Channel ID</Label>
            <Input id="logChannel" value={logChannelId} onChange={(e) => setLogChannelId(e.target.value)} className="max-w-md" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 max-w-md">
            <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Category name" onKeyDown={(e) => e.key === 'Enter' && newCategory && (setCategories([...categories, newCategory]), setNewCategory(''))} />
            <Button onClick={() => { if (newCategory) { setCategories([...categories, newCategory]); setNewCategory(''); }}} variant="secondary">Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Badge key={cat} variant="secondary" className="cursor-pointer" onClick={() => setCategories(categories.filter((c) => c !== cat))}>{cat} x</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={updateMutation.isPending}>
        {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Recent Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {tickets?.map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'}>{ticket.status}</Badge>
                  <span className="ml-2">{ticket.subject ?? 'No subject'}</span>
                </div>
                <span className="text-muted-foreground">{new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
            {(!tickets || tickets.length === 0) && <p className="text-muted-foreground text-center py-4">No tickets yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
