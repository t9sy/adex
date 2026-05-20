import { z } from 'zod';

/** Schema for moderation settings update. */
export const moderationSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  logChannelId: z.string().nullable().optional(),
  bannedWords: z.array(z.string()).optional(),
  linkWhitelist: z.array(z.string()).optional(),
  linkBlacklist: z.array(z.string()).optional(),
  spamDetection: z.boolean().optional(),
  warnThreshold: z.number().min(1).max(10).optional(),
  warnAction: z.enum(['mute', 'kick', 'ban']).optional(),
});

/** Schema for welcome settings update. */
export const welcomeSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  channelId: z.string().nullable().optional(),
  message: z.string().max(2000).optional(),
  imageEnabled: z.boolean().optional(),
  autoRoles: z.array(z.string()).optional(),
});

/** Schema for ticket settings update. */
export const ticketSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  supportRoleId: z.string().nullable().optional(),
  logChannelId: z.string().nullable().optional(),
  categories: z.array(z.string()).optional(),
});

/** Schema for leveling settings update. */
export const levelingSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  xpRate: z.number().min(0.1).max(10).optional(),
  noXpChannels: z.array(z.string()).optional(),
  noXpRoles: z.array(z.string()).optional(),
  levelUpChannel: z.string().nullable().optional(),
  levelUpDm: z.boolean().optional(),
});

/** Schema for music settings update. */
export const musicSettingsSchema = z.object({
  allowedChannels: z.array(z.string()).optional(),
  defaultVolume: z.number().min(0).max(100).optional(),
  djRoleId: z.string().nullable().optional(),
});

/** Schema for log settings update. */
export const logSettingsSchema = z.record(z.string().nullable());

/** Schema for guild general settings. */
export const guildGeneralSchema = z.object({
  language: z.enum(['en', 'de']).optional(),
  prefix: z.string().min(1).max(5).optional(),
});

/** Schema for shop item creation. */
export const shopItemSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price: z.number().min(1),
  roleId: z.string().nullable().optional(),
});

/** Schema for level role mapping. */
export const levelRoleSchema = z.object({
  level: z.number().min(1).max(100),
  roleId: z.string(),
});
