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
    .setName('unmute')
    .setDescription('Remove timeout from a user')
    .addUserOption((opt) => opt.setName('user').setDescription('The user to unmute').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    if (!interaction.guild) return;

    const target = interaction.options.getUser('user', true);
    const lang = await getGuildLanguage(interaction.guild.id);

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member || !member.moderatable) {
      await replyError(interaction, 'Error', t(lang, 'error.bot_no_permission'));
      return;
    }

    await member.timeout(null);

    await getOrCreateUser(target.id, interaction.guild.id);
    await getOrCreateUser(interaction.user.id, interaction.guild.id);

    await prisma.moderationLog.create({
      data: {
        guildId: interaction.guild.id,
        userId: target.id,
        moderatorId: interaction.user.id,
        action: 'unmute',
      },
    });

    await replySuccess(
      interaction,
      'Unmute',
      t(lang, 'unmute.success', { user: target.tag }),
    );
  },
};

export default command;
