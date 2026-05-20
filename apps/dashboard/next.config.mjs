/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
      },
    ],
  },
  transpilePackages: ['@discord-bot/shared', '@discord-bot/db'],
};

export default nextConfig;
