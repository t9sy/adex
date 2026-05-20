'use client';

import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function ReactionRolesPage() {
  const params = useParams();
  const guildId = params.id as string;
  const { data: messages, refetch } = trpc.reactionRoles.list.useQuery({ guildId });
  const deleteMutation = trpc.reactionRoles.delete.useMutation({ onSuccess: () => refetch() });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reaction Roles</h1>

      <Card>
        <CardHeader>
          <CardTitle>Reaction Role Messages</CardTitle>
          <CardDescription>
            Manage reaction role embeds. Create new ones through the bot or API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {messages?.map((msg) => (
              <div key={msg.id} className="rounded-md border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{msg.title ?? 'Untitled'}</span>
                    <Badge variant="secondary" className="ml-2">{msg.mode}</Badge>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate({ id: msg.id })}>Delete</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {msg.roles.map((role) => (
                    <Badge key={role.id} variant="outline">{role.emoji} → {role.roleId}</Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Message ID: {msg.messageId} | Channel: {msg.channelId}</p>
              </div>
            ))}
            {(!messages || messages.length === 0) && (
              <p className="text-muted-foreground text-center py-4">No reaction role messages configured.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
