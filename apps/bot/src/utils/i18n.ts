import type { Language } from '@discord-bot/shared';
import en from '../locales/en/messages.json' with { type: 'json' };
import de from '../locales/de/messages.json' with { type: 'json' };

type TranslationMap = Record<string, string>;
const translations: Record<Language, TranslationMap> = { en, de };

/** Gets a translated string for the given key and language. */
export function t(lang: Language, key: string, vars?: Record<string, string>): string {
  const map = translations[lang] ?? translations.en;
  let text = map[key] ?? translations.en[key] ?? key;

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, v);
    }
  }

  return text;
}
