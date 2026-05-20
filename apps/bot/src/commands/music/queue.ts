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
    .setName('queue')
    .setDescription('View the current music queue'),

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    if (!interaction.guild) return;

    const lang = await getGuildLanguage(interaction.guild.id);
    const queue = getQueue(interaction.guild.id);

    if (!queue || queue.songs.length === 0) {
      await replyError(interaction, 'Queue', t(lang, 'music.empty'));
      return;
    }

    const lines = queue.songs.map((song, i) =>
      i === 0 ? `**Now Playing:** ${song.title}` : `${i}. ${song.title}`,
    );

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle('Music Queue')
      .setDescription(lines.join('\n'))
      .setFooter({ text: `${queue.songs.length} song(s) in queue` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
