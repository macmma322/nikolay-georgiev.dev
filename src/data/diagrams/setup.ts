import type { Diagram } from '@/lib/diagram';

/**
 * The setup ecosystem on /setup: which machines and kit each project really
 * uses (src/data/setup.ts and the case studies). It shows relationships, not
 * a network: no addresses, links between machines or services are implied.
 * Dashed nodes are owned but idle, or not bought.
 */
export const setupEcosystem: Diagram = {
  id: 'setup-ecosystem',
  title: { en: 'Machines, kit and projects', bg: 'Машини, техника и проекти' },
  caption: {
    en: 'The main workstation builds and runs every project. The Linux laptop is where J.A.R.V.I.S. learned to run outside Windows; the audio chain carries its voice tests; the electronics bench is where KObait is built and tested. The secondary PC and the camera are dashed: one is owned but has no role yet, the other is not bought.',
    bg: 'Основната работна станция компилира и изпълнява всеки проект. На лаптопа с Linux J.A.R.V.I.S. се научи да работи извън Windows; звуковата верига носи гласовите му тестове; на работната маса за електроника се сглобява и изпитва KObait. Вторият компютър и фотоапаратът са пунктирани: единият е наличен, но още няма роля, другият не е купен.',
  },
  cols: 5,
  rows: 3,
  nodes: [
    {
      id: 'audio',
      label: { en: 'Audio chain', bg: 'Звукова верига' },
      sub: { en: 'Procaster, Scarlett\n2i2', bg: 'Procaster, Scarlett\n2i2' },
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
      sub: { en: 'Ubuntu Linux,\nportable work', bg: 'Ubuntu Linux,\nработа навън' },
      kind: 'hardware',
      col: 3,
      row: 0,
    },
    {
      id: 'bench',
      label: { en: 'Electronics bench', bg: 'Маса за електроника' },
      sub: { en: 'embedded, radio,\nsensors, motors', bg: 'вградени системи,\nрадио, сензори' },
      kind: 'hardware',
      col: 4,
      row: 0,
    },
    {
      id: 'jarvis',
      label: { en: 'J.A.R.V.I.S.', bg: 'J.A.R.V.I.S.' },
      sub: { en: 'local model on\nthe RTX 3080', bg: 'локален модел\nна RTX 3080' },
      kind: 'service',
      col: 0,
      row: 1,
    },
    {
      id: 'caelora',
      label: { en: 'Caelora', bg: 'Caelora' },
      sub: { en: 'Unity 6, Windows\nbuilds', bg: 'Unity 6, версии\nза Windows' },
      kind: 'service',
      col: 1,
      row: 1,
    },
    {
      id: 'web',
      label: { en: 'USS X · Zone 32-19', bg: 'USS X · Zone 32-19' },
      sub: {
        en: 'local PostgreSQL,\nDocker, Playwright',
        bg: 'локален PostgreSQL,\nDocker, Playwright',
      },
      kind: 'service',
      col: 2,
      row: 1,
    },
    {
      id: 'kobait',
      label: { en: 'KObait', bg: 'KObait' },
      sub: { en: 'firmware for\ntwo boards', bg: 'фърмуер за\nдве платки' },
      kind: 'firmware',
      col: 4,
      row: 1,
    },
    {
      id: 'secondary',
      label: { en: 'Secondary PC', bg: 'Втори компютър' },
      sub: {
        en: 'i7-4790K, GTX 1080 Ti;\nno role yet',
        bg: 'i7-4790K, GTX 1080 Ti;\nбез роля засега',
      },
      kind: 'hardware',
      col: 0,
      row: 2,
      colSpan: 2,
      planned: true,
      tag: { en: 'Owned, idle', bg: 'Налично' },
    },
    {
      id: 'homelab',
      label: { en: 'Home lab', bg: 'Домашен сървър' },
      sub: { en: 'Docker, backups,\na CI runner', bg: 'Docker, архиви,\nCI агент' },
      kind: 'service',
      col: 2,
      row: 2,
      planned: true,
    },
    {
      id: 'camera',
      label: { en: 'Sony a6400', bg: 'Sony a6400' },
      sub: { en: 'video for demos', bg: 'видео за демо' },
      kind: 'hardware',
      col: 4,
      row: 2,
      planned: true,
    },
  ],
  edges: [
    { from: 'main', to: 'caelora', fromSide: 'bottom', toSide: 'top', fromOffset: -60 },
    { from: 'main', to: 'web', fromSide: 'bottom', toSide: 'top', fromOffset: 60 },
    { from: 'audio', to: 'jarvis', fromSide: 'bottom', toSide: 'top', toOffset: -30 },
    {
      from: 'main',
      to: 'jarvis',
      fromSide: 'bottom',
      toSide: 'top',
      fromOffset: -130,
      toOffset: 30,
    },
    { from: 'bench', to: 'kobait', fromSide: 'bottom', toSide: 'top' },
    { from: 'secondary', to: 'homelab', dashed: true },
  ],
  tiers: [
    {
      label: { en: 'Hardware', bg: 'Хардуер' },
      nodes: ['main', 'laptop', 'audio', 'bench'],
    },
    {
      label: { en: 'Projects', bg: 'Проекти' },
      nodes: ['jarvis', 'caelora', 'web', 'kobait'],
    },
    {
      label: { en: 'Not in use yet', bg: 'Още не се използва' },
      nodes: ['secondary', 'homelab', 'camera'],
    },
  ],
};
