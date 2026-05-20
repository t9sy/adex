import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { COLORS } from '@discord-bot/shared';
import { getGuildLanguage } from '../../utils/guild.js';
import { t } from '../../utils/i18n.js';
import type { BotCommand } from '../../utils/types.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll')
    .addStringOption((opt) => opt.setName('question').setDescription('The poll question').setRequired(true))
    .addStringOption((opt) => opt.setName('option1').setDescription('Option 1').setRequired(true))
    .addStringOption((opt) => opt.setName('option2').setDescription('Option 2').setRequired(true))
    .addStringOption((opt) => opt.setName('option3').setDescription('Option 3'))
    .addStringOption((opt) => opt.setName('option4').setDescription('Option 4'))
    .addStringOption((opt) => opt.setName('option5').setDescription('Option 5')),

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    if (!interaction.guild) return;

    const lang = await getGuildLanguage(interaction.guild.id);
    const question = interaction.options.getString('question', true);

    const options: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const opt = interaction.options.getString(`option${i}`);
      if (opt) options.push(opt);
    }

    const labels = ['A', 'B', 'C', 'D', 'E'];
    const description = options
      .map((opt, i) => `**${labels[i]}** — ${opt}`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(t(lang, 'poll.title', { question }))
      .setDescription(description)
      .setFooter({ text: `Poll by ${interaction.user.username}` })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>();
    options.forEach((_, i) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`poll_${labels[i]}`)
          .setLabel(labels[i]!)
          .setStyle(ButtonStyle.Primary),
      );
    });

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};

export default command;
