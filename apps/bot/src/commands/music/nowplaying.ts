import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
  EmbedBuilder,
} from 'discord.js';
import { getQueue } from './play.js';
import { COLORS } from '@discord-bot/shared';
import { getGuildLanguage } from '../../utils/guild.js';
import { replyError } from '../../utils/embeds.js';
import { t } from '../../utils/i18n.js';
import type { BotCommand } from '../../utils/types.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show the currently playing song'),

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    if (!interaction.guild) return;

    const lang = await getGuildLanguage(interaction.guild.id);
    const queue = getQueue(interaction.guild.id);

    if (!queue || queue.songs.length === 0) {
      await replyError(interaction, 'Error', t(lang, 'music.empty'));
      return;
    }

    const current = queue.songs[0]!;

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle('Now Playing')
      .setDescription(`[${current.title}](${current.url})`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
