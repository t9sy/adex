'use client';

import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function EconomyPage() {
  const params = useParams();
  const guildId = params.id as string;
  const { data: items, refetch } = trpc.economy.getShopItems.useQuery({ guildId });
  const { data: leaderboard } = trpc.economy.getLeaderboard.useQuery({ guildId });
  const addItemMutation = trpc.economy.addShopItem.useMutation({ onSuccess: () => refetch() });
  const removeItemMutation = trpc.economy.removeShopItem.useMutation({ onSuccess: () => refetch() });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [roleId, setRoleId] = useState('');

  const handleAdd = () => {
    if (name && price) {
      addItemMutation.mutate({
        guildId,
        data: {
          name,
          description: description || undefined,
          price: parseInt(price),
          roleId: roleId || undefined,
        },
      });
      setName('');
      setDescription('');
      setPrice('');
      setRoleId('');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Economy</h1>

      <Card>
        <CardHeader>
          <CardTitle>Add Shop Item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 max-w-lg">
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" />
            </div>
            <div className="space-y-2">
              <Label>Price (coins)</Label>
              <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="100" type="number" />
            </div>
          </div>
          <div className="space-y-2 max-w-lg">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
          </div>
          <div className="space-y-2 max-w-lg">
            <Label>Role ID (optional, granted on purchase)</Label>
            <Input value={roleId} onChange={(e) => setRoleId(e.target.value)} placeholder="Role ID" />
          </div>
          <Button onClick={handleAdd} disabled={addItemMutation.isPending}>Add Item</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shop Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {items?.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <span className="font-medium">{item.name}</span>
                  <span className="ml-2 text-muted-foreground">{item.price} coins</span>
                  {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                </div>
                <Button variant="destructive" size="sm" onClick={() => removeItemMutation.mutate({ id: item.id })}>Remove</Button>
              </div>
            ))}
            {(!items || items.length === 0) && <p className="text-muted-foreground text-center py-4">No items in the shop.</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coin Leaderboard (Top 10)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {leaderboard?.map((user, i) => (
              <div key={user.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <span>#{i + 1} — {user.userId}</span>
                <span>{user.coins} coins</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
