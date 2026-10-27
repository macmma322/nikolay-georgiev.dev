/** The /setup page: hardware, environment, decisions and roadmap. */
export const setup = {
  eyebrow: { en: 'Setup', bg: 'Техника' },
  title: { en: 'Beyond the code', bg: 'Отвъд кода' },
  lede: {
    en: 'The machines, microphones and boards behind the projects on this site: what I use, why I chose it, where it falls short, and what comes next. Every part is marked by where its details come from.',
    bg: 'Компютрите, микрофоните и платките зад проектите на този сайт: какво използвам, защо го избрах, къде не стига и какво предстои. При всяка част е отбелязано откъде идват данните за нея.',
  },
  disclosure: {
    en: 'Equipment listed reflects my personal setup and purchases. This page is not sponsored, and I have no paid affiliation with the manufacturers mentioned.',
    bg: 'Показаното оборудване е част от личната ми конфигурация или от планираните ми покупки. Страницата не е спонсорирана и нямам платени партньорства с посочените производители.',
  },
  hint: {
    en: 'Point at a project tag on any part to light everything that project runs on.',
    bg: 'Посочете етикет на проект при която и да е част, за да светне всичко, на което работи проектът.',
  },
  use: {
    'in-use': { en: 'In use', bg: 'В употреба' },
    spare: { en: 'Owned, no role yet', bg: 'Налично, без роля' },
    planned: { en: 'Planned, not bought', bg: 'Планирано, не е купено' },
  },
  source: {
    machine: { en: 'Read from the machine', bg: 'Прочетено от системата' },
    docs: { en: 'Measured in project docs', bg: 'Измерено в документацията' },
    owner: { en: 'Stated by me', bg: 'По мои данни' },
  },
  manufacturer: { en: 'Manufacturer page', bg: 'Страница на производителя' },
  usedFor: { en: 'Used for', bg: 'Използва се за' },
  chain: {
    label: { en: 'Signal chain', bg: 'Път на сигнала' },
    steps: [
      { en: 'RØDE Procaster', bg: 'RØDE Procaster' },
      { en: 'XLR cable', bg: 'XLR кабел' },
      { en: 'Scarlett 2i2: preamp and gain', bg: 'Scarlett 2i2: предусилвател и усилване' },
      { en: 'USB to Windows', bg: 'USB към Windows' },
      {
        en: 'Calls, recordings, J.A.R.V.I.S. voice tests',
        bg: 'Разговори, записи, гласови тестове на J.A.R.V.I.S.',
      },
    ],
  },
  lanes: {
    label: { en: 'Expansion slots', bg: 'Слотове за разширение' },
    board: { en: 'X570 board', bg: 'Платка X570' },
    wifi: { en: 'Wi-Fi 7 card · PCIe ×1', bg: 'Карта Wi-Fi 7 · PCIe ×1' },
    usb: { en: 'USB card · PCIe 2.0 ×1', bg: 'USB карта · PCIe 2.0 ×1' },
    shared: { en: '7 ports share one lane', bg: '7 порта делят една линия' },
  },
  decisions: {
    label: { en: '07 · Decisions', bg: '07 · Решения' },
    title: { en: 'What the hardware forced me to decide', bg: 'Какво ме накара да реша хардуерът' },
    lede: {
      en: 'Four decisions where the limits of this setup shaped the software. Every number was measured and written down in the project at the time.',
      bg: 'Четири решения, при които ограниченията на техниката оформиха софтуера. Всяко число е измерено и записано в проекта по време на работата.',
    },
    steps: [
      { en: 'Problem', bg: 'Проблем' },
      { en: 'Decision', bg: 'Решение' },
      { en: 'Implementation', bg: 'Реализация' },
      { en: 'Trade-offs', bg: 'Компромиси' },
      { en: 'Result', bg: 'Резултат' },
      { en: 'Lesson', bg: 'Поука' },
    ],
    caseStudy: { en: 'Case study', bg: 'Проект' },
  },
  tools: {
    label: { en: '08 · Environment', bg: '08 · Среда' },
    title: { en: 'The software around the hardware', bg: 'Софтуерът около хардуера' },
    lede: {
      en: 'Read from this machine, with how often each tool is actually used. My working rules for AI coding agents are published as an MIT-licensed blueprint.',
      bg: 'Прочетено от този компютър, с това колко често се използва всеки инструмент. Правилата ми за работа с AI агенти са публикувани като шаблон под лиценз MIT.',
    },
    usage: {
      daily: { en: 'Every day', bg: 'Всеки ден' },
      project: { en: 'For one project', bg: 'За конкретен проект' },
      idle: { en: 'Installed, not used', bg: 'Инсталирано, не се ползва' },
    },
    blueprint: { en: 'The developer blueprint', bg: 'Правилата за разработка' },
  },
  roadmap: {
    label: { en: '09 · Roadmap', bg: '09 · Пътна карта' },
    title: { en: 'Where it is going', bg: 'Накъде отива' },
    lede: {
      en: 'Goals, not promises. Only the first column exists today.',
      bg: 'Цели, а не обещания. Днес съществува само първата колона.',
    },
    stages: {
      operational: { en: 'Working now', bg: 'Работи сега' },
      building: { en: 'In development', bg: 'В разработка' },
      planned: { en: 'Planned', bg: 'Планирано' },
      vision: { en: 'Long term', bg: 'В дългосрочен план' },
    },
  },
  next: {
    title: { en: 'See what it built', bg: 'Вижте какво е създадено с нея' },
    work: { en: 'Case studies', bg: 'Проекти' },
    openSource: { en: 'Developer blueprint', bg: 'Правила за разработка' },
  },
} as const satisfies Record<string, unknown>;
