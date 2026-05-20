import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '@discord-bot/db';

export const reactionRolesRouter = router({
  list: protectedProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ input }) => {
      return prisma.reactionRoleMessage.findMany({
        where: { guildId: input.guildId },
        include: { roles: true },
        orderBy: { createdAt: 'desc' },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        guildId: z.string(),
        channelId: z.string(),
        messageId: z.string(),
        title: z.string().optional(),
        color: z.string().optional(),
        mode: z.enum(['single', 'multi']).default('multi'),
        roles: z.array(
          z.object({
            emoji: z.string(),
            roleId: z.string(),
            label: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      return prisma.reactionRoleMessage.create({
        data: {
          guildId: input.guildId,
          channelId: input.channelId,
          messageId: input.messageId,
          title: input.title,
          color: input.color,
          mode: input.mode,
          roles: {
            create: input.roles,
          },
        },
        include: { roles: true },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.reactionRoleMessage.delete({ where: { id: input.id } });
    }),
});
