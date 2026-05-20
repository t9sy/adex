import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '@discord-bot/db';
import { welcomeSettingsSchema, DEFAULT_GUILD_SETTINGS, type GuildSettings } from '@discord-bot/shared';

export const welcomeRouter = router({
  getSettings: protectedProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ input }) => {
      const guild = await prisma.guild.findUnique({ where: { guildId: input.guildId } });
      const settings = guild?.settings as unknown as GuildSettings | undefined;
      return settings?.welcome ?? DEFAULT_GUILD_SETTINGS.welcome;
    }),

  updateSettings: protectedProcedure
    .input(z.object({ guildId: z.string(), data: welcomeSettingsSchema }))
    .mutation(async ({ input }) => {
      const guild = await prisma.guild.findUnique({ where: { guildId: input.guildId } });
      const currentSettings = (guild?.settings as unknown as GuildSettings) ?? DEFAULT_GUILD_SETTINGS;
      const newSettings = { ...currentSettings, welcome: { ...currentSettings.welcome, ...input.data } };

      return prisma.guild.update({
        where: { guildId: input.guildId },
        data: { settings: newSettings as unknown as Record<string, unknown> },
      });
    }),
});
