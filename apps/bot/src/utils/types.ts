import type {
  ChatInputCommandInteraction,
  Client,
  SharedNameAndDescription,
} from 'discord.js';

/** Represents a bot slash command. */
export interface BotCommand {
  data: SharedNameAndDescription & { toJSON(): unknown };
  cooldown?: number;
  permissions?: bigint[];
  execute: (interaction: ChatInputCommandInteraction, client: Client) => Promise<void>;
}
