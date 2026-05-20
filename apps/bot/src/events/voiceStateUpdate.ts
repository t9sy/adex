import {
  Events,
  type VoiceState,
  type Client,
  EmbedBuilder,
  type TextChannel,
} from 'discord.js';
import { getGuildSettings } from '../utils/guild.js';
import { COLORS } from '@discord-bot/shared';

export default {
  name: Events.VoiceStateUpdate,
  once: false,
  async execute(oldState: VoiceState, newState: VoiceState, _client: Client) {
    if (!newState.guild) return;

    const settings = await getGuildSettings(newState.guild.id);
    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot) return;

    if (!oldState.channel && newState.channel) {
      const logChannelId = settings.logs.voice_join;
      if (!logChannelId) return;

      const channel = newState.guild.channels.cache.get(logChannelId) as TextChannel | undefined;
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle('Voice Channel Joined')
        .setDescription(`${member.user.tag} joined **${newState.channel.name}**`)
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } else if (oldState.channel && !newState.channel) {
      const logChannelId = settings.logs.voice_leave;
      if (!logChannelId) return;

      const channel = newState.guild.channels.cache.get(logChannelId) as TextChannel | undefined;
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle('Voice Channel Left')
        .setDescription(`${member.user.tag} left **${oldState.channel.name}**`)
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    }
  },
};
