import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '@discord-bot/db';
import { shopItemSchema } from '@discord-bot/shared';

export const economyRouter = router({
  getLeaderboard: protectedProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ input }) => {
      return prisma.user.findMany({
        where: { guildId: input.guildId },
        orderBy: { coins: 'desc' },
        take: 10,
      });
    }),

  getShopItems: protectedProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ input }) => {
      return prisma.shopItem.findMany({
        where: { guildId: input.guildId },
        orderBy: { price: 'asc' },
      });
    }),

  addShopItem: protectedProcedure
    .input(z.object({ guildId: z.string(), data: shopItemSchema }))
    .mutation(async ({ input }) => {
      return prisma.shopItem.create({
        data: { guildId: input.guildId, ...input.data },
      });
    }),

  removeShopItem: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.shopItem.delete({ where: { id: input.id } });
    }),
});
