import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type Client,
  ChannelType,
} from 'discord.js';
import { getGuildLanguage } from '../../utils/guild.js';
import { replySuccess, replyError } from '../../utils/embeds.js';
import { t } from '../../utils/i18n.js';
import type { BotCommand } from '../../utils/types.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Delete messages from the channel')
    .addIntegerOption((opt) =>
      opt.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    if (!interaction.guild || !interaction.channel) return;
    if (interaction.channel.type !== ChannelType.GuildText) return;

    const amount = interaction.options.getInteger('amount', true);
    const lang = await getGuildLanguage(interaction.guild.id);

    try {
      const deleted = await interaction.channel.bulkDelete(amount, true);
      await replySuccess(
        interaction,
        'Clear',
        t(lang, 'clear.success', { count: deleted.size.toString() }),
      );
    } catch {
      await replyError(interaction, 'Error', t(lang, 'clear.error'));
    }
  },
};

export default command;
