import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
} from 'discord.js';
import { getGuildLanguage, getOrCreateUser } from '../../utils/guild.js';
import { replySuccess } from '../../utils/embeds.js';
import { t } from '../../utils/i18n.js';
import type { BotCommand } from '../../utils/types.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your or another user\'s balance')
    .addUserOption((opt) => opt.setName('user').setDescription('The user to check')),

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    if (!interaction.guild) return;

    const target = interaction.options.getUser('user') ?? interaction.user;
    const lang = await getGuildLanguage(interaction.guild.id);
    const userData = await getOrCreateUser(target.id, interaction.guild.id);

    await replySuccess(
      interaction,
      'Balance',
      t(lang, 'economy.balance', {
        user: target.username,
        coins: userData.coins.toString(),
      }),
    );
  },
};

export default command;
