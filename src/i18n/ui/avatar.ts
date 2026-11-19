import type { L } from '@/i18n';

export const avatar = {
  motion: { en: 'Character motion', bg: 'Движение на героя' },
  sceneStreet: { en: 'Scene: Street', bg: 'Сцена: Улица' },
  sceneCafe: { en: 'Scene: Café', bg: 'Сцена: Кафене' },
  switchToCafe: {
    en: 'Change footer scene to Café',
    bg: 'Превключи сцената във футъра към Кафене',
  },
  switchToStreet: {
    en: 'Change footer scene to Street',
    bg: 'Превключи сцената във футъра към Улица',
  },
  dismiss: { en: 'Dismiss remark', bg: 'Скрий репликата' },
  lines: {
    hero: { en: 'Back at the bench.', bg: 'Пак на работната маса.' },
    caelora: { en: 'Just one more valley.', bg: 'Само още една долина.' },
    jarvis: { en: 'Let me read that again.', bg: 'Я да го прочета пак.' },
    kobait: { en: 'Still on the bench.', bg: 'Още е на стенда.' },
    lab: { en: 'It worked locally.', bg: 'При мен си работеше.' },
    setup: { en: 'The cables can wait.', bg: 'Кабелите могат да почакат.' },
    contact: { en: 'One second.', bg: 'Секунда само.' },
    music: { en: 'Good choice.', bg: 'Добър избор.' },
  },
} as const satisfies Record<string, L | Record<string, L>>;
