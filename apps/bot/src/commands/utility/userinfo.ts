import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
  EmbedBuilder,
} from 'discord.js';
import { COLORS } from '@discord-bot/shared';
import type { BotCommand } from '../../utils/types.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('View information about a user')
    .addUserOption((opt) => opt.setName('user').setDescription('The user to inspect')),

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    if (!interaction.guild) return;

    const target = interaction.options.getUser('user') ?? interaction.user;
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle(`User Info: ${target.username}`)
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'ID', value: target.id, inline: true },
        { name: 'Tag', value: target.tag, inline: true },
        { name: 'Bot', value: target.bot ? 'Yes' : 'No', inline: true },
        { name: 'Account Created', value: target.createdAt.toUTCString(), inline: false },
      )
      .setTimestamp();

    if (member) {
      const roles = member.roles.cache
        .filter((r) => r.id !== interaction.guild!.id)
        .map((r) => `${r}`)
        .join(', ') || 'None';

      embed.addFields(
        { name: 'Joined Server', value: member.joinedAt?.toUTCString() ?? 'Unknown', inline: false },
        { name: `Roles (${member.roles.cache.size - 1})`, value: roles.slice(0, 1024), inline: false },
      );
    }

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
