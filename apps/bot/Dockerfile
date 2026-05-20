FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9.15.1 --activate
RUN apt-get update && apt-get install -y openssl libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev build-essential g++ python3 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/bot/package.json ./apps/bot/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/bot/node_modules ./apps/bot/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
RUN pnpm --filter @discord-bot/db generate
RUN pnpm --filter @discord-bot/bot build

FROM base AS runner
WORKDIR /app
COPY --from=build /app/apps/bot/dist ./apps/bot/dist
COPY --from=build /app/apps/bot/node_modules ./apps/bot/node_modules
COPY --from=build /app/packages/db ./packages/db
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/bot/package.json ./apps/bot/
COPY --from=build /app/package.json ./

CMD ["node", "apps/bot/dist/index.js"]
