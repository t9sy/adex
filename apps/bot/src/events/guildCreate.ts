import { Events, type Guild } from 'discord.js';
import { prisma } from '@discord-bot/db';
import { DEFAULT_GUILD_SETTINGS } from '@discord-bot/shared';

export default {
  name: Events.GuildCreate,
  once: false,
  async execute(guild: Guild) {
    await prisma.guild.upsert({
      where: { guildId: guild.id },
      create: {
        guildId: guild.id,
        settings: JSON.parse(JSON.stringify(DEFAULT_GUILD_SETTINGS)),
      },
      update: {},
    });
    console.log(`[Guild] Joined: ${guild.name} (${guild.id})`);
  },
};
