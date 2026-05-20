import { type Message, type Client, EmbedBuilder, type TextChannel } from 'discord.js';
import { prisma } from '@discord-bot/db';
import { getGuildSettings, getOrCreateUser, getGuildLanguage } from '../../utils/guild.js';
import { COLORS, XP, xpForLevel } from '@discord-bot/shared';
import { t } from '../../utils/i18n.js';

const xpCooldowns = new Map<string, number>();

/** Handles XP gain from messages for the leveling system. */
export async function handleLevelingXp(message: Message, client: Client): Promise<void> {
  if (!message.guild) return;

  const settings = await getGuildSettings(message.guild.id);
  if (!settings.leveling.enabled) return;

  if (settings.leveling.noXpChannels.includes(message.channel.id)) return;
  if (message.member?.roles.cache.some((r) => settings.leveling.noXpRoles.includes(r.id))) return;

  const key = `${message.guild.id}:${message.author.id}`;
  const now = Date.now();
  const last = xpCooldowns.get(key);
  if (last && now - last < XP.COOLDOWN_MS) return;
  xpCooldowns.set(key, now);

  const xpGain = Math.floor(
    (Math.random() * (XP.MAX_PER_MESSAGE - XP.MIN_PER_MESSAGE) + XP.MIN_PER_MESSAGE) *
      settings.leveling.xpRate,
  );

  const user = await getOrCreateUser(message.author.id, message.guild.id);
  const newXp = user.xp + xpGain;

  let newLevel = user.level;
  let xpForNext = xpForLevel(newLevel);
  let totalXpUsed = 0;
  for (let i = 0; i < newLevel; i++) {
    totalXpUsed += xpForLevel(i);
  }
  let remainingXp = newXp - totalXpUsed;

  while (remainingXp >= xpForNext) {
    remainingXp -= xpForNext;
    newLevel++;
    xpForNext = xpForLevel(newLevel);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { xp: newXp, level: newLevel },
  });

  if (newLevel > user.level) {
    const lang = await getGuildLanguage(message.guild.id);
    await sendLevelUpMessage(message, client, newLevel, lang, settings);
    await assignLevelRoles(message, newLevel);
  }
}

/** Sends a level up notification. */
async function sendLevelUpMessage(
  message: Message,
  _client: Client,
  level: number,
  lang: 'en' | 'de',
  settings: Awaited<ReturnType<typeof getGuildSettings>>,
): Promise<void> {
  const text = t(lang, 'level.up', {
    user: `<@${message.author.id}>`,
    level: level.toString(),
  });

  const embed = new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setDescription(text)
    .setTimestamp();

  if (settings.leveling.levelUpDm) {
    try {
      await message.author.send({ embeds: [embed] });
    } catch {
      /* DMs may be disabled */
    }
  } else if (settings.leveling.levelUpChannel) {
    const channel = message.guild?.channels.cache.get(settings.leveling.levelUpChannel) as TextChannel | undefined;
    if (channel) {
      await channel.send({ embeds: [embed] });
    }
  } else if ('send' in message.channel) {
    await message.channel.send({ embeds: [embed] });
  }
}

/** Assigns level roles when a user reaches the required level. */
async function assignLevelRoles(message: Message, level: number): Promise<void> {
  if (!message.guild || !message.member) return;

  const levelRoles = await prisma.levelRole.findMany({
    where: { guildId: message.guild.id, level: { lte: level } },
  });

  for (const lr of levelRoles) {
    try {
      if (!message.member.roles.cache.has(lr.roleId)) {
        await message.member.roles.add(lr.roleId);
      }
    } catch {
      console.warn(`[Leveling] Failed to add role ${lr.roleId} to ${message.author.id}`);
    }
  }
}
