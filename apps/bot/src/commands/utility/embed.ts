import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  type ModalActionRowComponentBuilder,
  EmbedBuilder,
} from 'discord.js';
import { COLORS } from '@discord-bot/shared';
import type { BotCommand } from '../../utils/types.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Create a custom embed message'),

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    const modal = new ModalBuilder()
      .setCustomId('embed_create')
      .setTitle('Create Embed');

    const titleInput = new TextInputBuilder()
      .setCustomId('embed_title')
      .setLabel('Title')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(256);

    const descInput = new TextInputBuilder()
      .setCustomId('embed_description')
      .setLabel('Description')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(4000);

    const colorInput = new TextInputBuilder()
      .setCustomId('embed_color')
      .setLabel('Color (hex, e.g. #5865F2)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(7);

    modal.addComponents(
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(titleInput),
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(descInput),
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(colorInput),
    );

    await interaction.showModal(modal);

    const submitted = await interaction.awaitModalSubmit({
      time: 300_000,
      filter: (i) => i.customId === 'embed_create' && i.user.id === interaction.user.id,
    }).catch(() => null);

    if (!submitted) return;

    const title = submitted.fields.getTextInputValue('embed_title');
    const description = submitted.fields.getTextInputValue('embed_description');
    const colorRaw = submitted.fields.getTextInputValue('embed_color');

    let color: number = COLORS.PRIMARY;
    if (colorRaw) {
      const parsed = parseInt(colorRaw.replace('#', ''), 16);
      if (!isNaN(parsed)) color = parsed;
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description)
      .setTimestamp();

    await submitted.reply({ embeds: [embed] });
  },
};

export default command;
