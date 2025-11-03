export enum Locale {
  EN = 'en',
  ES = 'es',
  FR = 'fr',
  DE = 'de',
  RU = 'ru',
}

export const SUPPORTED_LOCALES = Object.values(Locale);

export const LOCALE_NAMES: Record<Locale, string> = {
  [Locale.EN]: 'English',
  [Locale.ES]: 'Spanish',
  [Locale.FR]: 'French',
  [Locale.DE]: 'German',
  [Locale.RU]: 'Russian',
};
