import { Worker } from 'bullmq';
import { type Client } from 'discord.js';
import { Redis } from 'ioredis';
import { endGiveaway } from '../commands/giveaway/giveaway.js';

/** Starts the giveaway worker that ends giveaways when their timer expires. */
export function startGiveawayWorker(client: Client): Worker {
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker(
    'giveaways',
    async (job) => {
      const { giveawayId } = job.data as { giveawayId: string };
      const guildId = job.data.guildId as string | undefined;

      if (guildId) {
        await endGiveaway(giveawayId, guildId, client);
      }
    },
    { connection: redis },
  );

  worker.on('failed', (job, err) => {
    console.error(`[Giveaway Worker] Job ${job?.id} failed:`, err);
  });

  console.log('[Workers] Giveaway worker started');
  return worker;
}
