import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '@discord-bot/db';
import { ticketSettingsSchema, DEFAULT_GUILD_SETTINGS, type GuildSettings } from '@discord-bot/shared';

export const ticketRouter = router({
  getSettings: protectedProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ input }) => {
      const guild = await prisma.guild.findUnique({ where: { guildId: input.guildId } });
      const settings = guild?.settings as unknown as GuildSettings | undefined;
      return settings?.tickets ?? DEFAULT_GUILD_SETTINGS.tickets;
    }),

  updateSettings: protectedProcedure
    .input(z.object({ guildId: z.string(), data: ticketSettingsSchema }))
    .mutation(async ({ input }) => {
      const guild = await prisma.guild.findUnique({ where: { guildId: input.guildId } });
      const currentSettings = (guild?.settings as unknown as GuildSettings) ?? DEFAULT_GUILD_SETTINGS;
      const newSettings = { ...currentSettings, tickets: { ...currentSettings.tickets, ...input.data } };

      return prisma.guild.update({
        where: { guildId: input.guildId },
        data: { settings: JSON.parse(JSON.stringify(newSettings)) },
      });
    }),

  list: protectedProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ input }) => {
      return prisma.ticket.findMany({
        where: { guildId: input.guildId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    }),
});
