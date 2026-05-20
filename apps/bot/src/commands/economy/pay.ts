import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
} from 'discord.js';
import { prisma } from '@discord-bot/db';
import { getGuildLanguage, getOrCreateUser } from '../../utils/guild.js';
import { replySuccess, replyError } from '../../utils/embeds.js';
import { t } from '../../utils/i18n.js';
import type { BotCommand } from '../../utils/types.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Send coins to another user')
    .addUserOption((opt) => opt.setName('user').setDescription('The user to pay').setRequired(true))
    .addIntegerOption((opt) =>
      opt.setName('amount').setDescription('Amount of coins').setRequired(true).setMinValue(1),
    ),

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    if (!interaction.guild) return;

    const target = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);
    const lang = await getGuildLanguage(interaction.guild.id);

    if (target.id === interaction.user.id) {
      await replyError(interaction, 'Error', 'You cannot pay yourself.');
      return;
    }

    const sender = await getOrCreateUser(interaction.user.id, interaction.guild.id);
    if (sender.coins < amount) {
      await replyError(interaction, 'Error', t(lang, 'economy.pay.insufficient'));
      return;
    }

    const receiver = await getOrCreateUser(target.id, interaction.guild.id);

    await prisma.$transaction([
      prisma.user.update({ where: { id: sender.id }, data: { coins: sender.coins - amount } }),
      prisma.user.update({ where: { id: receiver.id }, data: { coins: receiver.coins + amount } }),
    ]);

    await replySuccess(
      interaction,
      'Payment',
      t(lang, 'economy.pay.success', {
        amount: amount.toString(),
        target: target.username,
      }),
    );
  },
};

export default command;
