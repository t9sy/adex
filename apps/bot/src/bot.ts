import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  REST,
  Routes,
} from 'discord.js';
import { Redis } from 'ioredis';
import { Queue } from 'bullmq';
import { prisma } from '@discord-bot/db';
import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import type { BotCommand } from './utils/types.js';

/** Augment the Discord.js Client with custom properties. */
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, BotCommand>;
    cooldowns: Collection<string, Collection<string, number>>;
    redis: Redis;
    queues: {
      reminder: Queue;
      giveaway: Queue;
    };
  }
}

/** Starts the Discord bot client with all handlers and connections. */
export async function startBot(): Promise<void> {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Message, Partials.Reaction, Partials.Channel],
  });

  client.commands = new Collection();
  client.cooldowns = new Collection();

  const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

  await redis.connect();
  console.log('[Redis] Connected');
  client.redis = redis;

  const connection = { host: redis.options.host ?? 'localhost', port: redis.options.port ?? 6379 };
  client.queues = {
    reminder: new Queue('reminders', { connection }),
    giveaway: new Queue('giveaways', { connection }),
  };

  await loadCommands(client);
  await loadEvents(client);

  await registerSlashCommands(client);

  process.on('unhandledRejection', (error) => {
    console.error('[Unhandled Rejection]', error);
  });

  process.on('uncaughtException', (error) => {
    console.error('[Uncaught Exception]', error);
  });

  await client.login(process.env.DISCORD_TOKEN);

  const dbCheck = await prisma.$queryRaw`SELECT 1`;
  console.log('[Database] Connected', dbCheck ? '(OK)' : '(FAIL)');
}

/** Registers all slash commands with the Discord API. */
async function registerSlashCommands(client: Client): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
  const commands = client.commands.map((cmd) => cmd.data.toJSON());

  try {
    console.log(`[Commands] Registering ${commands.length} slash commands...`);
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!), {
      body: commands,
    });
    console.log('[Commands] Successfully registered all slash commands');
  } catch (error) {
    console.error('[Commands] Failed to register slash commands:', error);
  }
}
