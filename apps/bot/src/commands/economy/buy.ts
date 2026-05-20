import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
} from 'discord.js';
import { prisma } from '@discord-bot/db';
import { getGuildLanguage, getOrCreateUser } from '../../utils/guild.js';
import { replySuccess, replyError } from '../../utils/embeds.js';
import { t } from '../../utils/i18n.js';
import type { BotCommand } from '../../utils/types.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy an item from the shop')
    .addStringOption((opt) => opt.setName('item').setDescription('Name of the item to buy').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    if (!interaction.guild) return;

    const itemName = interaction.options.getString('item', true);
    const lang = await getGuildLanguage(interaction.guild.id);

    const item = await prisma.shopItem.findUnique({
      where: { guildId_name: { guildId: interaction.guild.id, name: itemName } },
    });

    if (!item) {
      await replyError(interaction, 'Error', 'Item not found in the shop.');
      return;
    }

    const user = await getOrCreateUser(interaction.user.id, interaction.guild.id);
    if (user.coins < item.price) {
      await replyError(interaction, 'Error', t(lang, 'economy.buy.insufficient'));
      return;
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { coins: user.coins - item.price },
      }),
      prisma.userInventory.upsert({
        where: {
          userId_guildId_itemId: {
            userId: interaction.user.id,
            guildId: interaction.guild.id,
            itemId: item.id,
          },
        },
        create: {
          userId: interaction.user.id,
          guildId: interaction.guild.id,
          itemId: item.id,
          quantity: 1,
        },
        update: { quantity: { increment: 1 } },
      }),
    ]);

    if (item.roleId && interaction.member) {
      try {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        await member.roles.add(item.roleId);
      } catch {
        /* role might not exist */
      }
    }

    await replySuccess(
      interaction,
      'Purchase',
      t(lang, 'economy.buy.success', { item: item.name, price: item.price.toString() }),
    );
  },
};

export default command;
