import type { L } from '@/i18n';

/** The 404 page body; its title and description live in seo.ts. */
export const notFound = {
  label: { en: 'Error 404', bg: 'Грешка 404' },
  title: { en: 'Nothing at this address.', bg: 'На този адрес няма нищо.' },
  lede: {
    en: 'The page may have moved during the rebuild of this site. The work, the lab and the contact details are one click away.',
    bg: 'Страницата вероятно е сменила адреса си, докато преработвах сайта. Проектите, лабораторията и контактите са на един клик оттук.',
  },
  allWork: { en: 'All work', bg: 'Всички проекти' },
} as const satisfies Record<string, L>;
