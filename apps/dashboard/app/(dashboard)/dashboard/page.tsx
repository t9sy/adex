'use client';

import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: guilds, isLoading } = trpc.guild.list.useQuery();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading your servers...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Your Servers</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {guilds?.map((guild) => (
          <Link key={guild.id} href={`/dashboard/servers/${guild.id}`}>
            <Card className="cursor-pointer transition-colors hover:bg-accent">
              <CardHeader className="flex flex-row items-center gap-4">
                {guild.icon ? (
                  <Image
                    src={guild.icon}
                    alt={guild.name}
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
                    {guild.name.charAt(0)}
                  </div>
                )}
                <CardTitle className="text-lg">{guild.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Click to manage settings</p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {guilds?.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center py-12">
            No servers found. Make sure you have admin permissions in a server with the bot.
          </p>
        )}
      </div>
    </div>
  );
}
