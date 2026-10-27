import type { Diagram } from '@/lib/diagram';

/**
 * The other three views of the /setup ecosystem (the fourth, Projects, is
 * setupEcosystem in ./setup). Facts come from src/data/setup.ts. Connections
 * are kinds of link only: no addresses, layout or identifiers.
 */

/** Everything I own; an inventory, so no links are drawn. */
export const setupHardware: Diagram = {
  id: 'setup-hardware',
  title: { en: 'What I own', bg: 'Какво притежавам' },
  caption: {
    en: 'Every machine and the kit around them. The secondary PC is owned but has no role yet, so it is dashed.',
    bg: 'Всички машини и техниката около тях. Вторият компютър е мой, но още няма роля, затова е пунктиран.',
  },
  cols: 5,
  rows: 2,
  nodes: [
    {
      id: 'audio',
      label: { en: 'Audio chain', bg: 'Звукова верига' },
      sub: { en: 'Procaster, PSA1+,\nScarlett 2i2', bg: 'Procaster, PSA1+,\nScarlett 2i2' },
      kind: 'hardware',
      col: 0,
      row: 0,
    },
    {
      id: 'main',
      label: { en: 'Main workstation', bg: 'Основна станция' },
      sub: {
        en: 'Ryzen 9 5900X, RTX 3080,\n64 GB, Windows 11',
        bg: 'Ryzen 9 5900X, RTX 3080,\n64 GB, Windows 11',
      },
      kind: 'hardware',
      col: 1,
      row: 0,
      colSpan: 2,
      emphasis: true,
    },
    {
      id: 'laptop',
      label: { en: 'Linux laptop', bg: 'Лаптоп с Linux' },
      sub: { en: 'Nitro AN515-52,\nUbuntu Linux', bg: 'Nitro AN515-52,\nUbuntu Linux' },
      kind: 'hardware',
      col: 3,
      row: 0,
    },
    {
      id: 'secondary',
      label: { en: 'Secondary PC', bg: 'Втори компютър' },
      sub: { en: 'i7-4790K,\nGTX 1080 Ti', bg: 'i7-4790K,\nGTX 1080 Ti' },
      kind: 'hardware',
      col: 4,
      row: 0,
      planned: true,
      tag: { en: 'Owned, idle', bg: 'Не се ползва' },
    },
    {
      id: 'displays',
      label: { en: 'Displays', bg: 'Монитори' },
      sub: { en: '2 × AOC 27G42E,\nLifter Duo arm', bg: '2 × AOC 27G42E,\nстойка Lifter Duo' },
      kind: 'hardware',
      col: 0,
      row: 1,
    },
    {
      id: 'input',
      label: { en: 'Input', bg: 'Въвеждане' },
      sub: {
        en: 'Attack X3 RGB, G502,\nStream Deck MK.2',
        bg: 'Attack X3 RGB, G502,\nStream Deck MK.2',
      },
      kind: 'hardware',
      col: 1,
      row: 1,
    },
    {
      id: 'webcam',
      label: { en: 'Webcam', bg: 'Уеб камера' },
      sub: { en: 'ROG Eye S', bg: 'ROG Eye S' },
      kind: 'hardware',
      col: 2,
      row: 1,
    },
    {
      id: 'printer',
      label: { en: 'Printer', bg: 'Принтер' },
      sub: { en: 'LaserJet Pro\nMFP M125nw', bg: 'LaserJet Pro\nMFP M125nw' },
      kind: 'hardware',
      col: 3,
      row: 1,
    },
    {
      id: 'bench',
      label: { en: 'Electronics bench', bg: 'Маса за електроника' },
      sub: { en: 'embedded, radio,\nsensors, motors', bg: 'вградени системи,\nрадио, сензори' },
      kind: 'hardware',
      col: 4,
      row: 1,
    },
  ],
  edges: [],
  tiers: [
    { label: { en: 'Machines', bg: 'Машини' }, nodes: ['main', 'laptop', 'secondary'] },
    {
      label: { en: 'Around them', bg: 'Около тях' },
      nodes: ['audio', 'displays', 'input', 'webcam', 'printer', 'bench'],
    },
  ],
};

/** How the verified kit connects: kinds of link, not a network map. */
export const setupConnections: Diagram = {
  id: 'setup-connections',
  title: { en: 'How it connects', bg: 'Как се свързва' },
  caption: {
    en: 'The kinds of connection between the kit, not a network map. The home network is one box on purpose.',
    bg: 'Видовете връзки между техниката, а не карта на мрежата. Домашната мрежа нарочно е една кутия.',
  },
  cols: 4,
  rows: 3,
  nodes: [
    {
      id: 'displays',
      label: { en: 'Displays', bg: 'Монитори' },
      sub: { en: 'two 27-inch,\nvideo cables', bg: 'два 27-инчови,\nвидеокабели' },
      kind: 'hardware',
      col: 1,
      row: 0,
    },
    {
      id: 'input',
      label: { en: 'Input', bg: 'Въвеждане' },
      sub: {
        en: 'USB: keyboard, mouse,\nStream Deck, webcam',
        bg: 'USB: клавиатура,\nмишка, Stream Deck',
      },
      kind: 'hardware',
      col: 2,
      row: 0,
    },
    {
      id: 'audio',
      label: { en: 'Audio chain', bg: 'Звукова верига' },
      sub: { en: 'Scarlett 2i2\nover USB', bg: 'Scarlett 2i2\nпрез USB' },
      kind: 'hardware',
      col: 3,
      row: 0,
    },
    {
      id: 'bench',
      label: { en: 'Electronics bench', bg: 'Маса за електроника' },
      sub: { en: 'boards over USB', bg: 'платки през USB' },
      kind: 'hardware',
      col: 0,
      row: 1,
    },
    {
      id: 'main',
      label: { en: 'Main workstation', bg: 'Основна станция' },
      sub: { en: 'USB card, Wi-Fi 7 card', bg: 'USB карта, Wi-Fi 7 карта' },
      kind: 'hardware',
      col: 1,
      row: 1,
      colSpan: 2,
      emphasis: true,
    },
    {
      id: 'printer',
      label: { en: 'Printer', bg: 'Принтер' },
      sub: { en: 'shared over\nthe network', bg: 'споделен\nпрез мрежата' },
      kind: 'hardware',
      col: 0,
      row: 2,
    },
    {
      id: 'network',
      label: { en: 'Home network', bg: 'Домашна мрежа' },
      sub: { en: 'the provider’s\nequipment', bg: 'оборудването\nна доставчика' },
      kind: 'external',
      col: 1,
      row: 2,
      colSpan: 2,
    },
    {
      id: 'laptop',
      label: { en: 'Linux laptop', bg: 'Лаптоп с Linux' },
      sub: { en: 'on its own or\nover the network', bg: 'самостоятелно или\nпрез мрежата' },
      kind: 'hardware',
      col: 3,
      row: 2,
    },
  ],
  edges: [
    { from: 'main', to: 'displays', fromSide: 'top', toSide: 'bottom', fromOffset: -60 },
    { from: 'input', to: 'main', fromSide: 'bottom', toSide: 'top', toOffset: 60 },
    { from: 'audio', to: 'main', fromSide: 'bottom', toSide: 'right', both: true },
    { from: 'bench', to: 'main', fromSide: 'right', toSide: 'left', both: true },
    { from: 'main', to: 'network', fromSide: 'bottom', toSide: 'top', both: true },
    { from: 'printer', to: 'network', fromSide: 'right', toSide: 'left', both: true },
    { from: 'laptop', to: 'network', fromSide: 'left', toSide: 'right', both: true, dashed: true },
  ],
  tiers: [
    {
      label: { en: 'At the desk', bg: 'На бюрото' },
      nodes: ['main', 'displays', 'input', 'audio', 'bench'],
    },
    { label: { en: 'On the network', bg: 'В мрежата' }, nodes: ['network', 'printer', 'laptop'] },
  ],
};

/** What is planned and what each piece would make possible. All dashed. */
export const setupFuture: Diagram = {
  id: 'setup-future',
  title: { en: 'What comes next', bg: 'Какво предстои' },
  caption: {
    en: 'Nothing here is bought. The workstation has 1 Gb/s Ethernet today, so multi-gigabit links would also need a faster network card.',
    bg: 'Нищо от това не е купено. Работната станция днес има 1 Gb/s Ethernet, така че за многогигабитови връзки ще трябва и по-бърза мрежова карта.',
  },
  cols: 5,
  rows: 2,
  nodes: [
    {
      id: 'router',
      label: { en: 'ASUS RT-BE88U', bg: 'ASUS RT-BE88U' },
      sub: { en: 'Wi-Fi 7, 10G SFP+,\n2.5G ports', bg: 'Wi-Fi 7, 10G SFP+,\nпортове 2,5G' },
      kind: 'gateway',
      col: 1,
      row: 0,
      colSpan: 2,
      planned: true,
    },
    {
      id: 'camera',
      label: { en: 'Sony a6400', bg: 'Sony a6400' },
      sub: { en: 'video for demos', bg: 'видео за демо' },
      kind: 'hardware',
      col: 4,
      row: 0,
      planned: true,
    },
    {
      id: 'main',
      label: { en: 'Main workstation', bg: 'Основна станция' },
      sub: { en: 'Wi-Fi 7 card,\n1 Gb/s Ethernet', bg: 'Wi-Fi 7 карта,\n1 Gb/s Ethernet' },
      kind: 'hardware',
      col: 0,
      row: 1,
      colSpan: 2,
      emphasis: true,
    },
    {
      id: 'homelab',
      label: { en: 'Home lab', bg: 'Домашен сървър' },
      sub: { en: 'the secondary PC:\nDocker, backups', bg: 'вторият компютър:\nDocker, архиви' },
      kind: 'service',
      col: 2,
      row: 1,
      colSpan: 2,
      planned: true,
    },
    {
      id: 'ssd',
      label: { en: 'SATA SSD', bg: 'SATA SSD' },
      sub: { en: '1 or 2 TB for\nthe secondary PC', bg: '1 или 2 TB за\nвтория компютър' },
      kind: 'store',
      col: 4,
      row: 1,
      planned: true,
    },
  ],
  edges: [
    {
      from: 'router',
      to: 'main',
      fromSide: 'bottom',
      toSide: 'top',
      fromOffset: -60,
      label: { en: 'Wi-Fi 7', bg: 'Wi-Fi 7' },
    },
    {
      from: 'router',
      to: 'homelab',
      fromSide: 'bottom',
      toSide: 'top',
      fromOffset: 60,
      label: { en: '2.5G', bg: '2.5G' },
    },
    { from: 'ssd', to: 'homelab', fromSide: 'left', toSide: 'right' },
  ],
  tiers: [
    { label: { en: 'Planned', bg: 'Планирано' }, nodes: ['router', 'homelab', 'ssd', 'camera'] },
    { label: { en: 'Already here', bg: 'Вече налично' }, nodes: ['main'] },
  ],
};
