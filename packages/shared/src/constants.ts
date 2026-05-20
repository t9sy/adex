/** Embed color constants used throughout the bot. */
export const COLORS = {
  SUCCESS: 0x2ecc71,
  ERROR: 0xe74c3c,
  INFO: 0x3498db,
  WARNING: 0xf39c12,
  PRIMARY: 0x5865f2,
} as const;

/** XP constants for the leveling system. */
export const XP = {
  MIN_PER_MESSAGE: 15,
  MAX_PER_MESSAGE: 25,
  COOLDOWN_MS: 60_000,
} as const;

/** Economy constants. */
export const ECONOMY = {
  DAILY_AMOUNT: 100,
  WORK_MIN: 50,
  WORK_MAX: 200,
  WORK_COOLDOWN_MS: 3_600_000,
  STEAL_CHANCE: 0.4,
  STEAL_PENALTY_PERCENT: 0.1,
} as const;

/** Level calculation: XP needed for a given level. */
export function xpForLevel(level: number): number {
  return 5 * level * level + 50 * level + 100;
}

/** Calculate the level from total XP. */
export function levelFromXp(xp: number): number {
  let level = 0;
  let totalXpNeeded = 0;
  while (true) {
    totalXpNeeded += xpForLevel(level);
    if (xp < totalXpNeeded) return level;
    level++;
  }
}
