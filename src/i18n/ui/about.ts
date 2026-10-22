import type { L } from '@/i18n';

type Tree = L | { readonly [key: string]: Tree } | readonly Tree[];

/** The About page. Shared CV and contact labels come from common.ts. */
export const about = {
  label: { en: 'About', bg: 'За мен' },
  title: { en: 'I like building the whole thing.', bg: 'Обичам да изграждам цялата система.' },
  /** Three paragraphs; the first carries the name in <strong>. */
  bio: {
    intro: {
      before: { en: 'I am ', bg: 'Аз съм ' },
      name: { en: 'Nikolay Georgiev', bg: 'Николай Георгиев' },
      after: {
        en: ', a software engineer based in Varna, Bulgaria, with a Computer Science degree from the University of Ruse. By day I work as a backend developer at DXC Technology on an enterprise insurance platform, where the work is about reading large legacy systems carefully and shipping fixes through a real release process.',
        bg: ', софтуерен инженер от Варна с бакалавърска степен по компютърни науки от Русенския университет. През деня съм бекенд разработчик в DXC Technology и работя по корпоративна застрахователна платформа. Там работата ми е да чета внимателно големи наследени системи и да пускам корекции през истински процес по издаване на версии.',
      },
    },
    own: {
      en: 'The rest of my time goes into systems of my own. Zone 32-19 is a community and commerce platform I build alone. USS X Academy is a production education platform I engineered for a training centre. J.A.R.V.I.S. is a local-first AI assistant built around the idea that models may advise but never act on their own authority. KObait is an embedded boat with its own radio protocol, and Malrynth is an operating system I am writing from scratch in Rust.',
      bg: 'Останалото ми време е за собствени системи. Zone 32-19 е платформа за общност и търговия, която изграждам сам. USS X Academy е образователна платформа в продукция, която разработих за учебен център. J.A.R.V.I.S. е локален AI асистент, изграден около идеята, че моделите могат да съветват, но не и да действат сами. KObait е лодка за захранка със собствен фърмуер и радиопротокол, а с Malrynth пиша от нулата операционна система на Rust.',
    },
    next: {
      en: 'Next, I am deliberately broadening beyond TypeScript: Java, Spring Boot and Angular, through a ledger platform where financial correctness is the whole point.',
      bg: 'Следващата ми стъпка съзнателно излиза извън TypeScript: Java, Spring Boot и Angular в счетоводна платформа, където всичко опира до финансовата коректност.',
    },
  },
  /** Only on Bulgarian pages: the CV is English only. */
  cvLang: { en: '', bg: 'англ.' },
  portraitAlt: {
    en: 'Portrait of Nikolay Georgiev, a young man with short dark hair and a beard, in a dark shirt.',
    bg: 'Портрет на Николай Георгиев: млад мъж с къса тъмна коса и брада, в тъмна риза.',
  },
  principles: {
    label: { en: 'How I work', bg: 'Как работя' },
    title: { en: 'Four working rules', bg: 'Четири работни правила' },
    items: [
      {
        title: { en: 'Evidence over adjectives', bg: 'Доказателства вместо прилагателни' },
        body: {
          en: 'Claims about a system should point at code, tests or a measurement. This site follows the same rule: statuses come from repositories, not from ambition.',
          bg: 'Твърденията за една система трябва да сочат към код, тестове или измерване. Този сайт следва същото правило: статусите идват от хранилищата, а не от амбициите.',
        },
      },
      {
        title: { en: 'Own the whole system', bg: 'Отговарям за цялата система' },
        body: {
          en: 'Schema, API, realtime layer, payments, deployment and interface. I like knowing what happens at every layer, down to the boot loader.',
          bg: 'Схема, API, слой за реално време, плащания, внедряване и интерфейс. Искам да знам какво се случва на всеки слой, чак до зареждащия модул.',
        },
      },
      {
        title: { en: 'Safety is structure', bg: 'Безопасността е въпрос на структура' },
        body: {
          en: 'One writer for the motors, a compiled ceiling on what an AI may execute, a webhook that can only apply once. Boundaries belong in code and tests.',
          bg: 'Един компонент командва моторите, таванът на това, което AI може да изпълни, е заложен при компилация, а уебхукът се прилага само веднъж. Мястото на границите е в кода и в тестовете.',
        },
      },
      {
        title: { en: 'Write it down', bg: 'Записвам всичко' },
        body: {
          en: 'Decision records, runbooks and honest status notes make long projects survivable, especially when AI agents are part of the team.',
          bg: 'Дневниците на решенията, оперативните наръчници и честните бележки за статуса помагат на дългите проекти да оцелеят, особено когато в екипа има AI агенти.',
        },
      },
    ],
  },
  history: {
    label: { en: 'Experience', bg: 'Опит' },
    title: { en: 'History', bg: 'Професионален път' },
  },
  background: {
    label: { en: 'Education and languages', bg: 'Образование и езици' },
    title: { en: 'Background', bg: 'Подготовка' },
    education: { en: 'Education', bg: 'Образование' },
    certificates: { en: 'Certificates', bg: 'Сертификати' },
    languages: { en: 'Languages', bg: 'Езици' },
  },
  capabilities: {
    label: { en: 'Capabilities', bg: 'Технологии' },
    title: { en: 'Stack by layer', bg: 'Стек по слоеве' },
  },
} as const satisfies Record<string, Tree>;
