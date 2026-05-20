import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
  EmbedBuilder,
} from 'discord.js';
import { prisma } from '@discord-bot/db';
import { COLORS } from '@discord-bot/shared';
import { getGuildLanguage } from '../../utils/guild.js';
import { t } from '../../utils/i18n.js';
import type { BotCommand } from '../../utils/types.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the top 10 users by level/XP'),

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    if (!interaction.guild) return;
    await interaction.deferReply();

    const lang = await getGuildLanguage(interaction.guild.id);

    const users = await prisma.user.findMany({
      where: { guildId: interaction.guild.id },
      orderBy: [{ level: 'desc' }, { xp: 'desc' }],
      take: 10,
    });

    const lines = users.map((u, i) => {
      const medal = i === 0 ? '1.' : i === 1 ? '2.' : i === 2 ? '3.' : `${i + 1}.`;
      return `${medal} <@${u.userId}> — Level **${u.level}** (${u.xp} XP)`;
    });

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(t(lang, 'leaderboard.title'))
      .setDescription(lines.join('\n') || 'No data yet.')
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
