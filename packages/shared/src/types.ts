/** Supported languages for the bot. */
export type Language = 'en' | 'de';

/** Moderation action types. */
export type ModerationAction = 'ban' | 'kick' | 'mute' | 'unmute' | 'warn' | 'clear';

/** Ticket status types. */
export type TicketStatus = 'open' | 'closed';

/** Reaction role mode types. */
export type ReactionRoleMode = 'single' | 'multi';

/** Log event categories for the logging system. */
export type LogCategory =
  | 'message_edit'
  | 'message_delete'
  | 'member_join'
  | 'member_leave'
  | 'voice_join'
  | 'voice_leave'
  | 'ban'
  | 'kick'
  | 'mute'
  | 'channel_update'
  | 'role_update';

/** Guild settings structure stored as JSON in the database. */
export interface GuildSettings {
  moderation: {
    enabled: boolean;
    logChannelId: string | null;
    bannedWords: string[];
    linkWhitelist: string[];
    linkBlacklist: string[];
    spamDetection: boolean;
    warnThreshold: number;
    warnAction: 'mute' | 'kick' | 'ban';
  };
  welcome: {
    enabled: boolean;
    channelId: string | null;
    message: string;
    imageEnabled: boolean;
    autoRoles: string[];
  };
  tickets: {
    enabled: boolean;
    supportRoleId: string | null;
    logChannelId: string | null;
    categories: string[];
  };
  leveling: {
    enabled: boolean;
    xpRate: number;
    noXpChannels: string[];
    noXpRoles: string[];
    levelUpChannel: string | null;
    levelUpDm: boolean;
  };
  music: {
    allowedChannels: string[];
    defaultVolume: number;
    djRoleId: string | null;
  };
  logs: Record<LogCategory, string | null>;
  reactionRoles: {
    enabled: boolean;
  };
}

/** Default guild settings. */
export const DEFAULT_GUILD_SETTINGS: GuildSettings = {
  moderation: {
    enabled: false,
    logChannelId: null,
    bannedWords: [],
    linkWhitelist: [],
    linkBlacklist: [],
    spamDetection: false,
    warnThreshold: 3,
    warnAction: 'mute',
  },
  welcome: {
    enabled: false,
    channelId: null,
    message: 'Welcome {user} to {server}! You are member #{membercount}.',
    imageEnabled: false,
    autoRoles: [],
  },
  tickets: {
    enabled: false,
    supportRoleId: null,
    logChannelId: null,
    categories: ['general', 'support', 'report'],
  },
  leveling: {
    enabled: false,
    xpRate: 1,
    noXpChannels: [],
    noXpRoles: [],
    levelUpChannel: null,
    levelUpDm: false,
  },
  music: {
    allowedChannels: [],
    defaultVolume: 50,
    djRoleId: null,
  },
  logs: {
    message_edit: null,
    message_delete: null,
    member_join: null,
    member_leave: null,
    voice_join: null,
    voice_leave: null,
    ban: null,
    kick: null,
    mute: null,
    channel_update: null,
    role_update: null,
  },
  reactionRoles: {
    enabled: false,
  },
};
