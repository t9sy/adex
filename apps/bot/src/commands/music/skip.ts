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
    .setName('skip')
    .setDescription('Skip the current song'),

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    if (!interaction.guild) return;

    const lang = await getGuildLanguage(interaction.guild.id);
    const queue = getQueue(interaction.guild.id);

    if (!queue) {
      await replyError(interaction, 'Error', t(lang, 'music.empty'));
      return;
    }

    queue.player.stop();
    await replySuccess(interaction, 'Music', t(lang, 'music.skip'));
  },
};

export default command;
