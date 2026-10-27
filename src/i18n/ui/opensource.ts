/** The Open source page and the blueprint reader. */
export const openSource = {
  eyebrow: { en: 'Open source', bg: 'Отворен код' },
  title: { en: 'Open source', bg: 'Отворен код' },
  lede: {
    en: 'What I share, the code I publish, and the open-source projects my work depends on. Each license below is taken from the project itself.',
    bg: 'Какво споделям, какъв код публикувам и на кои проекти с отворен код разчита работата ми. Всеки лиценз по-долу е взет от самия проект.',
  },
  blueprint: {
    label: { en: '01 · Developer blueprint', bg: '01 · Правила за разработка' },
    title: { en: 'My CLAUDE.md, made portable', bg: 'Моят CLAUDE.md, готов за всеки проект' },
    lede: {
      en: 'The working rules I give AI coding agents in every repository: engineering principles, an evidence hierarchy, a workflow scaled to risk, and rules for Git, testing, security and documentation. Project details and private paths are removed, and machine-specific settings are placeholders. Shared for learning and development use.',
      bg: 'Правилата, които давам на AI агентите за програмиране във всяко хранилище: инженерни принципи, йерархия на доказателствата, работен процес според риска и правила за Git, тестване, сигурност и документация. Подробностите за проектите и личните пътища са премахнати, а настройките за конкретна машина са заменени с полета за попълване. Споделям ги за обучение и разработка.',
    },
    read: { en: 'Read online', bg: 'Прочети онлайн' },
    download: { en: 'Download CLAUDE.md', bg: 'Изтегли CLAUDE.md' },
    copyLabel: { en: 'Copy CLAUDE.md as Markdown', bg: 'Копирай CLAUDE.md като Markdown' },
    source: { en: 'Source on GitHub', bg: 'Изходен код в GitHub' },
    license: { en: 'MIT License', bg: 'Лиценз MIT' },
    facts: {
      format: { en: 'Format', bg: 'Формат' },
      license: { en: 'License', bg: 'Лиценз' },
      language: { en: 'Language', bg: 'Език' },
      english: { en: 'English', bg: 'Английски' },
      sections: { en: 'Sections', bg: 'Раздели' },
    },
    quick: {
      title: { en: 'Quick start', bg: 'Бърз старт' },
      installUrl: 'https://code.claude.com/docs/en/setup',
      install: {
        before: { en: 'Install', bg: 'Инсталирайте' },
        link: { en: 'Claude Code', bg: 'Claude Code' },
        after: {
          en: 'and sign in. The blueprint is instructions only: it does not install anything or give access to models.',
          bg: 'и влезте в акаунта си. Файлът съдържа само инструкции: не инсталира нищо и не дава достъп до модели.',
        },
      },
      run: {
        en: 'In the root of your project, download the file. The command leaves an existing CLAUDE.md untouched.',
        bg: 'В корена на проекта изтеглете файла. Командата не променя вече съществуващ CLAUDE.md.',
      },
      system: { en: 'Your system', bg: 'Вашата система' },
      copy: { en: 'Copy setup command', bg: 'Копирай командата за настройка' },
      fill: {
        en: 'Fill in section 0 with your stack, branches and commands, and delete the sections you do not need.',
        bg: 'Попълнете раздел 0 със стека, клоновете и командите на проекта и изтрийте разделите, които не ви трябват.',
      },
      check: {
        en: 'Start claude in the project and run /context: CLAUDE.md should be listed under Memory files.',
        bg: 'Стартирайте claude в проекта и изпълнете /context: CLAUDE.md трябва да е в списъка Memory files.',
      },
      existing: {
        en: 'Already have a CLAUDE.md, or want these rules in every project? The setup guide shows how to import the blueprint next to your own instructions and how to update it.',
        bg: 'Вече имате CLAUDE.md или искате правилата във всеки проект? Ръководството показва как да включите файла до собствените си инструкции и как да го обновявате.',
      },
      guide: { en: 'Read the setup guide', bg: 'Ръководство за настройка' },
      contribute: { en: 'Contribute on GitHub', bg: 'Предложи промяна в GitHub' },
    },
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
      bg: 'Публичните хранилища, които са мои или в които участвам, с лиценза, който GitHub показва за всяко. Повечето от по-големите ми системи са частни и това е отбелязано в описанията им.',
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
      en: 'The open-source projects and third-party tools that matter most in my work, with their authors and licenses. “Used” means the code ships or runs in the project; “reference” means it informed the design and none of its code is included. Listing a project implies no endorsement or affiliation.',
      bg: 'Проектите с отворен код и външните инструменти, които имат най-голяма роля в работата ми, с авторите и лицензите им. „Използван“ означава, че кодът е част от проекта или работи в него; „ориентир“ – че е повлиял на дизайна, без да е включен негов код. Изброяването не означава одобрение или връзка с авторите.',
    },
    used: { en: 'Used', bg: 'Използван' },
    reference: { en: 'Reference', bg: 'Ориентир' },
    by: { en: 'by', bg: 'от' },
    caseStudy: { en: 'Case study', bg: 'Проект' },
    /** The block under a case study's stack. */
    builtWith: {
      en: 'Built with: credits and licenses',
      bg: 'Изградено с: благодарности и лицензи',
    },
    all: { en: 'All credits and licenses', bg: 'Всички благодарности и лицензи' },
    caption: { en: 'Credits for', bg: 'Благодарности за' },
    cols: {
      project: { en: 'Project', bg: 'Проект' },
      license: { en: 'License', bg: 'Лиценз' },
      use: { en: 'How it is used', bg: 'Как се използва' },
    },
  },
  contributing: {
    setup: {
      en: 'The tools and machines these rules are used with',
      bg: 'Инструментите и машините, с които се използват тези правила',
    },
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
