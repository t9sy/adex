import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { COLORS } from '@discord-bot/shared';

/** Creates a success embed. */
export function successEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder().setColor(COLORS.SUCCESS).setTitle(title).setDescription(description).setTimestamp();
}

/** Creates an error embed. */
export function errorEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder().setColor(COLORS.ERROR).setTitle(title).setDescription(description).setTimestamp();
}

/** Creates an info embed. */
export function infoEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder().setColor(COLORS.INFO).setTitle(title).setDescription(description).setTimestamp();
}

/** Creates a warning embed. */
export function warningEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder().setColor(COLORS.WARNING).setTitle(title).setDescription(description).setTimestamp();
}

/** Replies to an interaction with an error embed. */
export async function replyError(
  interaction: ChatInputCommandInteraction,
  title: string,
  description: string,
): Promise<void> {
  const embed = errorEmbed(title, description);
  if (interaction.replied || interaction.deferred) {
    await interaction.editReply({ embeds: [embed] });
  } else {
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

/** Replies to an interaction with a success embed. */
export async function replySuccess(
  interaction: ChatInputCommandInteraction,
  title: string,
  description: string,
): Promise<void> {
  const embed = successEmbed(title, description);
  if (interaction.replied || interaction.deferred) {
    await interaction.editReply({ embeds: [embed] });
  } else {
    await interaction.reply({ embeds: [embed] });
  }
}
