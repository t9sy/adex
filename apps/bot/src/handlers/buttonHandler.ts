import {
  type ButtonInteraction,
  type Client,
  ChannelType,
  EmbedBuilder,
} from 'discord.js';
import { prisma } from '@discord-bot/db';
import { COLORS } from '@discord-bot/shared';

/** Routes button interactions to the appropriate handler. */
export async function handleButtonInteraction(
  interaction: ButtonInteraction,
  client: Client,
): Promise<void> {
  const customId = interaction.customId;

  if (customId === 'ticket_close') {
    await handleTicketClose(interaction);
  } else if (customId === 'ticket_transcript') {
    await handleTicketTranscript(interaction);
  } else if (customId.startsWith('giveaway_enter_')) {
    await handleGiveawayEnter(interaction);
  } else if (customId.startsWith('poll_')) {
    await handlePollVote(interaction);
  } else if (customId.startsWith('rr_')) {
    await handleReactionRole(interaction, client);
  }
}

/** Closes a ticket channel. */
async function handleTicketClose(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guildId || !interaction.channel) return;

  const ticket = await prisma.ticket.findUnique({
    where: { channelId: interaction.channelId! },
  });

  if (!ticket) {
    await interaction.reply({ content: 'This is not a ticket channel.', ephemeral: true });
    return;
  }

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: 'closed', closedAt: new Date() },
  });

  const embed = new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle('Ticket Closed')
    .setDescription(`This ticket has been closed by ${interaction.user}.`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  setTimeout(async () => {
    try {
      if (
        interaction.channel &&
        interaction.channel.type === ChannelType.GuildText &&
        interaction.channel.deletable
      ) {
        await interaction.channel.delete();
      }
    } catch {
      /* channel may already be deleted */
    }
  }, 5000);
}

/** Generates and saves a transcript for a ticket. */
async function handleTicketTranscript(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.channel) return;

  await interaction.deferReply({ ephemeral: true });

  const messages = await interaction.channel.messages.fetch({ limit: 100 });
  const transcript = messages.reverse().map((msg) => ({
    author: msg.author.tag,
    content: msg.content,
    timestamp: msg.createdAt.toISOString(),
    embeds: msg.embeds.length,
    attachments: msg.attachments.size,
  }));

  await prisma.ticket.update({
    where: { channelId: interaction.channelId! },
    data: { transcript: JSON.parse(JSON.stringify(transcript)) },
  });

  await interaction.editReply({ content: 'Transcript saved successfully.' });
}

/** Handles giveaway entry button clicks. */
async function handleGiveawayEnter(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guildId) return;
  const giveawayId = interaction.customId.replace('giveaway_enter_', '');

  const giveaway = await prisma.giveaway.findUnique({ where: { id: giveawayId } });
  if (!giveaway || giveaway.ended) {
    await interaction.reply({ content: 'This giveaway has ended.', ephemeral: true });
    return;
  }

  try {
    await prisma.giveawayEntry.create({
      data: {
        giveawayId,
        userId: interaction.user.id,
        guildId: interaction.guildId,
      },
    });
    await interaction.reply({ content: 'You have entered the giveaway!', ephemeral: true });
  } catch {
    await interaction.reply({ content: 'You have already entered this giveaway.', ephemeral: true });
  }
}

/** Handles poll vote button clicks. */
async function handlePollVote(interaction: ButtonInteraction): Promise<void> {
  await interaction.reply({
    content: `You voted for option ${interaction.customId.split('_')[1]}!`,
    ephemeral: true,
  });
}

/** Handles reaction role button clicks. */
async function handleReactionRole(interaction: ButtonInteraction, _client: Client): Promise<void> {
  if (!interaction.guildId || !interaction.member) return;

  const roleId = interaction.customId.replace('rr_', '');
  const member = interaction.guild?.members.cache.get(interaction.user.id);
  if (!member) return;

  const rrMessage = await prisma.reactionRoleMessage.findUnique({
    where: { messageId: interaction.message.id },
    include: { roles: true },
  });

  if (!rrMessage) return;

  const role = rrMessage.roles.find((r) => r.roleId === roleId);
  if (!role) return;

  try {
    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId);
      await interaction.reply({ content: `Removed role <@&${roleId}>`, ephemeral: true });
    } else {
      if (rrMessage.mode === 'single') {
        for (const r of rrMessage.roles) {
          if (member.roles.cache.has(r.roleId)) {
            await member.roles.remove(r.roleId);
          }
        }
      }
      await member.roles.add(roleId);
      await interaction.reply({ content: `Added role <@&${roleId}>`, ephemeral: true });
    }
  } catch {
    await interaction.reply({
      content: 'I could not manage your roles. Check my permissions.',
      ephemeral: true,
    });
  }
}
