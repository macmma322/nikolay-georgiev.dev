import { LOCALE_META, type Locale } from './config';
import type { L } from './index';

/** 'YYYY-MM' as the first day of that month in UTC, so no time zone shifts the month. */
function monthStart(ym: string): Date {
  const [year, month] = ym.split('-').map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, 1));
}

/**
 * ICU has no abbreviated Bulgarian month for formatting: `month: 'short'`
 * renders the numeric '08' (and month+year '08.2026 г.'). These are the
 * standard abbreviations of the Bulgarian orthographic dictionary.
 */
const BG_MONTH_SHORT = [
  'ян.',
  'февр.',
  'март',
  'апр.',
  'май',
  'юни',
  'юли',
  'авг.',
  'септ.',
  'окт.',
  'ноем.',
  'дек.',
] as const;

/** '2026-08' → short: 'Aug 2026' / 'авг. 2026'; long: 'August 2026' / 'август 2026 г.'. */
export function monthYear(ym: string, locale: Locale, style: 'short' | 'long' = 'short'): string {
  const date = monthStart(ym);
  if (locale === 'bg' && style === 'short') {
    return `${BG_MONTH_SHORT[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  }
  // en-GB abbreviates September as 'Sept'; the site writes three letters throughout.
  const intl = locale === 'en' && style === 'short' ? 'en-US' : LOCALE_META[locale].intl;
  return new Intl.DateTimeFormat(intl, { month: style, year: 'numeric', timeZone: 'UTC' }).format(
    date,
  );
}

const PRESENT: L = { en: 'present', bg: 'досега' };
const JOIN: L = { en: ' to ', bg: ' – ' };

/** '2026-08', no end → 'Aug 2026 to present' / 'авг. 2026 – досега'. */
export function period(
  start: string,
  end: string | undefined,
  locale: Locale,
  style: 'short' | 'long' = 'short',
): string {
  const to = end ? monthYear(end, locale, style) : PRESENT[locale];
  return `${monthYear(start, locale, style)}${JOIN[locale]}${to}`;
}

export function number(value: number, locale: Locale, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(LOCALE_META[locale].intl, options).format(value);
}

/**
 * Count phrases: plural(6, 'bg', { one: '{n} казус', other: '{n} казуса' }).
 * `other` is required; Bulgarian and English only use `one` and `other`.
 */
export function plural(
  count: number,
  locale: Locale,
  forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string },
): string {
  const rule = new Intl.PluralRules(LOCALE_META[locale].intl).select(count);
  return (forms[rule] ?? forms.other).replace('{n}', number(count, locale));
}
