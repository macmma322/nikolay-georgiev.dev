/** The /setup page: explorers, ecosystem, journey, decisions, tools, roadmap. */
export const setup = {
  eyebrow: { en: 'Setup', bg: 'Техника' },
  title: { en: 'Beyond the code', bg: 'Отвъд кода' },
  lede: {
    en: 'The desk, machines and kit behind the projects on this site: what I use, why, where it falls short and what comes next. Pick any part to see what it is, what it does for my work and where its details come from.',
    bg: 'Бюрото, машините и техниката зад проектите на този сайт: какво използвам, защо, къде не стига и какво предстои. Изберете която и да е част, за да видите какво е, с какво помага в работата ми и откъде идват данните за нея.',
  },
  disclosure: {
    en: 'Equipment listed reflects my personal setup and purchases. This page is not sponsored, and I have no paid affiliation with the manufacturers mentioned.',
    bg: 'Показаното оборудване е част от личната ми конфигурация или от планираните ми покупки. Страницата не е спонсорирана и нямам платени партньорства с посочените производители.',
  },
  schematic: {
    en: 'Drawings are schematics, not photographs: positions and proportions are approximate.',
    bg: 'Рисунките са схеми, а не снимки: разположението и пропорциите са приблизителни.',
  },
  status: {
    current: { en: 'In use', bg: 'В употреба' },
    spare: { en: 'Owned, no role yet', bg: 'Налично, без роля' },
    past: { en: 'Previously used', bg: 'Използвано преди' },
    planned: { en: 'Planned, not bought', bg: 'Планирано, не е купено' },
  },
  source: {
    machine: { en: 'Read from the machine', bg: 'Прочетено от системата' },
    docs: { en: 'Measured in project docs', bg: 'Измерено в документацията' },
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
      en: 'One Windows desktop at an adjustable desk builds and runs every project on this site. Switch between the desk and the inside of the PC.',
      bg: 'Един настолен компютър с Windows на регулируемо бюро компилира и изпълнява всеки проект на този сайт. Превключвайте между бюрото и вътрешността на компютъра.',
    },
  },
  secondary: {
    label: { en: '02 · Secondary PC', bg: '02 · Втори компютър' },
    title: { en: 'Older hardware, waiting for a job', bg: 'По-стар хардуер, който чака задача' },
    lede: {
      en: 'My previous desktop still works but has no role yet. Reusing it costs far less than new hardware, if its limits are planned for.',
      bg: 'Предишният ми настолен компютър още работи, но засега няма роля. Да го използвам отново струва много по-малко от нов хардуер, стига ограниченията му да са предвидени.',
    },
    roles: {
      en: 'Possible roles, none running today',
      bg: 'Възможни роли, нито една не работи днес',
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
      bg: 'За известно време през август 2026 г. лаптопът беше единственият ми компютър, затова J.A.R.V.I.S. трябваше да се компилира, тества и работи и под Ubuntu. Днес служи за работа извън бюрото, проверки под Linux и Git в движение.',
    },
  },
  ecosystem: {
    label: { en: '04 · How it fits together', bg: '04 · Как се свързва всичко' },
    title: { en: 'Machines, kit and projects', bg: 'Машини, техника и проекти' },
    lede: {
      en: 'Which hardware each project actually depends on. This is a map of uses, not of my network.',
      bg: 'От кой хардуер наистина зависи всеки проект. Това е карта на употребата, а не на мрежата ми.',
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
          en: 'J.A.R.V.I.S. runs a local Qwen3-8B through llama.cpp on the RTX 3080, keeps speech on the CPU and offers push-to-talk and an opt-in wake word, behind compiled authority tiers and single-use approvals. The 10 GB card is its hardest limit.',
          bg: 'J.A.R.V.I.S. изпълнява локален Qwen3-8B чрез llama.cpp на RTX 3080, държи гласа на процесора и предлага push-to-talk и дума за събуждане по желание, зад компилирани нива на правомощия и еднократни одобрения. Картата с 10 GB е най-твърдото му ограничение.',
        },
      },
      {
        slug: 'caelora',
        title: { en: 'Game development', bg: 'Разработка на игри' },
        body: {
          en: 'Caelora is built and played here. Unity 6 renders; my own background meshing, deterministic rules and crash-safe saves run on the 12-core CPU, and its benchmarks and test runs happen on the same machine.',
          bg: 'Caelora се създава и играе тук. Unity 6 рендира, а собственото ми фоново изграждане на мрежи, детерминираните правила и устойчивите на срив записи работят на 12-ядрения процесор; бенчмарковете и тестовете също минават на тази машина.',
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
        title: { en: 'Full-stack platforms', bg: 'Пълностекови платформи' },
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
          bg: 'Windows е основната система, а Ubuntu – втората. Работните копия на Git държат паралелните клонове и AI агентите отделно, а Claude Code и Codex работят по писмени правила – същите, които публикувам като правила за разработка.',
        },
      },
    ],
    caseStudy: { en: 'Case study', bg: 'Проект' },
    blueprint: { en: 'Developer blueprint', bg: 'Правила за разработка' },
  },
  decisions: {
    label: { en: '06 · Decisions', bg: '06 · Решения' },
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
    label: { en: '07 · Environment', bg: '07 · Среда' },
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
    label: { en: '08 · Roadmap', bg: '08 · Пътна карта' },
    title: { en: 'Where it is going', bg: 'Накъде отива' },
    lede: {
      en: 'Goals, not promises. What an upgrade would enable is a reason to make it, not a result.',
      bg: 'Цели, а не обещания. Това, което един ъпгрейд би позволил, е причина да го направя, а не резултат.',
    },
    stages: {
      operational: { en: 'Working now', bg: 'Работи сега' },
      building: { en: 'In development', bg: 'В разработка' },
      past: { en: 'Previously used', bg: 'Използвано преди' },
      planned: { en: 'Planned', bg: 'Планирано' },
      vision: { en: 'Long term', bg: 'В дългосрочен план' },
    },
  },
  next: {
    title: { en: 'See what it built', bg: 'Вижте какво е създадено с нея' },
    work: { en: 'Case studies', bg: 'Проекти' },
    openSource: { en: 'Developer blueprint', bg: 'Правила за разработка' },
    about: { en: 'About me', bg: 'За мен' },
  },
} as const satisfies Record<string, unknown>;
