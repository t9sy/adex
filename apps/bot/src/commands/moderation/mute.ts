import {
  SlashCommandBuilder,
  PermissionFlagsBits,
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
    .setName('mute')
    .setDescription('Timeout a user')
    .addUserOption((opt) => opt.setName('user').setDescription('The user to mute').setRequired(true))
    .addIntegerOption((opt) =>
      opt.setName('duration').setDescription('Duration in minutes').setRequired(true).setMinValue(1).setMaxValue(10080),
    )
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the mute'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    if (!interaction.guild) return;

    const target = interaction.options.getUser('user', true);
    const duration = interaction.options.getInteger('duration', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const lang = await getGuildLanguage(interaction.guild.id);

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member || !member.moderatable) {
      await replyError(interaction, 'Error', t(lang, 'error.bot_no_permission'));
      return;
    }

    await member.timeout(duration * 60 * 1000, reason);

    await getOrCreateUser(target.id, interaction.guild.id);
    await getOrCreateUser(interaction.user.id, interaction.guild.id);

    await prisma.moderationLog.create({
      data: {
        guildId: interaction.guild.id,
        userId: target.id,
        moderatorId: interaction.user.id,
        action: 'mute',
        reason,
        duration,
      },
    });

    await replySuccess(
      interaction,
      'Mute',
      t(lang, 'mute.success', { user: target.tag, duration: duration.toString() }),
    );
  },
};

export default command;
