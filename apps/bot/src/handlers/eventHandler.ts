import { Client } from 'discord.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';

/** Loads all event files from the events directory. */
export async function loadEvents(client: Client): Promise<void> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const eventsDir = join(__dirname, '..', 'events');

  const files = readdirSync(eventsDir).filter((f) => f.endsWith('.ts') || f.endsWith('.js'));

  for (const file of files) {
    const filePath = join(eventsDir, file);
    const module = await import(filePath);
    const event = module.default ?? module;

    if (event.name && event.execute) {
      if (event.once) {
        client.once(event.name, (...args: unknown[]) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args: unknown[]) => event.execute(...args, client));
      }
      console.log(`[Events] Loaded: ${event.name} (${event.once ? 'once' : 'on'})`);
    }
  }
}
