import { Events, type GuildMember, type Client, EmbedBuilder, type TextChannel } from 'discord.js';
import { getGuildSettings } from '../utils/guild.js';
import { COLORS } from '@discord-bot/shared';

export default {
  name: Events.GuildMemberRemove,
  once: false,
  async execute(member: GuildMember, _client: Client) {
    const settings = await getGuildSettings(member.guild.id);
    const logChannelId = settings.logs.member_leave;
    if (!logChannelId) return;

    const channel = member.guild.channels.cache.get(logChannelId) as TextChannel | undefined;
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setTitle('Member Left')
      .setDescription(`${member.user.tag} (${member.id})`)
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: 'Joined', value: member.joinedAt?.toUTCString() ?? 'Unknown', inline: true },
        { name: 'Roles', value: member.roles.cache.map((r) => r.name).join(', ') || 'None', inline: true },
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  },
};
