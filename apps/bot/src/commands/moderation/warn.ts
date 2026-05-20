import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type Client,
} from 'discord.js';
import { prisma } from '@discord-bot/db';
import { getGuildLanguage, getGuildSettings, getOrCreateUser } from '../../utils/guild.js';
import { replySuccess } from '../../utils/embeds.js';
import { t } from '../../utils/i18n.js';
import type { BotCommand } from '../../utils/types.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption((opt) => opt.setName('user').setDescription('The user to warn').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the warning').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    if (!interaction.guild) return;

    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);
    const lang = await getGuildLanguage(interaction.guild.id);

    const user = await getOrCreateUser(target.id, interaction.guild.id);
    await getOrCreateUser(interaction.user.id, interaction.guild.id);

    const newWarns = user.warns + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: { warns: newWarns },
    });

    await prisma.moderationLog.create({
      data: {
        guildId: interaction.guild.id,
        userId: target.id,
        moderatorId: interaction.user.id,
        action: 'warn',
        reason,
      },
    });

    await replySuccess(
      interaction,
      'Warning',
      t(lang, 'warn.success', {
        user: target.tag,
        count: newWarns.toString(),
        reason,
      }),
    );

    const settings = await getGuildSettings(interaction.guild.id);
    if (newWarns >= settings.moderation.warnThreshold) {
      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!member) return;

      const action = settings.moderation.warnAction;
      try {
        if (action === 'mute' && member.moderatable) {
          await member.timeout(60 * 60 * 1000, `Reached ${newWarns} warnings`);
        } else if (action === 'kick' && member.kickable) {
          await member.kick(`Reached ${newWarns} warnings`);
        } else if (action === 'ban' && member.bannable) {
          await member.ban({ reason: `Reached ${newWarns} warnings` });
        }

        await interaction.followUp({
          embeds: [
            {
              color: 0xe74c3c,
              description: t(lang, 'warn.escalation', {
                user: target.tag,
                threshold: settings.moderation.warnThreshold.toString(),
                action,
              }),
            },
          ],
        });
      } catch {
        console.warn(`[Warn] Failed to escalate for ${target.id}`);
      }
    }
  },
};

export default command;
