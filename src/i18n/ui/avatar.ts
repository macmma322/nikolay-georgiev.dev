import type { L } from '@/i18n';

export const avatar = {
  motion: { en: 'Character motion', bg: 'Движение на героя' },
  dismiss: { en: 'Dismiss remark', bg: 'Скрий репликата' },
  lines: {
    hero: { en: 'Back at the bench.', bg: 'Пак на работната маса.' },
    caelora: { en: 'Just one more valley.', bg: 'Само още една долина.' },
    jarvis: { en: 'Let me read that again.', bg: 'Я да го прочета пак.' },
    lab: { en: 'It worked locally.', bg: 'При мен си работеше.' },
    setup: { en: 'The cables can wait.', bg: 'Кабелите могат да почакат.' },
    contact: { en: 'One second.', bg: 'Секунда само.' },
    music: { en: 'Good choice.', bg: 'Добър избор.' },
  },
} as const satisfies Record<string, L | Record<string, L>>;
