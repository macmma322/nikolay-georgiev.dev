import type { L } from '@/i18n';
import type { NodeKind } from '@/lib/diagram';

/**
 * Architecture diagrams (src/components/diagrams). Node tags are drawn in
 * capitals in a monospaced face inside a fixed box, so they stay short: the
 * build fails if one does not fit (src/lib/diagram.ts).
 */
export const diagram = {
  kind: {
    client: { en: 'Client', bg: 'Клиент' },
    gateway: { en: 'Gateway', bg: 'Шлюз' },
    service: { en: 'Service', bg: 'Услуга' },
    worker: { en: 'Worker', bg: 'Фонов процес' },
    store: { en: 'Store', bg: 'Хранилище' },
    queue: { en: 'Queue', bg: 'Опашка' },
    external: { en: 'External', bg: 'Външна услуга' },
    hardware: { en: 'Hardware', bg: 'Хардуер' },
    firmware: { en: 'Firmware', bg: 'Фърмуер' },
    stage: { en: 'Stage', bg: 'Етап' },
    model: { en: 'Model', bg: 'Модел' },
  } satisfies Record<NodeKind, L>,
  /** The tag of a planned node that has no tag of its own. */
  planned: { en: 'Planned', bg: 'Планирано' },
  legend: {
    built: { en: 'Implemented', bg: 'Изградено' },
    planned: { en: 'Planned or optional', bg: 'Планирано или по избор' },
    /** Visually hidden after each legend item, which links to that list. */
    seeToday: { en: ': see Today', bg: ': вижте „Днес“' },
    seeNext: { en: ': see Next', bg: ': вижте „Предстои“' },
  },
  list: {
    /**
     * Visually hidden words around the linked target of an edge in the text
     * list, where the drawing shows an arrow: "→ Tool broker" is read as
     * "connects to Tool broker". Parts, because word order differs.
     */
    to: {
      en: { before: 'connects to ', after: '' },
      bg: { before: 'към ', after: '' },
    },
    both: {
      en: { before: 'exchanges with ', after: '' },
      bg: { before: 'към ', after: ' и обратно' },
    },
    /** After an edge that is planned or optional. */
    planned: { en: 'planned or optional', bg: 'планирано или по избор' },
    /** Visually hidden after a planned node whose tag says something else. */
    plannedNode: { en: ' (planned or optional)', bg: ' (планирано или по избор)' },
  },
} as const;
