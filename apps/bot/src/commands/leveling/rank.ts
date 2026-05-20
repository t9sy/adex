import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
  AttachmentBuilder,
} from 'discord.js';
import { getOrCreateUser } from '../../utils/guild.js';
import { xpForLevel } from '@discord-bot/shared';
import type { BotCommand } from '../../utils/types.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('View your or another user\'s rank card')
    .addUserOption((opt) => opt.setName('user').setDescription('The user to check')),

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    if (!interaction.guild) return;
    await interaction.deferReply();

    const target = interaction.options.getUser('user') ?? interaction.user;
    const userData = await getOrCreateUser(target.id, interaction.guild.id);

    const currentLevelXp = xpForLevel(userData.level);
    let totalXpForCurrentLevel = 0;
    for (let i = 0; i < userData.level; i++) {
      totalXpForCurrentLevel += xpForLevel(i);
    }
    const xpIntoLevel = userData.xp - totalXpForCurrentLevel;
    const progress = Math.min(Math.max(xpIntoLevel / currentLevelXp, 0), 1);

    try {
      const { createCanvas, loadImage } = await import('canvas');
      const canvas = createCanvas(800, 250);
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#2c2f33';
      ctx.fillRect(0, 0, 800, 250);

      ctx.fillStyle = '#23272a';
      ctx.fillRect(10, 10, 780, 230);

      const avatarUrl = target.displayAvatarURL({ extension: 'png', size: 128 });
      try {
        const avatar = await loadImage(avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(115, 125, 80, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 35, 45, 160, 160);
        ctx.restore();
      } catch {
        ctx.fillStyle = '#7289da';
        ctx.beginPath();
        ctx.arc(115, 125, 80, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(target.username, 220, 70);

      ctx.fillStyle = '#7289da';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(`Level ${userData.level}`, 220, 105);

      ctx.fillStyle = '#99aab5';
      ctx.font = '18px sans-serif';
      ctx.fillText(`${xpIntoLevel} / ${currentLevelXp} XP`, 220, 135);

      ctx.fillStyle = '#484b51';
      ctx.fillRect(220, 155, 540, 30);
      ctx.fillStyle = '#7289da';
      ctx.fillRect(220, 155, 540 * progress, 30);

      ctx.fillStyle = '#99aab5';
      ctx.font = '16px sans-serif';
      ctx.fillText(`Total XP: ${userData.xp} | Coins: ${userData.coins}`, 220, 210);

      const buffer = canvas.toBuffer('image/png');
      const attachment = new AttachmentBuilder(buffer, { name: 'rank.png' });
      await interaction.editReply({ files: [attachment] });
    } catch {
      await interaction.editReply({
        content: `**${target.username}** - Level ${userData.level} | XP: ${xpIntoLevel}/${currentLevelXp} | Total XP: ${userData.xp}`,
      });
    }
  },
};

export default command;
