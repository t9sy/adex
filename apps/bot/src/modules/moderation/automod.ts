import { type Message, type Client, EmbedBuilder, type TextChannel } from 'discord.js';
import { getGuildSettings } from '../../utils/guild.js';
import { COLORS } from '@discord-bot/shared';

const spamMap = new Map<string, { count: number; lastMessage: number }>();

/** Handles auto-moderation for incoming messages. */
export async function handleAutoModeration(message: Message, _client: Client): Promise<void> {
  if (!message.guild || !message.member) return;
  if (message.member.permissions.has('ManageMessages')) return;

  const settings = await getGuildSettings(message.guild.id);
  if (!settings.moderation.enabled) return;

  const content = message.content.toLowerCase();

  const sendable = 'send' in message.channel ? message.channel : null;

  if (settings.moderation.bannedWords.length > 0) {
    const hasBannedWord = settings.moderation.bannedWords.some((word) =>
      content.includes(word.toLowerCase()),
    );
    if (hasBannedWord) {
      await message.delete().catch(() => {});
      if (!sendable) return;
      await sendable.send({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription(`${message.author}, your message contained a banned word.`)
            .setTimestamp(),
        ],
      });
      await logModAction(message, 'Banned word detected');
      return;
    }
  }

  const urlRegex = /https?:\/\/[^\s]+/gi;
  const urls = content.match(urlRegex);
  if (urls && settings.moderation.linkBlacklist.length > 0) {
    const hasBlacklistedLink = urls.some((url) =>
      settings.moderation.linkBlacklist.some((bl) => url.includes(bl.toLowerCase())),
    );
    if (hasBlacklistedLink) {
      await message.delete().catch(() => {});
      if (!sendable) return;
      await sendable.send({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription(`${message.author}, that link is not allowed.`)
            .setTimestamp(),
        ],
      });
      await logModAction(message, 'Blacklisted link');
      return;
    }
  }

  if (settings.moderation.spamDetection) {
    const key = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    const spam = spamMap.get(key) ?? { count: 0, lastMessage: 0 };

    if (now - spam.lastMessage < 2000) {
      spam.count++;
    } else {
      spam.count = 1;
    }
    spam.lastMessage = now;
    spamMap.set(key, spam);

    if (spam.count >= 5) {
      await message.delete().catch(() => {});
      if (!sendable) return;
      await sendable.send({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription(`${message.author}, please slow down! Spam detected.`)
            .setTimestamp(),
        ],
      });
      spamMap.delete(key);
      await logModAction(message, 'Spam detected');
    }
  }
}

/** Logs an auto-moderation action to the configured log channel. */
async function logModAction(message: Message, reason: string): Promise<void> {
  if (!message.guild) return;

  const settings = await getGuildSettings(message.guild.id);
  const logChannelId = settings.moderation.logChannelId;
  if (!logChannelId) return;

  const channel = message.guild.channels.cache.get(logChannelId) as TextChannel | undefined;
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(COLORS.WARNING)
    .setTitle('Auto-Moderation')
    .setDescription(`Action taken against ${message.author.tag}`)
    .addFields(
      { name: 'Reason', value: reason },
      { name: 'Channel', value: `${message.channel}` },
      { name: 'Content', value: message.content.slice(0, 1024) || '*empty*' },
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}
