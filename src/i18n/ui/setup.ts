/** The /setup page: explorers, ecosystem, journey, decisions, tools, roadmap. */
export const setup = {
  eyebrow: { en: 'Setup', bg: 'Техника' },
  title: { en: 'Beyond the code', bg: 'Отвъд кода' },
  lede: {
    en: 'Here I show the equipment behind the projects on this site: why I chose it, how I use it, where it falls short and what I plan to improve. Pick any part to see what it is, what it does for my work and where its details come from.',
    bg: 'Тук показвам техниката, с която създавам проектите в този сайт: защо съм я избрал, как я използвам, какви са ограниченията ѝ и какво смятам да подобря. Изберете която и да е част, за да видите какво представлява, с какво ми помага в работата и откъде са данните за нея.',
  },
  disclosure: {
    en: 'Equipment listed reflects my personal setup and purchases. This page is not sponsored, and I have no paid affiliation with the manufacturers mentioned.',
    bg: 'Показаната техника е моя или е в списъка с планираните ми покупки. Страницата не е спонсорирана и нямам платени партньорства с посочените производители.',
  },
  schematic: {
    en: 'Drawings are schematics, not photographs: positions and proportions are approximate.',
    bg: 'Рисунките са схеми, а не снимки: разположението и пропорциите са приблизителни.',
  },
  status: {
    current: { en: 'In use', bg: 'В употреба' },
    spare: { en: 'Owned, not in use', bg: 'Налично, не се използва' },
    past: { en: 'Previously used', bg: 'Използвано преди' },
    planned: { en: 'Planned purchase', bg: 'Планирана покупка' },
  },
  source: {
    machine: { en: 'Read from the machine', bg: 'Прочетено от системата' },
    docs: { en: 'Measured in project docs', bg: 'Измерено, записано в проекта' },
    owner: { en: 'Stated by me', bg: 'По мои данни' },
  },
  manufacturer: { en: 'Manufacturer page', bg: 'Страница на производителя' },
  usedFor: { en: 'Used for', bg: 'Използва се за' },
  explorer: {
    view: { en: 'View', bg: 'Изглед' },
    parts: { en: 'Parts', bg: 'Части' },
    desk: { en: 'The desk', bg: 'Бюрото' },
    insidePc: { en: 'Inside the PC', bg: 'Вътре в компютъра' },
    inside: { en: 'Look inside the PC', bg: 'Вижте вътре в компютъра' },
  },
  workstation: {
    label: { en: '01 · Main workstation', bg: '01 · Основна станция' },
    title: { en: 'Where everything is built', bg: 'Където се създава всичко' },
    lede: {
      en: 'Every project on this site is built and run on one Windows desktop at a height-adjustable desk. Switch between the desk and the inside of the PC.',
      bg: 'Всеки проект в този сайт се компилира и работи на един настолен компютър с Windows, на бюро с регулируема височина. Превключвайте между бюрото и вътрешността на компютъра.',
    },
  },
  secondary: {
    label: { en: '02 · Secondary PC', bg: '02 · Втори компютър' },
    title: { en: 'Older hardware, waiting for a job', bg: 'По-стар хардуер, който чака задача' },
    lede: {
      en: 'My previous desktop still works but has no job yet. Reusing it costs far less than new hardware, as long as I plan around its limits.',
      bg: 'Предишният ми настолен компютър още работи, но засега не го използвам за нищо. Да му намеря задача струва много по-малко от нов хардуер, стига да съобразя ограниченията му.',
    },
    roles: {
      en: 'Possible roles; none is set up yet',
      bg: 'Възможни роли; засега не изпълнява нито една',
    },
    limits: { en: 'What reuse costs', bg: 'Цената на повторното използване' },
  },
  laptop: {
    label: { en: '03 · Linux laptop', bg: '03 · Лаптоп с Linux' },
    title: {
      en: 'Where the code learned to leave Windows',
      bg: 'Където кодът се научи да работи извън Windows',
    },
    lede: {
      en: 'For a stretch of August 2026 the laptop was my only machine, so J.A.R.V.I.S. had to build, test and run on Ubuntu too. Today it is for working away from the desk, Linux checks and Git on the go.',
      bg: 'През част от август 2026 г. лаптопът беше единственият ми компютър, затова J.A.R.V.I.S. трябваше да се компилира, тества и работи и под Ubuntu. Днес го използвам за работа извън бюрото, проверки под Linux и Git, когато не съм у дома.',
    },
  },
  ecosystem: {
    label: { en: '04 · How it fits together', bg: '04 · Как се свързва всичко' },
    title: { en: 'Machines, kit and projects', bg: 'Машини, техника и проекти' },
    lede: {
      en: 'Which hardware each project actually depends on. This maps how things are used, not my network.',
      bg: 'От кой хардуер реално зависи всеки проект. Картата показва употребата, а не мрежата ми.',
    },
  },
  journey: {
    label: { en: '05 · What I build with it', bg: '05 · Какво създавам с нея' },
    title: { en: 'Five kinds of work, one desk', bg: 'Пет вида работа, едно бюро' },
    areas: [
      {
        slug: 'jarvis',
        title: { en: 'Local AI', bg: 'Локален AI' },
        body: {
          en: 'J.A.R.V.I.S. runs a local Qwen3-8B through llama.cpp on the RTX 3080 and keeps speech on the CPU. It offers push-to-talk and an opt-in wake word, and its actions pass compiled authority tiers and single-use approvals. The 10 GB card is its hardest limit.',
          bg: 'J.A.R.V.I.S. изпълнява локален Qwen3-8B чрез llama.cpp на RTX 3080, а гласовата обработка остава на процесора. Има push-to-talk и дума за събуждане, която се включва по желание, а всяко действие минава през компилирани нива на правомощия и еднократни одобрения. Най-тясното му ограничение е видеокартата с 10 GB.',
        },
      },
      {
        slug: 'caelora',
        title: { en: 'Game development', bg: 'Разработка на игри' },
        body: {
          en: 'Caelora is built and played here. Unity 6 renders; my own background meshing, deterministic rules and crash-safe saves run on the 12-core CPU, and its benchmarks and test runs happen on the same machine.',
          bg: 'Caelora се разработва и играе тук. Unity 6 рендира, а собственото ми фоново изграждане на 3D мрежите, детерминираните правила и устойчивото на сривове записване работят на 12-ядрения процесор. Бенчмарковете и тестовете също се пускат на тази машина.',
        },
      },
      {
        slug: 'kobait',
        title: { en: 'Embedded systems', bg: 'Вградени системи' },
        body: {
          en: 'KObait’s two boards are programmed from this PC and tested on the bench: embedded electronics, wireless communication, sensors and motor control, with a failsafe that stops the motors when the link goes quiet. It has not been on the water yet.',
          bg: 'Двете платки на KObait се програмират от този компютър и се изпитват на стенд: вградена електроника, безжична връзка, сензори и управление на моторите, с аварийна защита, която спира моторите, когато връзката замлъкне. Лодката още не е пускана на вода.',
        },
      },
      {
        slug: 'uss-x-academy',
        title: { en: 'Full-stack platforms', bg: 'Full-stack платформи' },
        body: {
          en: 'USS X Academy and Zone 32-19 are developed here against a local PostgreSQL service and Docker, covered by automated test suites, and deployed to Railway from GitHub.',
          bg: 'USS X Academy и Zone 32-19 се разработват тук с локален PostgreSQL и Docker, покрити са с автоматизирани тестове и се внедряват в Railway от GitHub.',
        },
      },
      {
        slug: '',
        title: { en: 'Developer workflow', bg: 'Начин на работа' },
        body: {
          en: 'Windows is the main system and Ubuntu the second. Git worktrees keep parallel branches and AI agents apart, and Claude Code and Codex work under written rules: the same ones I publish as the developer blueprint.',
          bg: 'Windows е основната система, а Ubuntu – втората. Отделните работни копия в Git (worktrees) държат паралелните клонове и AI агентите разделени, а Claude Code и Codex работят по писмени правила – същите, които публикувам като „Правила за разработка“.',
        },
      },
    ],
    caseStudy: { en: 'Case study', bg: 'Проект' },
    blueprint: { en: 'Developer blueprint', bg: 'Правила за разработка' },
  },
  decisions: {
    label: { en: '06 · Decisions', bg: '06 · Решения' },
    title: { en: 'Decisions the hardware forced', bg: 'Решения, наложени от хардуера' },
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
    label: { en: '07 · Environment', bg: '07 · Среда' },
    title: { en: 'The software around the hardware', bg: 'Софтуерът около хардуера' },
    lede: {
      en: 'Read from this machine, with how often I actually use each tool. My working rules for AI coding agents are published as an MIT-licensed blueprint.',
      bg: 'Списъкът е взет от самия компютър и показва колко често използвам всеки инструмент. Правилата ми за работа с AI агенти са публикувани под лиценз MIT.',
    },
    usage: {
      daily: { en: 'Every day', bg: 'Всеки ден' },
      project: { en: 'For one project', bg: 'За конкретен проект' },
      idle: { en: 'Installed, not used', bg: 'Инсталирано, не се използва' },
    },
    blueprint: { en: 'The developer blueprint', bg: 'Правилата за разработка' },
  },
  roadmap: {
    label: { en: '08 · Roadmap', bg: '08 · План за развитие' },
    title: { en: 'Where it is going', bg: 'Накъде върви' },
    lede: {
      en: 'Goals, not promises. What an upgrade would enable is a reason to make it, not a result.',
      bg: 'Цели, а не обещания. Това, което едно надграждане би позволило, е причина да го направя, а не постигнат резултат.',
    },
    stages: {
      operational: { en: 'Working now', bg: 'Работи сега' },
      building: { en: 'In development', bg: 'В разработка' },
      past: { en: 'Previously used', bg: 'Използвано преди' },
      planned: { en: 'Planned', bg: 'Планирано' },
      vision: { en: 'Future ideas', bg: 'Бъдещи идеи' },
    },
  },
  next: {
    title: { en: 'See what it built', bg: 'Вижте какво е създадено с нея' },
    work: { en: 'Case studies', bg: 'Проекти' },
    openSource: { en: 'Developer blueprint', bg: 'Правила за разработка' },
    about: { en: 'About me', bg: 'За мен' },
  },
} as const satisfies Record<string, unknown>;
