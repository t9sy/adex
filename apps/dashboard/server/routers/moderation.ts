import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '@discord-bot/db';
import { moderationSettingsSchema, DEFAULT_GUILD_SETTINGS, type GuildSettings } from '@discord-bot/shared';

export const moderationRouter = router({
  getSettings: protectedProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ input }) => {
      const guild = await prisma.guild.findUnique({ where: { guildId: input.guildId } });
      const settings = guild?.settings as unknown as GuildSettings | undefined;
      return settings?.moderation ?? DEFAULT_GUILD_SETTINGS.moderation;
    }),

  updateSettings: protectedProcedure
    .input(z.object({ guildId: z.string(), data: moderationSettingsSchema }))
    .mutation(async ({ input }) => {
      const guild = await prisma.guild.findUnique({ where: { guildId: input.guildId } });
      const currentSettings = (guild?.settings as unknown as GuildSettings) ?? DEFAULT_GUILD_SETTINGS;
      const newSettings = { ...currentSettings, moderation: { ...currentSettings.moderation, ...input.data } };

      return prisma.guild.update({
        where: { guildId: input.guildId },
        data: { settings: JSON.parse(JSON.stringify(newSettings)) },
      });
    }),

  getLogs: protectedProcedure
    .input(z.object({ guildId: z.string(), limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ input }) => {
      return prisma.moderationLog.findMany({
        where: { guildId: input.guildId },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      });
    }),
});
