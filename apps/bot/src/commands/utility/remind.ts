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
    .setName('remind')
    .setDescription('Set a reminder')
    .addStringOption((opt) =>
      opt.setName('time').setDescription('Duration (e.g. 10m, 2h, 1d)').setRequired(true),
    )
    .addStringOption((opt) =>
      opt.setName('message').setDescription('What to remind you about').setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    if (!interaction.guild) return;

    const lang = await getGuildLanguage(interaction.guild.id);
    const timeStr = interaction.options.getString('time', true);
    const message = interaction.options.getString('message', true);

    const ms = parseTime(timeStr);
    if (!ms || ms < 60_000 || ms > 30 * 24 * 60 * 60 * 1000) {
      await replyError(interaction, 'Error', 'Invalid time. Use format: 10m, 2h, 1d (min 1m, max 30d)');
      return;
    }

    const triggerAt = new Date(Date.now() + ms);

    await getOrCreateUser(interaction.user.id, interaction.guild.id);

    const reminder = await prisma.reminder.create({
      data: {
        userId: interaction.user.id,
        guildId: interaction.guild.id,
        channelId: interaction.channelId,
        message,
        triggerAt,
      },
    });

    await client.queues.reminder.add(
      'reminder',
      { reminderId: reminder.id },
      { delay: ms, jobId: reminder.id },
    );

    await replySuccess(interaction, 'Reminder', t(lang, 'remind.set', { time: timeStr }));
  },
};

/** Parses a time string like "10m", "2h", "1d" into milliseconds. */
function parseTime(str: string): number | null {
  const match = str.match(/^(\d+)(m|h|d)$/);
  if (!match) return null;

  const value = parseInt(match[1]!, 10);
  const unit = match[2];

  switch (unit) {
    case 'm':
      return value * 60_000;
    case 'h':
      return value * 3_600_000;
    case 'd':
      return value * 86_400_000;
    default:
      return null;
  }
}

export default command;
