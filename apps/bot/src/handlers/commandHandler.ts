import { Client, Collection } from 'discord.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync, statSync } from 'fs';
import type { BotCommand } from '../utils/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Recursively loads all command files from the commands directory. */
export async function loadCommands(client: Client): Promise<void> {
  client.commands = new Collection<string, BotCommand>();
  const commandsDir = join(__dirname, '..', 'commands');

  const categories = readdirSync(commandsDir).filter((dir) => {
    const fullPath = join(commandsDir, dir);
    return statSync(fullPath).isDirectory();
  });

  for (const category of categories) {
    const categoryDir = join(commandsDir, category);
    const files = readdirSync(categoryDir).filter((f) => f.endsWith('.ts') || f.endsWith('.js'));

    for (const file of files) {
      const filePath = join(categoryDir, file);
      const module = await import(filePath);
      const command: BotCommand = module.default ?? module;

      if ('data' in command && 'execute' in command && command.data && typeof command.execute === 'function') {
        client.commands.set(command.data.name, command);
        console.log(`[Commands] Loaded: ${category}/${command.data.name}`);
      } else {
        console.warn(`[Commands] Skipping ${filePath}: missing data or execute`);
      }
    }
  }

  console.log(`[Commands] Loaded ${client.commands.size} commands total`);
}
