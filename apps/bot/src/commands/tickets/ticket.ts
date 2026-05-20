import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  type ModalActionRowComponentBuilder,
  ChannelType,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { prisma } from '@discord-bot/db';
import { COLORS } from '@discord-bot/shared';
import { getGuildSettings, getOrCreateUser, getGuildLanguage } from '../../utils/guild.js';
import { replyError } from '../../utils/embeds.js';
import { t } from '../../utils/i18n.js';
import type { BotCommand } from '../../utils/types.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Create a support ticket'),

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    if (!interaction.guild) return;

    const lang = await getGuildLanguage(interaction.guild.id);
    const settings = await getGuildSettings(interaction.guild.id);

    if (!settings.tickets.enabled) {
      await replyError(interaction, 'Error', 'The ticket system is disabled on this server.');
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId('ticket_create')
      .setTitle('Create Ticket');

    const subjectInput = new TextInputBuilder()
      .setCustomId('ticket_subject')
      .setLabel('Subject')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100);

    const descriptionInput = new TextInputBuilder()
      .setCustomId('ticket_description')
      .setLabel('Description')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(1000);

    modal.addComponents(
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(subjectInput),
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(descriptionInput),
    );

    await interaction.showModal(modal);

    const submitted = await interaction.awaitModalSubmit({
      time: 300_000,
      filter: (i) => i.customId === 'ticket_create' && i.user.id === interaction.user.id,
    }).catch(() => null);

    if (!submitted) return;

    const subject = submitted.fields.getTextInputValue('ticket_subject');
    const description = submitted.fields.getTextInputValue('ticket_description');

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
        },
        ...(settings.tickets.supportRoleId
          ? [
              {
                id: settings.tickets.supportRoleId,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
              },
            ]
          : []),
      ],
    });

    await getOrCreateUser(interaction.user.id, interaction.guild.id);

    await prisma.ticket.create({
      data: {
        guildId: interaction.guild.id,
        userId: interaction.user.id,
        channelId: channel.id,
        subject,
        category: 'general',
      },
    });

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`Ticket: ${subject}`)
      .setDescription(description)
      .addFields({ name: 'Created by', value: `${interaction.user}` })
      .setTimestamp();

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('ticket_transcript')
        .setLabel('Save Transcript')
        .setStyle(ButtonStyle.Secondary),
    );

    await channel.send({ embeds: [embed], components: [buttons] });

    await submitted.reply({
      content: t(lang, 'ticket.created', { channel: `<#${channel.id}>` }),
      ephemeral: true,
    });
  },
};

export default command;
