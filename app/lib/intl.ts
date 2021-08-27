import messages_en_GB from '../lang/compiled/en-GB.json';

export const DEFAULT_LOCALE = 'en-GB';

const MESSAGES: Record<string, string> = {
  [DEFAULT_LOCALE]: messages_en_GB,
};

export function getIntlMessages(locale: string) {
  return MESSAGES[locale];
}
