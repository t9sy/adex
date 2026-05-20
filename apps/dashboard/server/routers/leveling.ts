import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '@discord-bot/db';
import { levelingSettingsSchema, levelRoleSchema, DEFAULT_GUILD_SETTINGS, type GuildSettings } from '@discord-bot/shared';

export const levelingRouter = router({
  getSettings: protectedProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ input }) => {
      const guild = await prisma.guild.findUnique({ where: { guildId: input.guildId } });
      const settings = guild?.settings as unknown as GuildSettings | undefined;
      return settings?.leveling ?? DEFAULT_GUILD_SETTINGS.leveling;
    }),

  updateSettings: protectedProcedure
    .input(z.object({ guildId: z.string(), data: levelingSettingsSchema }))
    .mutation(async ({ input }) => {
      const guild = await prisma.guild.findUnique({ where: { guildId: input.guildId } });
      const currentSettings = (guild?.settings as unknown as GuildSettings) ?? DEFAULT_GUILD_SETTINGS;
      const newSettings = { ...currentSettings, leveling: { ...currentSettings.leveling, ...input.data } };

      return prisma.guild.update({
        where: { guildId: input.guildId },
        data: { settings: newSettings as unknown as Record<string, unknown> },
      });
    }),

  getLevelRoles: protectedProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ input }) => {
      return prisma.levelRole.findMany({
        where: { guildId: input.guildId },
        orderBy: { level: 'asc' },
      });
    }),

  addLevelRole: protectedProcedure
    .input(z.object({ guildId: z.string(), data: levelRoleSchema }))
    .mutation(async ({ input }) => {
      return prisma.levelRole.upsert({
        where: { guildId_level: { guildId: input.guildId, level: input.data.level } },
        create: { guildId: input.guildId, ...input.data },
        update: { roleId: input.data.roleId },
      });
    }),

  removeLevelRole: protectedProcedure
    .input(z.object({ guildId: z.string(), level: z.number() }))
    .mutation(async ({ input }) => {
      return prisma.levelRole.delete({
        where: { guildId_level: { guildId: input.guildId, level: input.level } },
      });
    }),

  getLeaderboard: protectedProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ input }) => {
      return prisma.user.findMany({
        where: { guildId: input.guildId },
        orderBy: [{ level: 'desc' }, { xp: 'desc' }],
        take: 10,
      });
    }),
});
