import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
} from 'discord.js';
import { prisma } from '@discord-bot/db';
import { ECONOMY } from '@discord-bot/shared';
import { getGuildLanguage, getOrCreateUser } from '../../utils/guild.js';
import { replySuccess, replyError } from '../../utils/embeds.js';
import { t } from '../../utils/i18n.js';
import type { BotCommand } from '../../utils/types.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('steal')
    .setDescription('Try to steal coins from another user')
    .addUserOption((opt) => opt.setName('user').setDescription('The user to steal from').setRequired(true)),
  cooldown: 30,

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    if (!interaction.guild) return;

    const target = interaction.options.getUser('user', true);
    const lang = await getGuildLanguage(interaction.guild.id);

    if (target.id === interaction.user.id) {
      await replyError(interaction, 'Error', 'You cannot steal from yourself.');
      return;
    }

    const thief = await getOrCreateUser(interaction.user.id, interaction.guild.id);
    const victim = await getOrCreateUser(target.id, interaction.guild.id);

    if (victim.coins < 10) {
      await replyError(interaction, 'Error', 'This user has too few coins to steal from.');
      return;
    }

    const success = Math.random() < ECONOMY.STEAL_CHANCE;

    if (success) {
      const amount = Math.floor(victim.coins * 0.15);
      await prisma.$transaction([
        prisma.user.update({ where: { id: thief.id }, data: { coins: thief.coins + amount } }),
        prisma.user.update({ where: { id: victim.id }, data: { coins: victim.coins - amount } }),
      ]);

      await replySuccess(
        interaction,
        'Steal',
        t(lang, 'economy.steal.success', {
          amount: amount.toString(),
          target: target.username,
        }),
      );
    } else {
      const penalty = Math.floor(thief.coins * ECONOMY.STEAL_PENALTY_PERCENT);
      await prisma.user.update({
        where: { id: thief.id },
        data: { coins: Math.max(0, thief.coins - penalty) },
      });

      await replyError(
        interaction,
        'Caught!',
        t(lang, 'economy.steal.fail', { amount: penalty.toString() }),
      );
    }
  },
};

export default command;
