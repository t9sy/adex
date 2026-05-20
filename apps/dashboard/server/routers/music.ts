import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '@discord-bot/db';
import { musicSettingsSchema, DEFAULT_GUILD_SETTINGS, type GuildSettings } from '@discord-bot/shared';

export const musicRouter = router({
  getSettings: protectedProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ input }) => {
      const guild = await prisma.guild.findUnique({ where: { guildId: input.guildId } });
      const settings = guild?.settings as unknown as GuildSettings | undefined;
      return settings?.music ?? DEFAULT_GUILD_SETTINGS.music;
    }),

  updateSettings: protectedProcedure
    .input(z.object({ guildId: z.string(), data: musicSettingsSchema }))
    .mutation(async ({ input }) => {
      const guild = await prisma.guild.findUnique({ where: { guildId: input.guildId } });
      const currentSettings = (guild?.settings as unknown as GuildSettings) ?? DEFAULT_GUILD_SETTINGS;
      const newSettings = { ...currentSettings, music: { ...currentSettings.music, ...input.data } };

      return prisma.guild.update({
        where: { guildId: input.guildId },
        data: { settings: JSON.parse(JSON.stringify(newSettings)) },
      });
    }),
});
