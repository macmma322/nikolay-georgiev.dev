import type { Diagram } from '@/lib/diagram';

/**
 * Source: macmma322/Caelora integration/first-valley-v2 @ dfc7627a
 * (2026-10-22): Assets/Caelora/Core (engine-free authority, TerrainNoise,
 * Persistence/CommitCoordinator), Voxels/Pipeline/SectionPipeline,
 * Voxels/Streaming/SectionStreamer, Gameplay/Trees and Gameplay/Felling;
 * ADR-0007/0008/0009/0011/0017/0040/0041.
 * Layout: commands enter the authority on the left; world data runs right to
 * the save; the middle row is the background meshing pipeline feeding the
 * presentation; the dashed bottom row is what the authority seam enables but
 * does not exist yet.
 */
export const caeloraWorld: Diagram = {
  id: 'caelora-world',
  title: { en: 'Authority, sections and saves', bg: 'Правила, секции и записи' },
  caption: {
    en: 'Player input reaches the game only as commands. An engine-free, deterministic authority owns the world, stored as versioned voxel sections. Background jobs mesh dirty sections, and a result is accepted only if its version stamps are still current; presentation renders the accepted meshes and never writes to the authority. Living trees come from one skeleton that feeds wood, leaves, structure and collision. Only edited sections are saved, under one commit file. The dashed row is planned and not built.',
    bg: 'Действията на играча достигат играта само като команди. Детерминиран слой с правилата, независим от енджина, владее света, записан като версионирани воксел секции. Фонови задачи изграждат мрежите на променените секции, а резултатът се приема само ако версиите му още са актуални; визуализацията рисува приетите мрежи и никога не пише в правилата. Живите дървета идват от един скелет, който захранва дървесината, листата, структурата и колизиите. Записват се само променените секции, под един файл за потвърждение. Пунктираният ред е планиран и не е изграден.',
  },
  cols: 5,
  rows: 3,
  nodes: [
    {
      id: 'input',
      label: { en: 'Player input', bg: 'Действия на играча' },
      sub: { en: 'commands only', bg: 'само команди' },
      kind: 'client',
      col: 0,
      row: 0,
    },
    {
      id: 'authority',
      label: { en: 'Authority', bg: 'Правила' },
      sub: {
        en: 'engine-free, integer\nmath, keyed RNG',
        bg: 'без енджин, цели\nчисла, RNG с ключ',
      },
      kind: 'service',
      col: 1,
      row: 0,
      emphasis: true,
    },
    {
      id: 'sections',
      label: { en: 'Voxel sections', bg: 'Воксел секции' },
      sub: { en: 'versioned per\nsection', bg: 'версия за всяка\nсекция' },
      kind: 'store',
      col: 2,
      row: 0,
    },
    {
      id: 'save',
      label: { en: 'Commit coordinator', bg: 'Координатор на записа' },
      sub: {
        en: 'edited sections only,\none checksummed commit',
        bg: 'само променени секции,\nедин проверен запис',
      },
      kind: 'store',
      col: 3,
      row: 0,
      colSpan: 2,
    },
    {
      id: 'trees',
      label: { en: 'Tree skeleton', bg: 'Скелет на дървото' },
      sub: {
        en: 'one skeleton: wood,\nleaves, collision',
        bg: 'един скелет: дърво,\nлиста, колизии',
      },
      kind: 'stage',
      col: 0,
      row: 1,
    },
    {
      id: 'pipeline',
      label: { en: 'Section pipeline', bg: 'Конвейер за секции' },
      sub: {
        en: 'Burst jobs mesh\noff the main thread',
        bg: 'Burst задачи извън\nосновната нишка',
      },
      kind: 'worker',
      col: 2,
      row: 1,
      emphasis: true,
    },
    {
      id: 'stale',
      label: { en: 'Version check', bg: 'Проверка на версии' },
      sub: { en: 'stale results\nare discarded', bg: 'остарелите резултати\nсе изхвърлят' },
      kind: 'stage',
      col: 3,
      row: 1,
    },
    {
      id: 'present',
      label: { en: 'Presentation', bg: 'Визуализация' },
      sub: { en: 'Unity 6 URP;\nreads, never writes', bg: 'Unity 6 URP;\nсамо чете' },
      kind: 'client',
      col: 4,
      row: 1,
    },
    {
      id: 'server',
      label: { en: 'Headless server', bg: 'Headless сървър' },
      sub: {
        en: 'the authority runs\nwithout Unity',
        bg: 'правилата работят\nбез Unity',
      },
      kind: 'service',
      col: 1,
      row: 2,
      colSpan: 2,
      planned: true,
    },
    {
      id: 'multiplayer',
      label: { en: 'Multiplayer', bg: 'Мултиплейър' },
      sub: { en: 'no networking\ncode yet', bg: 'още няма мрежов\nкод' },
      kind: 'client',
      col: 3,
      row: 2,
      colSpan: 2,
      planned: true,
    },
  ],
  edges: [
    { from: 'input', to: 'authority', flow: true },
    { from: 'authority', to: 'sections', flow: true },
    { from: 'sections', to: 'save', flow: true },
    { from: 'authority', to: 'trees', fromSide: 'left', toSide: 'top' },
    { from: 'sections', to: 'pipeline', fromSide: 'bottom', toSide: 'top', flow: true },
    { from: 'pipeline', to: 'stale', flow: true },
    { from: 'stale', to: 'present', flow: true },
    { from: 'authority', to: 'server', fromSide: 'bottom', toSide: 'top', dashed: true },
    { from: 'server', to: 'multiplayer', dashed: true },
  ],
  tiers: [
    {
      label: { en: 'Authority', bg: 'Правила' },
      nodes: ['input', 'authority', 'sections', 'save', 'trees'],
    },
    {
      label: { en: 'Presentation', bg: 'Визуализация' },
      nodes: ['pipeline', 'stale', 'present'],
    },
    { label: { en: 'Planned', bg: 'Планирано' }, nodes: ['server', 'multiplayer'] },
  ],
};
