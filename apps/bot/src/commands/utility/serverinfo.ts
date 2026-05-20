import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
  EmbedBuilder,
  ChannelType,
} from 'discord.js';
import { COLORS } from '@discord-bot/shared';
import type { BotCommand } from '../../utils/types.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('View information about this server'),

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    const guild = interaction.guild;
    if (!guild) return;

    const textChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildVoice).size;

    const embed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle(`Server Info: ${guild.name}`)
      .setThumbnail(guild.iconURL({ size: 256 }) ?? '')
      .addFields(
        { name: 'ID', value: guild.id, inline: true },
        { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
        { name: 'Members', value: guild.memberCount.toString(), inline: true },
        { name: 'Text Channels', value: textChannels.toString(), inline: true },
        { name: 'Voice Channels', value: voiceChannels.toString(), inline: true },
        { name: 'Roles', value: guild.roles.cache.size.toString(), inline: true },
        { name: 'Created', value: guild.createdAt.toUTCString(), inline: false },
        { name: 'Boost Level', value: guild.premiumTier.toString(), inline: true },
        { name: 'Boosts', value: guild.premiumSubscriptionCount?.toString() ?? '0', inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
