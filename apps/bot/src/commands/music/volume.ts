import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
} from 'discord.js';
import { getQueue } from './play.js';
import { getGuildLanguage } from '../../utils/guild.js';
import { replySuccess, replyError } from '../../utils/embeds.js';
import { t } from '../../utils/i18n.js';
import type { BotCommand } from '../../utils/types.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set the music volume')
    .addIntegerOption((opt) =>
      opt.setName('level').setDescription('Volume level (0-100)').setRequired(true).setMinValue(0).setMaxValue(100),
    ),

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    if (!interaction.guild) return;

    const lang = await getGuildLanguage(interaction.guild.id);
    const queue = getQueue(interaction.guild.id);

    if (!queue) {
      await replyError(interaction, 'Error', t(lang, 'music.empty'));
      return;
    }

    const level = interaction.options.getInteger('level', true);
    queue.volume = level;

    await replySuccess(interaction, 'Volume', `Volume set to **${level}%**`);
  },
};

export default command;
