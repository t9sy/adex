import { Events, type Message, type Client, EmbedBuilder, type TextChannel } from 'discord.js';
import { getGuildSettings } from '../utils/guild.js';
import { COLORS } from '@discord-bot/shared';

export default {
  name: Events.MessageUpdate,
  once: false,
  async execute(oldMessage: Message, newMessage: Message, _client: Client) {
    if (!oldMessage.guild || oldMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const settings = await getGuildSettings(oldMessage.guild.id);
    const logChannelId = settings.logs.message_edit;
    if (!logChannelId) return;

    const channel = oldMessage.guild.channels.cache.get(logChannelId) as TextChannel | undefined;
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(COLORS.WARNING)
      .setTitle('Message Edited')
      .setDescription(`By ${oldMessage.author} in ${oldMessage.channel}`)
      .addFields(
        { name: 'Before', value: oldMessage.content?.slice(0, 1024) || '*empty*' },
        { name: 'After', value: newMessage.content?.slice(0, 1024) || '*empty*' },
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  },
};
