import type { Diagram } from '@/lib/diagram';

/**
 * Sources: Stemini-Core-API, Stemini-AI-Worker, Stemini-Slicing-Worker,
 * Stemini-Bridge (main and dev), ussone-academy-main database/migrations/2001.
 * Layout: the two AI-worker dispatches are drawn as two frames with the
 * person between them; the mesh phase steps down a row, after approval.
 */
export const steminiPipeline: Diagram = {
  id: 'stemini-pipeline',
  title: { en: 'From prompt to printer', bg: 'От промпт до принтер' },
  caption: {
    en: 'Generation runs as two dispatches to the AI worker with a person in between: the cheap concept image must be approved before the paid mesh step runs. Every request reserves tokens up front and settles exactly once. After slicing, the server alone picks the delivery lane; the cloud lane records a deferred attempt and never reports a fake success.',
    bg: 'Генерирането протича в две извиквания на AI процеса с човек между тях: евтиното концептуално изображение трябва да бъде одобрено, преди да започне платеното генериране на 3D мрежата. Всяка заявка резервира токени предварително и се урежда точно веднъж. След слайсването само сървърът избира канала за доставка; облачният канал записва отложен опит и никога не отчита мним успех.',
  },
  cols: 5,
  rows: 5,
  groups: [
    { label: { en: 'Concept phase', bg: 'Концепция' }, col: 1, row: 0, colSpan: 2, rowSpan: 1 },
    { label: { en: 'Mesh phase', bg: '3D мрежа' }, col: 3, row: 1, colSpan: 2, rowSpan: 1 },
  ],
  nodes: [
    {
      id: 'prompt',
      label: { en: 'Prompt', bg: 'Промпт' },
      sub: {
        en: 'text, or an image\nupload (in progress)',
        bg: 'текст или качено\nизображение (в работа)',
      },
      kind: 'client',
      col: 0,
      row: 0,
    },
    {
      id: 'optimise',
      label: { en: 'Prompt optimiser', bg: 'Оптимизатор' },
      sub: {
        en: 'LLM rewrite and\nsubject classification',
        bg: 'LLM пренаписва промпта\nи класифицира обекта',
      },
      kind: 'model',
      col: 1,
      row: 0,
    },
    {
      id: 'concept',
      label: { en: 'Concept image', bg: 'Изображение' },
      sub: {
        en: 'image model,\nprivate storage',
        bg: 'от модел за изображения,\nв непублично хранилище',
      },
      kind: 'model',
      col: 2,
      row: 0,
    },
    {
      id: 'approve',
      label: { en: 'Human approval', bg: 'Одобрение от човек' },
      sub: {
        en: 'approve or regenerate,\nup to 3 attempts',
        bg: 'одобрение или ново\nгенериране, до 3 опита',
      },
      kind: 'client',
      col: 3,
      row: 0,
      emphasis: true,
    },
    {
      id: 'mesh',
      label: { en: 'Mesh generation', bg: '3D генериране' },
      sub: {
        en: 'image-to-3D API,\npolled until done',
        bg: 'image-to-3D API,\nпроверяван до готовност',
      },
      kind: 'model',
      col: 3,
      row: 1,
    },
    {
      id: 'stl',
      label: { en: 'GLB to STL', bg: 'GLB към STL' },
      sub: {
        en: 'in-house converter,\nno dependencies',
        bg: 'собствен конвертор,\nбез зависимости',
      },
      kind: 'service',
      col: 4,
      row: 1,
    },
    {
      id: 'ledger',
      label: { en: 'Token ledger', bg: 'Регистър на токени' },
      sub: {
        en: 'reserve, then charge\nor release; row locks',
        bg: 'резервира, после списва\nили връща; заключване',
      },
      kind: 'store',
      col: 0,
      row: 2,
    },
    {
      id: 'core',
      label: { en: 'Core API', bg: 'Core API' },
      sub: {
        en: '11-state request machine,\ncapabilities, audit, lanes',
        bg: 'автомат на заявките с 11 състояния,\nправа, одит, канали',
      },
      kind: 'service',
      col: 1,
      row: 2,
      colSpan: 2,
      emphasis: true,
    },
    {
      id: 'slicer',
      label: { en: 'Slicing worker', bg: 'Процес за слайсване' },
      sub: {
        en: 'sandboxed OrcaSlicer CLI,\ntime and filament estimates',
        bg: 'изолиран OrcaSlicer CLI;\nоценява време, филамент',
      },
      kind: 'worker',
      col: 4,
      row: 2,
    },
    {
      id: 'download',
      label: { en: 'Download', bg: 'Изтегляне' },
      sub: { en: 'signed URL', bg: 'подписан URL' },
      kind: 'stage',
      col: 0,
      row: 3,
    },
    {
      id: 'operator',
      label: { en: 'Operator queue', bg: 'Опашка на оператора' },
      sub: { en: 'claim, start,\ncomplete, fail', bg: 'поемане, старт,\nзавършване, грешка' },
      kind: 'stage',
      col: 1,
      row: 3,
    },
    {
      id: 'lan',
      label: { en: 'LAN lane', bg: 'LAN канал' },
      sub: { en: 'via the local\nbridge agent', bg: 'през локалния\nмост към принтерите' },
      kind: 'stage',
      col: 2,
      row: 3,
    },
    {
      id: 'cloud',
      label: { en: 'Cloud lane', bg: 'Облачен канал' },
      sub: { en: 'records a deferred\nattempt only', bg: 'само записва\nотложен опит' },
      kind: 'stage',
      col: 3,
      row: 3,
      planned: true,
      tag: { en: 'Deferred shell', bg: 'Само заготовка' },
    },
    {
      id: 'printers',
      label: { en: '3D printers', bg: '3D принтери' },
      sub: {
        en: 'OctoPrint, Moonraker,\nPrusaLink, Bambu FTPS',
        bg: 'OctoPrint, Moonraker,\nPrusaLink, Bambu FTPS',
      },
      kind: 'hardware',
      col: 2,
      row: 4,
    },
  ],
  edges: [
    { from: 'prompt', to: 'optimise', flow: true },
    { from: 'optimise', to: 'concept', flow: true },
    { from: 'concept', to: 'approve', flow: true },
    // Offset so the arrow clears the "Mesh phase" frame label.
    {
      from: 'approve',
      to: 'mesh',
      fromSide: 'bottom',
      toSide: 'top',
      fromOffset: 40,
      toOffset: 40,
      flow: true,
    },
    { from: 'mesh', to: 'stl', flow: true },
    { from: 'stl', to: 'slicer' },
    {
      from: 'prompt',
      to: 'core',
      fromSide: 'bottom',
      toSide: 'top',
      toOffset: -100,
      label: { en: 'request', bg: 'заявка' },
    },
    { from: 'core', to: 'ledger', fromSide: 'left', toSide: 'right' },
    {
      from: 'slicer',
      to: 'core',
      fromSide: 'left',
      toSide: 'right',
      label: { en: 'sliced .3mf', bg: 'слайснат .3mf' },
    },
    { from: 'core', to: 'download', fromSide: 'bottom', toSide: 'top' },
    { from: 'core', to: 'operator', fromSide: 'bottom', toSide: 'top' },
    { from: 'core', to: 'lan', fromSide: 'bottom', toSide: 'top' },
    { from: 'core', to: 'cloud', fromSide: 'bottom', toSide: 'top', dashed: true },
    { from: 'lan', to: 'printers', label: { en: 'outbound only', bg: 'само изходящи' } },
  ],
  tiers: [
    {
      label: { en: 'Generation', bg: 'Генериране' },
      nodes: ['prompt', 'optimise', 'concept', 'approve', 'mesh', 'stl'],
    },
    { label: { en: 'Platform', bg: 'Платформа' }, nodes: ['core', 'ledger', 'slicer'] },
    {
      label: { en: 'Delivery lanes', bg: 'Канали за доставка' },
      nodes: ['download', 'operator', 'lan', 'cloud', 'printers'],
    },
  ],
};
