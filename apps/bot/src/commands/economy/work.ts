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
    .setName('work')
    .setDescription('Work to earn coins'),

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    if (!interaction.guild) return;

    const lang = await getGuildLanguage(interaction.guild.id);
    const user = await getOrCreateUser(interaction.user.id, interaction.guild.id);

    if (user.lastWork) {
      const diff = Date.now() - user.lastWork.getTime();
      if (diff < ECONOMY.WORK_COOLDOWN_MS) {
        const remaining = ECONOMY.WORK_COOLDOWN_MS - diff;
        const minutes = Math.floor(remaining / 60_000);
        await replyError(
          interaction,
          'Work',
          `You need to wait **${minutes}** more minutes before working again.`,
        );
        return;
      }
    }

    const earned = Math.floor(
      Math.random() * (ECONOMY.WORK_MAX - ECONOMY.WORK_MIN) + ECONOMY.WORK_MIN,
    );
    const newBalance = user.coins + earned;

    await prisma.user.update({
      where: { id: user.id },
      data: { coins: newBalance, lastWork: new Date() },
    });

    await replySuccess(
      interaction,
      'Work',
      t(lang, 'economy.work.success', { amount: earned.toString() }),
    );
  },
};

export default command;
