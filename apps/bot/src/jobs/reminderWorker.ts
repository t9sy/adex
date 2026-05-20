import { Worker } from 'bullmq';
import { prisma } from '@discord-bot/db';
import { EmbedBuilder, type Client, type TextChannel } from 'discord.js';
import { COLORS } from '@discord-bot/shared';
import { Redis } from 'ioredis';

/** Starts the reminder worker that processes reminder jobs. */
export function startReminderWorker(client: Client): Worker {
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker(
    'reminders',
    async (job) => {
      const { reminderId } = job.data as { reminderId: string };

      const reminder = await prisma.reminder.findUnique({ where: { id: reminderId } });
      if (!reminder || reminder.fired) return;

      const channel = client.channels.cache.get(reminder.channelId) as TextChannel | undefined;
      if (channel) {
        const embed = new EmbedBuilder()
          .setColor(COLORS.INFO)
          .setTitle('Reminder')
          .setDescription(`<@${reminder.userId}> ${reminder.message}`)
          .setTimestamp();

        await channel.send({ embeds: [embed] });
      }

      await prisma.reminder.update({
        where: { id: reminderId },
        data: { fired: true },
      });
    },
    { connection: redis },
  );

  worker.on('failed', (job, err) => {
    console.error(`[Reminder Worker] Job ${job?.id} failed:`, err);
  });

  console.log('[Workers] Reminder worker started');
  return worker;
}
