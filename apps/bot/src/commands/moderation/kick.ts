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
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption((opt) => opt.setName('user').setDescription('The user to kick').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the kick'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    if (!interaction.guild) return;

    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const lang = await getGuildLanguage(interaction.guild.id);

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member || !member.kickable) {
      await replyError(interaction, 'Error', t(lang, 'kick.error.permissions'));
      return;
    }

    await member.kick(reason);

    await getOrCreateUser(target.id, interaction.guild.id);
    await getOrCreateUser(interaction.user.id, interaction.guild.id);

    await prisma.moderationLog.create({
      data: {
        guildId: interaction.guild.id,
        userId: target.id,
        moderatorId: interaction.user.id,
        action: 'kick',
        reason,
      },
    });

    await replySuccess(
      interaction,
      'Kick',
      t(lang, 'kick.success', { user: target.tag, reason }),
    );
  },
};

export default command;
