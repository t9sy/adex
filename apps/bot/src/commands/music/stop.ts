import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
} from 'discord.js';
import { getQueue, deleteQueue } from './play.js';
import { getGuildLanguage } from '../../utils/guild.js';
import { replySuccess, replyError } from '../../utils/embeds.js';
import { t } from '../../utils/i18n.js';
import type { BotCommand } from '../../utils/types.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop the music and clear the queue'),

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    if (!interaction.guild) return;

    const lang = await getGuildLanguage(interaction.guild.id);
    const queue = getQueue(interaction.guild.id);

    if (!queue) {
      await replyError(interaction, 'Error', t(lang, 'music.empty'));
      return;
    }

    queue.songs = [];
    queue.player.stop();
    queue.connection.destroy();
    deleteQueue(interaction.guild.id);

    await replySuccess(interaction, 'Music', t(lang, 'music.stop'));
  },
};

export default command;
