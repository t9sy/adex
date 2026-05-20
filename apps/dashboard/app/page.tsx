import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold text-foreground">Discord Bot</h1>
        <p className="text-xl text-muted-foreground max-w-lg">
          A powerful, feature-rich Discord bot with moderation, leveling, economy, music, and more.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            Login with Discord
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md border border-border px-6 py-3 text-sm font-medium text-foreground shadow-sm hover:bg-accent transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
