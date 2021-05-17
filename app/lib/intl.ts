import messagesEnGb from '../lang/compiled/en-GB.json';

const MESSAGES: Record<string, string> = {
  'en-GB': messagesEnGb,
};

export function getIntlMessages(locale: string) {
  return MESSAGES[locale];
}
