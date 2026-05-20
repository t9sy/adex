import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
} from 'discord.js';
import { getGuildLanguage } from '../../utils/guild.js';
import { replySuccess, replyError } from '../../utils/embeds.js';
import { t } from '../../utils/i18n.js';
import type { BotCommand } from '../../utils/types.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('translate')
    .setDescription('Translate text to another language')
    .addStringOption((opt) => opt.setName('text').setDescription('Text to translate').setRequired(true))
    .addStringOption((opt) =>
      opt
        .setName('language')
        .setDescription('Target language (e.g. EN, DE, FR, ES)')
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    if (!interaction.guild) return;
    await interaction.deferReply();

    const lang = await getGuildLanguage(interaction.guild.id);
    const text = interaction.options.getString('text', true);
    const targetLang = interaction.options.getString('language', true).toUpperCase();

    const deeplKey = process.env.DEEPL_API_KEY;

    if (deeplKey) {
      try {
        const response = await fetch('https://api-free.deepl.com/v2/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            auth_key: deeplKey,
            text,
            target_lang: targetLang,
          }),
        });

        const data = (await response.json()) as { translations: Array<{ text: string }> };
        const translated = data.translations[0]?.text ?? 'Translation failed.';

        await replySuccess(
          interaction,
          'Translation',
          t(lang, 'translate.result', { lang: targetLang, text: translated }),
        );
        return;
      } catch {
        /* fall through to libre */
      }
    }

    try {
      const response = await fetch('https://libretranslate.de/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: 'auto',
          target: targetLang.toLowerCase().slice(0, 2),
        }),
      });

      const data = (await response.json()) as { translatedText: string };

      await replySuccess(
        interaction,
        'Translation',
        t(lang, 'translate.result', { lang: targetLang, text: data.translatedText }),
      );
    } catch {
      await replyError(interaction, 'Error', 'Translation service is currently unavailable.');
    }
  },
};

export default command;
