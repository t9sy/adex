import { Events, type Message, type Client } from 'discord.js';
import { handleLevelingXp } from '../modules/leveling/xp.js';
import { handleAutoModeration } from '../modules/moderation/automod.js';

export default {
  name: Events.MessageCreate,
  once: false,
  async execute(message: Message, client: Client) {
    if (message.author.bot || !message.guild) return;

    await handleAutoModeration(message, client);
    await handleLevelingXp(message, client);
  },
};
