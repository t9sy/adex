import { initTRPC, TRPCError } from '@trpc/server';
import { auth } from '@/lib/auth';
import superjson from 'superjson';

interface Context {
  session: Awaited<ReturnType<typeof auth>> | null;
}

export async function createContext(): Promise<Context> {
  const session = await auth();
  return { session };
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});
