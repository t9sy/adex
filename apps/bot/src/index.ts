import 'dotenv/config';
import { ShardingManager } from 'discord.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Entry point: starts the bot with optional sharding support. */
async function main(): Promise<void> {
  const useSharding = process.env.USE_SHARDING === 'true';

  if (useSharding) {
    const manager = new ShardingManager(join(__dirname, 'bot.js'), {
      token: process.env.DISCORD_TOKEN,
      totalShards: 'auto',
    });

    manager.on('shardCreate', (shard) => {
      console.log(`[Shard] Launched shard ${shard.id}`);
    });

    await manager.spawn();
    console.log('[ShardingManager] All shards spawned successfully');
  } else {
    const { startBot } = await import('./bot.js');
    await startBot();
  }
}

main().catch((error) => {
  console.error('[Fatal] Failed to start:', error);
  process.exit(1);
});
