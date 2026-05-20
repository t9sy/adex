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
    .setName('daily')
    .setDescription('Claim your daily coin reward'),

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    if (!interaction.guild) return;

    const lang = await getGuildLanguage(interaction.guild.id);
    const user = await getOrCreateUser(interaction.user.id, interaction.guild.id);

    if (user.lastDaily) {
      const diff = Date.now() - user.lastDaily.getTime();
      if (diff < 86_400_000) {
        const remaining = 86_400_000 - diff;
        const hours = Math.floor(remaining / 3_600_000);
        const minutes = Math.floor((remaining % 3_600_000) / 60_000);
        await replyError(
          interaction,
          'Daily',
          t(lang, 'economy.daily.cooldown', { time: `${hours}h ${minutes}m` }),
        );
        return;
      }
    }

    const newBalance = user.coins + ECONOMY.DAILY_AMOUNT;
    await prisma.user.update({
      where: { id: user.id },
      data: { coins: newBalance, lastDaily: new Date() },
    });

    await replySuccess(
      interaction,
      'Daily Reward',
      t(lang, 'economy.daily.success', {
        amount: ECONOMY.DAILY_AMOUNT.toString(),
        balance: newBalance.toString(),
      }),
    );
  },
};

export default command;
