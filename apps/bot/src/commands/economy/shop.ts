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
    .setName('shop')
    .setDescription('View the server shop'),

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    if (!interaction.guild) return;

    const lang = await getGuildLanguage(interaction.guild.id);

    const items = await prisma.shopItem.findMany({
      where: { guildId: interaction.guild.id },
      orderBy: { price: 'asc' },
    });

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(t(lang, 'economy.shop.title'))
      .setTimestamp();

    if (items.length === 0) {
      embed.setDescription('The shop is empty. Ask an admin to add items via the dashboard.');
    } else {
      const lines = items.map(
        (item) =>
          `**${item.name}** — ${item.price} coins\n${item.description ?? 'No description'}${item.roleId ? `\nRole: <@&${item.roleId}>` : ''}`,
      );
      embed.setDescription(lines.join('\n\n'));
    }

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
