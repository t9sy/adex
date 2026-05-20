import {
  Events,
  type Interaction,
  type Client,
  Collection,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { replyError } from '../utils/embeds.js';
import { getGuildLanguage } from '../utils/guild.js';
import { t } from '../utils/i18n.js';
import { handleButtonInteraction } from '../handlers/buttonHandler.js';

export default {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction: Interaction, client: Client) {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction, client);
    } else if (interaction.isButton()) {
      await handleButtonInteraction(interaction, client);
    }
  },
};

/** Handles slash command interactions. */
async function handleCommand(interaction: ChatInputCommandInteraction, client: Client) {
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  const lang = interaction.guildId
    ? await getGuildLanguage(interaction.guildId)
    : 'en';

  const cooldowns = client.cooldowns;
  if (!cooldowns.has(command.data.name)) {
    cooldowns.set(command.data.name, new Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(command.data.name)!;
  const cooldownAmount = (command.cooldown ?? 3) * 1000;

  const existing = timestamps.get(interaction.user.id);
  if (existing) {
    const expirationTime = existing + cooldownAmount;
    if (now < expirationTime) {
      const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
      await replyError(
        interaction,
        'Cooldown',
        t(lang, 'error.cooldown', { time: timeLeft }),
      );
      return;
    }
  }

  timestamps.set(interaction.user.id, now);
  setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(`[Command Error] ${command.data.name}:`, error);
    await replyError(interaction, 'Error', t(lang, 'error.generic'));
  }
}
