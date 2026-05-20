import { Client, ActivityType, Events } from 'discord.js';

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: Client) {
    console.log(`[Bot] Logged in as ${client.user?.tag}`);
    console.log(`[Bot] Serving ${client.guilds.cache.size} guilds`);

    client.user?.setActivity({
      name: '/help | Serving servers',
      type: ActivityType.Playing,
    });
  },
};
