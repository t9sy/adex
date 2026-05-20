import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '@discord-bot/db';

export const statsRouter = router({
  getOverview: protectedProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ input }) => {
      const [totalUsers, totalModerationActions, totalTickets, recentWarns] = await Promise.all([
        prisma.user.count({ where: { guildId: input.guildId } }),
        prisma.moderationLog.count({ where: { guildId: input.guildId } }),
        prisma.ticket.count({ where: { guildId: input.guildId } }),
        prisma.moderationLog.count({
          where: {
            guildId: input.guildId,
            action: 'warn',
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

      return { totalUsers, totalModerationActions, totalTickets, recentWarns };
    }),

  getModerationStats: protectedProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ input }) => {
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 86_400_000);
      const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
      const monthAgo = new Date(now.getTime() - 30 * 86_400_000);

      const [today, week, month] = await Promise.all([
        prisma.moderationLog.groupBy({
          by: ['action'],
          where: { guildId: input.guildId, createdAt: { gte: dayAgo } },
          _count: true,
        }),
        prisma.moderationLog.groupBy({
          by: ['action'],
          where: { guildId: input.guildId, createdAt: { gte: weekAgo } },
          _count: true,
        }),
        prisma.moderationLog.groupBy({
          by: ['action'],
          where: { guildId: input.guildId, createdAt: { gte: monthAgo } },
          _count: true,
        }),
      ]);

      return { today, week, month };
    }),

  getLevelingLeaderboard: protectedProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ input }) => {
      return prisma.user.findMany({
        where: { guildId: input.guildId },
        orderBy: [{ level: 'desc' }, { xp: 'desc' }],
        take: 10,
      });
    }),

  getEconomyLeaderboard: protectedProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ input }) => {
      return prisma.user.findMany({
        where: { guildId: input.guildId },
        orderBy: { coins: 'desc' },
        take: 10,
      });
    }),
});
