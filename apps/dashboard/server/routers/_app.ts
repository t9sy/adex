import { router } from '../trpc';
import { guildRouter } from './guild';
import { moderationRouter } from './moderation';
import { welcomeRouter } from './welcome';
import { ticketRouter } from './ticket';
import { levelingRouter } from './leveling';
import { economyRouter } from './economy';
import { musicRouter } from './music';
import { logsRouter } from './logs';
import { statsRouter } from './stats';
import { reactionRolesRouter } from './reactionRoles';

export const appRouter = router({
  guild: guildRouter,
  moderation: moderationRouter,
  welcome: welcomeRouter,
  ticket: ticketRouter,
  leveling: levelingRouter,
  economy: economyRouter,
  music: musicRouter,
  logs: logsRouter,
  stats: statsRouter,
  reactionRoles: reactionRolesRouter,
});

export type AppRouter = typeof appRouter;
