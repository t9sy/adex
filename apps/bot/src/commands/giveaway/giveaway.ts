import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  type TextChannel,
} from 'discord.js';
import { prisma } from '@discord-bot/db';
import { COLORS } from '@discord-bot/shared';
import { getGuildLanguage } from '../../utils/guild.js';
import { replySuccess, replyError } from '../../utils/embeds.js';
import { t } from '../../utils/i18n.js';
import type { BotCommand } from '../../utils/types.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Manage giveaways')
    .addSubcommand((sub) =>
      sub
        .setName('start')
        .setDescription('Start a giveaway')
        .addStringOption((opt) => opt.setName('duration').setDescription('Duration (e.g. 1h, 1d)').setRequired(true))
        .addStringOption((opt) => opt.setName('prize').setDescription('What to give away').setRequired(true))
        .addIntegerOption((opt) =>
          opt.setName('winners').setDescription('Number of winners').setMinValue(1).setMaxValue(20),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('end')
        .setDescription('End a giveaway early')
        .addStringOption((opt) => opt.setName('id').setDescription('Giveaway message ID').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('reroll')
        .setDescription('Reroll a giveaway')
        .addStringOption((opt) => opt.setName('id').setDescription('Giveaway message ID').setRequired(true)),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    if (!interaction.guild) return;

    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      await handleStart(interaction, client);
    } else if (sub === 'end') {
      await handleEnd(interaction, client);
    } else if (sub === 'reroll') {
      await handleReroll(interaction, client);
    }
  },
};

/** Starts a new giveaway. */
async function handleStart(interaction: ChatInputCommandInteraction, client: Client): Promise<void> {
  const lang = await getGuildLanguage(interaction.guild!.id);
  const durationStr = interaction.options.getString('duration', true);
  const prize = interaction.options.getString('prize', true);
  const winnersCount = interaction.options.getInteger('winners') ?? 1;

  const ms = parseGiveawayDuration(durationStr);
  if (!ms) {
    await replyError(interaction, 'Error', 'Invalid duration. Use format: 1h, 1d, 30m');
    return;
  }

  const endsAt = new Date(Date.now() + ms);

  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setTitle('Giveaway!')
    .setDescription(
      t(lang, 'giveaway.started', { prize }) +
        `\n\nWinners: **${winnersCount}**\nEnds: <t:${Math.floor(endsAt.getTime() / 1000)}:R>` +
        `\nHosted by: ${interaction.user}`,
    )
    .setTimestamp(endsAt);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('giveaway_enter_placeholder')
      .setLabel('Enter Giveaway')
      .setStyle(ButtonStyle.Success),
  );

  await interaction.reply({ content: 'Giveaway created!', ephemeral: true });

  const channel = interaction.channel as TextChannel;
  const msg = await channel.send({ embeds: [embed], components: [row] });

  const giveaway = await prisma.giveaway.create({
    data: {
      guildId: interaction.guild!.id,
      channelId: channel.id,
      messageId: msg.id,
      prize,
      winners: winnersCount,
      endsAt,
      hostId: interaction.user.id,
    },
  });

  row.components[0]!.setCustomId(`giveaway_enter_${giveaway.id}`);
  await msg.edit({ components: [row] });

  await client.queues.giveaway.add(
    'giveaway_end',
    { giveawayId: giveaway.id },
    { delay: ms, jobId: giveaway.id },
  );
}

/** Ends a giveaway early. */
async function handleEnd(interaction: ChatInputCommandInteraction, client: Client): Promise<void> {
  const messageId = interaction.options.getString('id', true);
  const giveaway = await prisma.giveaway.findUnique({ where: { messageId } });
  if (!giveaway || giveaway.ended) {
    await replyError(interaction, 'Error', 'Giveaway not found or already ended.');
    return;
  }

  await endGiveaway(giveaway.id, interaction.guildId ?? '', client);
  await replySuccess(interaction, 'Giveaway', 'Giveaway ended successfully!');
}

/** Rerolls a giveaway. */
async function handleReroll(interaction: ChatInputCommandInteraction, _client: Client): Promise<void> {
  const messageId = interaction.options.getString('id', true);

  const giveaway = await prisma.giveaway.findUnique({
    where: { messageId },
    include: { entries: true },
  });

  if (!giveaway) {
    await replyError(interaction, 'Error', 'Giveaway not found.');
    return;
  }

  if (giveaway.entries.length === 0) {
    await replyError(interaction, 'Error', 'No entries to reroll.');
    return;
  }

  const shuffled = [...giveaway.entries].sort(() => Math.random() - 0.5);
  const winners = shuffled.slice(0, giveaway.winners);
  const winnerMentions = winners.map((w) => `<@${w.userId}>`).join(', ');

  await replySuccess(interaction, 'Reroll', `New winners: ${winnerMentions}`);
}

/** Ends a giveaway and selects winners. */
export async function endGiveaway(giveawayId: string, guildId: string, client: Client): Promise<void> {
  const giveaway = await prisma.giveaway.findUnique({
    where: { id: giveawayId },
    include: { entries: true },
  });

  if (!giveaway || giveaway.ended) return;

  await prisma.giveaway.update({
    where: { id: giveawayId },
    data: { ended: true },
  });

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const channel = guild.channels.cache.get(giveaway.channelId) as TextChannel | undefined;
  if (!channel) return;

  if (giveaway.entries.length === 0) {
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.ERROR)
          .setTitle('Giveaway Ended')
          .setDescription('No one entered the giveaway.')
          .setTimestamp(),
      ],
    });
    return;
  }

  const shuffled = [...giveaway.entries].sort(() => Math.random() - 0.5);
  const winners = shuffled.slice(0, giveaway.winners);
  const winnerMentions = winners.map((w) => `<@${w.userId}>`).join(', ');

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle('Giveaway Ended!')
        .setDescription(`Prize: **${giveaway.prize}**\nWinners: ${winnerMentions}`)
        .setTimestamp(),
    ],
  });
}

/** Parses giveaway duration strings. */
function parseGiveawayDuration(str: string): number | null {
  const match = str.match(/^(\d+)(m|h|d)$/);
  if (!match) return null;
  const value = parseInt(match[1]!, 10);
  switch (match[2]) {
    case 'm': return value * 60_000;
    case 'h': return value * 3_600_000;
    case 'd': return value * 86_400_000;
    default: return null;
  }
}

export default command;
