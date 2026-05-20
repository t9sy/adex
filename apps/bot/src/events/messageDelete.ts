import { Events, type Message, type Client, EmbedBuilder, type TextChannel } from 'discord.js';
import { getGuildSettings } from '../utils/guild.js';
import { COLORS } from '@discord-bot/shared';

export default {
  name: Events.MessageDelete,
  once: false,
  async execute(message: Message, _client: Client) {
    if (!message.guild || message.author?.bot) return;

    const settings = await getGuildSettings(message.guild.id);
    const logChannelId = settings.logs.message_delete;
    if (!logChannelId) return;

    const channel = message.guild.channels.cache.get(logChannelId) as TextChannel | undefined;
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setTitle('Message Deleted')
      .setDescription(`By ${message.author} in ${message.channel}`)
      .addFields({ name: 'Content', value: message.content?.slice(0, 1024) || '*empty*' })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  },
};
