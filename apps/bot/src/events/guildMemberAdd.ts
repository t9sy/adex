import { Events, type GuildMember, type Client, EmbedBuilder, type TextChannel } from 'discord.js';
import { getGuildSettings } from '../utils/guild.js';
import { COLORS } from '@discord-bot/shared';

export default {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(member: GuildMember, _client: Client) {
    const settings = await getGuildSettings(member.guild.id);

    if (settings.welcome.enabled && settings.welcome.channelId) {
      const channel = member.guild.channels.cache.get(settings.welcome.channelId) as TextChannel | undefined;
      if (channel) {
        const message = settings.welcome.message
          .replace('{user}', `<@${member.id}>`)
          .replace('{server}', member.guild.name)
          .replace('{membercount}', member.guild.memberCount.toString());

        const embed = new EmbedBuilder()
          .setColor(COLORS.PRIMARY)
          .setTitle('Welcome!')
          .setDescription(message)
          .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
          .setTimestamp();

        await channel.send({ embeds: [embed] });
      }
    }

    if (settings.welcome.enabled && settings.welcome.autoRoles.length > 0) {
      for (const roleId of settings.welcome.autoRoles) {
        try {
          await member.roles.add(roleId);
        } catch {
          console.warn(`[Welcome] Failed to add role ${roleId} to ${member.id}`);
        }
      }
    }

    await logEvent(member, settings);
  },
};

/** Logs member join events to the configured log channel. */
async function logEvent(member: GuildMember, settings: Awaited<ReturnType<typeof getGuildSettings>>) {
  const logChannelId = settings.logs.member_join;
  if (!logChannelId) return;

  const channel = member.guild.channels.cache.get(logChannelId) as TextChannel | undefined;
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setTitle('Member Joined')
    .setDescription(`${member.user.tag} (${member.id})`)
    .setThumbnail(member.user.displayAvatarURL())
    .addFields(
      { name: 'Account Created', value: member.user.createdAt.toUTCString(), inline: true },
      { name: 'Member Count', value: member.guild.memberCount.toString(), inline: true },
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}
