import resolveAcceptLanguage from 'resolve-accept-language';

import messages_en_GB from '../lang/compiled/en-GB.json';

export const DEFAULT_LOCALE = 'en-GB';

const MESSAGES: Record<string, string> = {
  [DEFAULT_LOCALE]: messages_en_GB,
};

export function getIntlMessages(locale: string) {
  return MESSAGES[locale];
}

export function getLocale(
  acceptLanguage?: string | null,
  supportedLocales: string[] = [DEFAULT_LOCALE],
  defaultLocale: string = DEFAULT_LOCALE
) {
  try {
    return resolveAcceptLanguage(
      acceptLanguage ?? '',
      supportedLocales,
      defaultLocale
    );
  } catch (e) {
    console.error(`Error parsing accept language:`, e.message);
    return DEFAULT_LOCALE;
  }
}
