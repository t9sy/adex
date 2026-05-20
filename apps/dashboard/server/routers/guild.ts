import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '@discord-bot/db';
import { DEFAULT_GUILD_SETTINGS, guildGeneralSchema } from '@discord-bot/shared';

export const guildRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const accessToken = (ctx.session as Record<string, unknown>).accessToken as string;

    const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) return [];

    const guilds = (await response.json()) as Array<{
      id: string;
      name: string;
      icon: string | null;
      permissions: string;
    }>;

    return guilds
      .filter((g) => (BigInt(g.permissions) & BigInt(0x20)) !== BigInt(0))
      .map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon
          ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`
          : null,
      }));
  }),

  get: protectedProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ input }) => {
      const guild = await prisma.guild.upsert({
        where: { guildId: input.guildId },
        create: {
          guildId: input.guildId,
          settings: DEFAULT_GUILD_SETTINGS as unknown as Record<string, unknown>,
        },
        update: {},
      });

      return {
        ...guild,
        settings: { ...DEFAULT_GUILD_SETTINGS, ...(guild.settings as unknown as Record<string, unknown>) },
      };
    }),

  updateGeneral: protectedProcedure
    .input(
      z.object({
        guildId: z.string(),
        data: guildGeneralSchema,
      }),
    )
    .mutation(async ({ input }) => {
      return prisma.guild.update({
        where: { guildId: input.guildId },
        data: input.data,
      });
    }),
});
