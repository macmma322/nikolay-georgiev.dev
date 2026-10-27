/** The Open source page and the blueprint reader. */
export const openSource = {
  eyebrow: { en: 'Open source', bg: 'Отворен код' },
  title: { en: 'Open source', bg: 'Отворен код' },
  lede: {
    en: 'What I share, what I publish, and the open-source work my projects stand on. Every license below was read from the project itself, not assumed.',
    bg: 'Какво споделям, какво публикувам и върху какъв отворен код стъпват проектите ми. Всеки лиценз по-долу е проверен в самия проект, а не предположен.',
  },
  blueprint: {
    label: { en: '01 · Developer blueprint', bg: '01 · Правила за разработка' },
    title: { en: 'My CLAUDE.md, made portable', bg: 'Моят CLAUDE.md, готов за преизползване' },
    lede: {
      en: 'The operating manual I give AI coding agents in every repository: principles, an evidence hierarchy, risk-scaled workflow, Git, testing, security and documentation rules. Project specifics and private paths are removed; machine-specific settings are placeholders. Shared for educational and development use.',
      bg: 'Наръчникът, който давам на AI агентите за програмиране във всяко хранилище: принципи, йерархия на доказателствата, работен процес според риска, Git, тестване, сигурност и документация. Подробностите за проектите и личните пътища са премахнати, а настройките за конкретна машина са заместени с полета за попълване. Споделен за обучение и разработка.',
    },
    read: { en: 'Read online', bg: 'Прочети онлайн' },
    download: { en: 'Download CLAUDE.md', bg: 'Изтегли CLAUDE.md' },
    copyLabel: { en: 'Copy CLAUDE.md as Markdown', bg: 'Копирай CLAUDE.md като Markdown' },
    source: { en: 'Source on GitHub', bg: 'Кодът в GitHub' },
    license: { en: 'MIT License', bg: 'Лиценз MIT' },
    facts: {
      format: { en: 'Format', bg: 'Формат' },
      license: { en: 'License', bg: 'Лиценз' },
      language: { en: 'Language', bg: 'Език' },
      english: { en: 'English', bg: 'Английски' },
      sections: { en: 'Sections', bg: 'Раздели' },
    },
    setupTitle: { en: 'Setup and customisation', bg: 'Настройка' },
    setup: [
      {
        en: 'Download the file and save it as CLAUDE.md in the root of a repository, or as ~/.claude/CLAUDE.md to make it your default for every project.',
        bg: 'Изтеглете файла и го запазете като CLAUDE.md в корена на хранилището или като ~/.claude/CLAUDE.md, за да важи за всеки проект.',
      },
      {
        en: 'Fill in section 0: replace every <PLACEHOLDER> with your project’s stack, branches and the exact commands for running, testing and building it.',
        bg: 'Попълнете раздел 0: заменете всяко <PLACEHOLDER> със стека, клоновете и точните команди за стартиране, тестване и компилиране на проекта.',
      },
      {
        en: 'Delete what does not apply (the frontend and motion rules in a backend repository, for example) and add the rules only your project needs. Project rules override the generic ones.',
        bg: 'Изтрийте ненужното (например правилата за интерфейс и анимация в бекенд хранилище) и добавете правилата, нужни само на вашия проект. Правилата на проекта имат предимство пред общите.',
      },
      {
        en: 'Keep it short enough to be read on every session. When a rule turns out to be wrong, change the file, not the agent’s memory.',
        bg: 'Пазете го достатъчно кратък, за да се чете при всяка сесия. Когато правило се окаже грешно, променете файла, а не паметта на агента.',
      },
    ],
    licenseNote: {
      en: 'MIT License: use, copy, modify and redistribute it, commercially or not, as long as the copyright and license notice stay with it.',
      bg: 'Лиценз MIT: можете да го използвате, копирате, променяте и разпространявате, включително с търговска цел, стига бележката за авторското право и лиценза да остане с него.',
    },
    fullLicense: { en: 'Full license text', bg: 'Пълен текст на лиценза' },
  },
  repos: {
    label: { en: '02 · My open source', bg: '02 · Моят отворен код' },
    title: { en: 'Public repositories', bg: 'Публични хранилища' },
    lede: {
      en: 'Public repositories I own or contribute to, with the license GitHub reports for each. Most of my larger systems are private; their case studies say so.',
      bg: 'Публичните хранилища, които притежавам или в които участвам, с лиценза, който GitHub отчита за всяко. Повечето от по-големите ми системи са частни и проектите им го казват.',
    },
    groups: {
      original: { en: 'Original projects', bg: 'Собствени проекти' },
      fork: { en: 'Forks', bg: 'Разклонения (forks)' },
      contribution: { en: 'Contributions', bg: 'Принос към чужди проекти' },
    },
    none: {
      en: 'Nothing to list yet.',
      bg: 'Засега няма какво да се покаже.',
    },
    noLicense: {
      en: 'No license: all rights reserved, read-only',
      bg: 'Без лиценз: всички права запазени, само за четене',
    },
    build: { en: 'Build instructions in the README', bg: 'Инструкции за компилиране в README' },
    forkOf: { en: 'Fork of', bg: 'Разклонение на' },
    updated: { en: 'Updated', bg: 'Обновено' },
  },
  credits: {
    label: { en: '03 · Built with', bg: '03 · Изградено с' },
    title: { en: 'Credits and licenses', bg: 'Благодарности и лицензи' },
    lede: {
      en: 'The open-source projects and third-party tools that carry the most weight in my work, with their authors and licenses. “Used” means the code ships or runs in the project; “reference” means it informed the design and none of its code is included. Listing a project implies no endorsement or affiliation.',
      bg: 'Проектите с отворен код и външните инструменти, които носят най-голяма тежест в работата ми, с авторите и лицензите им. „Използван“ означава, че кодът е част от проекта или работи в него; „ориентир“ – че е повлиял на дизайна, без да е включен негов код. Изброяването не означава одобрение или връзка с авторите.',
    },
    used: { en: 'Used', bg: 'Използван' },
    reference: { en: 'Reference', bg: 'Ориентир' },
    by: { en: 'by', bg: 'от' },
    caseStudy: { en: 'Case study', bg: 'Проект' },
    /** The block under a case study's stack. */
    builtWith: { en: 'Built with and credits', bg: 'Изградено с и благодарности' },
    all: { en: 'All credits and licenses', bg: 'Всички благодарности и лицензи' },
    caption: { en: 'Credits for', bg: 'Благодарности за' },
    cols: {
      project: { en: 'Project', bg: 'Проект' },
      license: { en: 'License', bg: 'Лиценз' },
      use: { en: 'How it is used', bg: 'Как се използва' },
    },
  },
  contributing: {
    label: { en: '04 · Contributing', bg: '04 · Участие' },
    title: { en: 'How to take part', bg: 'Как да се включите' },
    points: [
      {
        en: 'Found a mistake or have a better rule for the blueprint? Open an issue or a pull request on its repository. Small, focused changes with a reason are the easiest to accept.',
        bg: 'Открихте грешка или имате по-добро правило за CLAUDE.md? Отворете issue или pull request в хранилището му. Най-лесно се приемат малки, конкретни промени с обяснение.',
      },
      {
        en: 'For any other public repository, read its README and license first, then open an issue before a large change so we can agree on the approach.',
        bg: 'За всяко друго публично хранилище първо прочетете README и лиценза, а преди голяма промяна отворете issue, за да се разберем за подхода.',
      },
      {
        en: 'Spotted a credit that is missing or wrong on this page? Email me and I will correct it.',
        bg: 'Липсва ли благодарност или има грешка на тази страница? Пишете ми и ще я поправя.',
      },
    ],
  },
  reader: {
    eyebrow: { en: 'Developer blueprint', bg: 'Правила за разработка' },
    back: { en: 'Open source', bg: 'Отворен код' },
    englishOnly: {
      en: '',
      bg: 'Документът е на английски: така го четат AI агентите и така е най-полезен в хранилище.',
    },
  },
} as const satisfies Record<string, unknown>;
