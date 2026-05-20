# Discord Bot – All-in-One Monorepo

A production-ready Discord bot with a modern web dashboard. Built with TypeScript, discord.js v14, Next.js 14, Prisma, Redis, and BullMQ.

## Features

### Bot (10 Feature Categories)
- **Moderation** – `/ban`, `/kick`, `/mute`, `/unmute`, `/warn`, `/clear` + auto-moderation (spam, word filter, link filter)
- **Welcome System** – Configurable messages with variables (`{user}`, `{server}`, `{membercount}`), auto-roles
- **Ticket System** – Modal creation, private channels, transcript export
- **Reaction Roles** – Button/emoji roles with single/multi select modes
- **Leveling** – XP on messages (60s cooldown), canvas rank cards, leaderboards, level roles
- **Economy** – `/daily`, `/work`, `/steal`, `/balance`, `/pay`, `/shop`, `/buy`, coin leaderboard
- **Music** – `/play`, `/skip`, `/stop`, `/queue`, `/nowplaying`, `/volume` (YouTube/Spotify/SoundCloud)
- **Utility** – `/userinfo`, `/serverinfo`, `/poll`, `/embed`, `/remind`, `/translate`
- **Logging** – Configurable channels for message edits/deletes, member joins/leaves, voice, moderation
- **Giveaway** – `/giveaway start/end/reroll` with automatic winner selection

### Dashboard
- Discord OAuth2 login (admin-only servers)
- Per-server configuration for all modules
- Statistics page with moderation stats, leaderboards
- Dark mode with shadcn/ui components

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Bot Runtime | Node.js 20+, TypeScript, discord.js v14 |
| Database | PostgreSQL 16 (Prisma ORM) |
| Cache/Queue | Redis 7, BullMQ |
| Dashboard | Next.js 14, Tailwind CSS, shadcn/ui |
| Auth | NextAuth.js v5 (Discord OAuth2) |
| API | tRPC (type-safe) |
| DevOps | Docker, GitHub Actions |

## Project Structure

```
├── apps/
│   ├── bot/              # Discord bot
│   │   ├── src/
│   │   │   ├── commands/     # Slash commands by category
│   │   │   ├── events/       # Discord event handlers
│   │   │   ├── handlers/     # Command/event/button handlers
│   │   │   ├── modules/      # Feature modules
│   │   │   ├── jobs/         # BullMQ workers
│   │   │   └── utils/        # Helpers, i18n, embeds
│   │   └── prisma/
│   └── dashboard/        # Next.js web dashboard
│       ├── app/              # App router pages
│       ├── components/       # UI components
│       ├── lib/              # Auth, tRPC, utils
│       └── server/           # tRPC routers
├── packages/
│   ├── db/               # Prisma client (shared)
│   └── shared/           # Types, schemas, constants
├── docker-compose.yml
└── .github/workflows/
```

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker & Docker Compose (for database/redis)
- **System dependencies** (Debian/Ubuntu) for Canvas rank cards:
```bash
sudo apt-get update && sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev pkg-config python3
```

### Setup

1. **Clone and install:**
```bash
git clone <repo-url>
cd adex
pnpm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your Discord bot token and other settings
```

3. **Start services:**
```bash
docker compose up -d postgres redis
```

4. **Setup database:**
```bash
pnpm --filter @discord-bot/db generate
pnpm --filter @discord-bot/db push
```

5. **Run in development:**
```bash
# Bot
pnpm --filter @discord-bot/bot dev

# Dashboard
pnpm --filter @discord-bot/dashboard dev
```

### Docker Compose (Full Stack)

```bash
docker compose up -d
```

This starts all services:
- **Bot** – Discord bot
- **Dashboard** – Web UI at `http://localhost:3000`
- **PostgreSQL** – Database on port 5432
- **Redis** – Cache on port 6379

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_TOKEN` | Yes | Bot token from Discord Developer Portal |
| `DISCORD_CLIENT_ID` | Yes | Application Client ID |
| `DISCORD_CLIENT_SECRET` | Yes | OAuth2 Client Secret |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `NEXTAUTH_SECRET` | Yes | Random string for session encryption |
| `NEXTAUTH_URL` | Yes | Dashboard URL (e.g., `http://localhost:3000`) |
| `DEEPL_API_KEY` | No | DeepL API key for `/translate` |
| `BOT_API_SECRET` | No | Shared secret for bot↔dashboard communication |

## Development

```bash
# Lint all packages
pnpm lint

# Type check all packages
pnpm typecheck

# Build bot
pnpm build:bot

# Build dashboard
pnpm build:dashboard

# Run tests
pnpm test
```

## Deployment (Debian VPS)

1. Install Docker and Docker Compose on your VPS
2. Clone the repository
3. Copy `.env.example` to `.env` and configure all variables
4. Run `docker compose up -d`
5. The dashboard will be available on port 3000

### Sharding

For large bots (2500+ servers), enable sharding:
```env
USE_SHARDING=true
```

The bot will automatically spawn shards based on Discord's recommendation.

## i18n

Bot responses support English (EN) and German (DE). Configure per server via the dashboard or the guild language setting.

## License

Private – All rights reserved.
