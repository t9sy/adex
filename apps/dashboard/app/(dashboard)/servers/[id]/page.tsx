'use client';

import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

export default function ServerGeneralPage() {
  const params = useParams();
  const guildId = params.id as string;
  const { data: guild } = trpc.guild.get.useQuery({ guildId });
  const updateMutation = trpc.guild.updateGeneral.useMutation();

  const [prefix, setPrefix] = useState('!');
  const [language, setLanguage] = useState<'en' | 'de'>('en');

  useEffect(() => {
    if (guild) {
      setPrefix(guild.prefix);
      setLanguage(guild.language as 'en' | 'de');
    }
  }, [guild]);

  const handleSave = () => {
    updateMutation.mutate({ guildId, data: { prefix, language } });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">General Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Server Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prefix">Command Prefix (Legacy)</Label>
            <Input
              id="prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              maxLength={5}
              className="max-w-xs"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Bot Language</Label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'de')}
              className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
          </div>

          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
