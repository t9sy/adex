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
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption((opt) => opt.setName('user').setDescription('The user to ban').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the ban'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    if (!interaction.guild) return;

    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const lang = await getGuildLanguage(interaction.guild.id);

    if (target.id === interaction.user.id) {
      await replyError(interaction, 'Error', t(lang, 'ban.error.self'));
      return;
    }

    if (target.id === interaction.client.user?.id) {
      await replyError(interaction, 'Error', t(lang, 'ban.error.bot'));
      return;
    }

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member || !member.bannable) {
      await replyError(interaction, 'Error', t(lang, 'ban.error.permissions'));
      return;
    }

    await member.ban({ reason });

    await getOrCreateUser(target.id, interaction.guild.id);
    await getOrCreateUser(interaction.user.id, interaction.guild.id);

    await prisma.moderationLog.create({
      data: {
        guildId: interaction.guild.id,
        userId: target.id,
        moderatorId: interaction.user.id,
        action: 'ban',
        reason,
      },
    });

    await replySuccess(
      interaction,
      'Ban',
      t(lang, 'ban.success', { user: target.tag, reason }),
    );
  },
};

export default command;
