import { prisma } from '@discord-bot/db';
import { DEFAULT_GUILD_SETTINGS, type GuildSettings, type Language } from '@discord-bot/shared';

/** Casts guild settings to Prisma-compatible JSON value. */
function toJsonValue(obj: unknown) {
  return JSON.parse(JSON.stringify(obj));
}

/** Retrieves or creates guild settings from the database. */
export async function getGuildSettings(guildId: string): Promise<GuildSettings> {
  const guild = await prisma.guild.upsert({
    where: { guildId },
    create: { guildId, settings: toJsonValue(DEFAULT_GUILD_SETTINGS) },
    update: {},
  });

  return { ...DEFAULT_GUILD_SETTINGS, ...(guild.settings as unknown as GuildSettings) };
}

/** Updates guild settings in the database. */
export async function updateGuildSettings(
  guildId: string,
  settings: Partial<GuildSettings>,
): Promise<GuildSettings> {
  const current = await getGuildSettings(guildId);
  const merged = deepMerge(
    current as unknown as Record<string, unknown>,
    settings as unknown as Record<string, unknown>,
  );

  await prisma.guild.upsert({
    where: { guildId },
    create: {
      guildId,
      settings: toJsonValue(merged),
    },
    update: {
      settings: toJsonValue(merged),
    },
  });

  return merged as unknown as GuildSettings;
}

/** Gets the language configured for a guild. */
export async function getGuildLanguage(guildId: string): Promise<Language> {
  const guild = await prisma.guild.findUnique({ where: { guildId } });
  return (guild?.language as Language) ?? 'en';
}

/** Gets or creates a user record in the database. */
export async function getOrCreateUser(userId: string, guildId: string) {
  return prisma.user.upsert({
    where: { userId_guildId: { userId, guildId } },
    create: { userId, guildId },
    update: {},
  });
}

/** Deep merges two objects. */
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = target[key];
    if (
      sourceVal &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      );
    } else {
      result[key] = sourceVal;
    }
  }
  return result;
}
