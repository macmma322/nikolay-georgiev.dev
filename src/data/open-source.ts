import type { L } from '@/i18n';

/**
 * The Open source page and the "Built with" block of each case study.
 * Sources: GitHub (`gh repo list`, 2026-10-27) for repositories; each
 * project's own manifests and lockfiles, and the installed package metadata,
 * for credits. A license is written exactly as the upstream project declares
 * it. Hardware drivers named after a chip are described by kind (KObait rule,
 * PRODUCT.md), so the credits cannot be read as a parts list. A KObait
 * library whose name or repository reveals a module (GPS, gyro) is credited
 * by author, license and a generic use, linking to the author, not the repo.
 */

/** The public repository of the CLAUDE.md blueprint (MIT). */
export const BLUEPRINT_REPO = 'https://github.com/macmma322/engineering-blueprint';

export interface Repo {
  name: string;
  url: string;
  kind: 'original' | 'fork' | 'contribution';
  summary: L;
  stack: string;
  /** SPDX id as GitHub reports it; undefined means no license (all rights reserved). */
  license?: string;
  status: L;
  /** The README explains how to build or use it. */
  buildDocs: boolean;
  /** Upstream of a fork, or the repository a contribution went to. */
  upstream?: { name: string; url: string };
}

export const repos: readonly Repo[] = [
  {
    name: 'engineering-blueprint',
    url: BLUEPRINT_REPO,
    kind: 'original',
    summary: {
      en: 'The portable CLAUDE.md on this page: operating rules for AI coding agents, with placeholders for project specifics.',
      bg: 'Преносимият CLAUDE.md от тази страница: правила за AI агенти за програмиране, с полета за подробностите на проекта.',
    },
    stack: 'Markdown',
    license: 'MIT',
    status: { en: 'Maintained', bg: 'Поддържа се' },
    buildDocs: true,
  },
];

export interface Credit {
  /** Plain when it is only names; per locale when it has words around them. */
  name: string | L;
  by: string | L;
  url: string;
  /** As the upstream project declares it (SPDX where it uses one). */
  license: string | L;
  use: L;
  /** used: the code ships or runs in the project. reference: design input only. */
  kind: 'used' | 'reference';
}

export interface CreditGroup {
  /** A case-study slug, or 'site' for this portfolio. */
  project: string;
  name: string;
  items: readonly Credit[];
}

export const credits: readonly CreditGroup[] = [
  {
    project: 'caelora',
    name: 'Caelora',
    items: [
      {
        name: {
          en: 'Unity 6 with Burst, Collections, Mathematics and URP',
          bg: 'Unity 6 с Burst, Collections, Mathematics и URP',
        },
        by: 'Unity Technologies',
        url: 'https://unity.com',
        license: {
          en: 'Unity Companion License (not open source)',
          bg: 'Unity Companion License (не е с отворен код)',
        },
        kind: 'used',
        use: {
          en: 'The engine, renderer and job system the game runs on.',
          bg: 'Енджинът, рендерът и системата за задачи, върху които работи играта.',
        },
      },
      {
        name: 'SplitMix64',
        by: 'Sebastiano Vigna',
        url: 'https://prng.di.unimi.it',
        license: {
          en: 'Public domain (reference C code)',
          bg: 'Обществено достояние (примерен код на C)',
        },
        kind: 'reference',
        use: {
          en: 'The hashing behind deterministic terrain noise, reimplemented in C# with fixed-point maths.',
          bg: 'Хеширането зад детерминирания шум на терена, реализирано наново на C# с фиксирана запетая.',
        },
      },
      {
        name: 'Dynamic Trees',
        by: 'Dynamic Trees Team',
        url: 'https://github.com/DynamicTreesTeam/DynamicTrees',
        license: 'MIT',
        kind: 'reference',
        use: {
          en: 'A concept reference for living trees. A clean-room audit recorded that none of its code was used.',
          bg: 'Ориентир за идеята за живи дървета. Одит в чиста среда отбеляза, че не е използван негов код.',
        },
      },
      {
        name: { en: 'Cinzel, EB Garamond and Caveat', bg: 'Cinzel, EB Garamond и Caveat' },
        by: {
          en: 'Natanael Gama; Georg Duffner and Octavio Pardo; Impallari Type',
          bg: 'Natanael Gama; Georg Duffner и Octavio Pardo; Impallari Type',
        },
        url: 'https://fonts.google.com/specimen/Cinzel',
        license: 'OFL-1.1',
        kind: 'used',
        use: {
          en: 'Interface typefaces, bundled with their licence files.',
          bg: 'Шрифтовете на интерфейса, включени с лицензионните си файлове.',
        },
      },
    ],
  },
  {
    project: 'uss-x-academy',
    name: 'USS X Academy',
    items: [
      {
        name: 'LiveKit SDKs',
        by: 'LiveKit',
        url: 'https://github.com/livekit/client-sdk-js',
        license: 'Apache-2.0',
        kind: 'used',
        use: {
          en: 'Classroom media in the browser, the meeting components and server-side join tokens.',
          bg: 'Медията на класната стая в браузъра, компонентите на срещата и токените за влизане от сървъра.',
        },
      },
      {
        name: { en: 'Next.js and React', bg: 'Next.js и React' },
        by: 'Vercel; Meta',
        url: 'https://github.com/vercel/next.js',
        license: 'MIT',
        kind: 'used',
        use: {
          en: 'The academy site and the accounts app.',
          bg: 'Сайтът на академията и приложението за акаунти.',
        },
      },
      {
        name: 'Express',
        by: { en: 'OpenJS Foundation and contributors', bg: 'OpenJS Foundation и сътрудници' },
        url: 'https://github.com/expressjs/express',
        license: 'MIT',
        kind: 'used',
        use: {
          en: 'The HTTP layer of the API and the auth service.',
          bg: 'HTTP слоят на API и на услугата за автентикация.',
        },
      },
      {
        name: { en: 'node-postgres and ioredis', bg: 'node-postgres и ioredis' },
        by: 'Brian Carlson; Zihua Li',
        url: 'https://github.com/brianc/node-postgres',
        license: 'MIT',
        kind: 'used',
        use: {
          en: 'Hand-written SQL against PostgreSQL; sessions, pub/sub and classroom chat in Redis.',
          bg: 'Ръчно написан SQL към PostgreSQL; сесии, pub/sub и чат на класната стая в Redis.',
        },
      },
      {
        name: 'node-argon2',
        by: 'Ranieri Althoff',
        url: 'https://github.com/ranisalt/node-argon2',
        license: 'MIT',
        kind: 'used',
        use: {
          en: 'Argon2id password hashing.',
          bg: 'Хеширане на паролите с Argon2id.',
        },
      },
      {
        name: { en: 'DTLN and dtln-rs', bg: 'DTLN и dtln-rs' },
        by: 'Nils Westhausen; Datadog',
        url: 'https://github.com/breizhn/DTLN',
        license: 'MIT',
        kind: 'used',
        use: {
          en: 'The neural noise-suppression model in the classroom microphone chain, run as WASM in an AudioWorklet.',
          bg: 'Невронният модел за потискане на шума в микрофона на класната стая, изпълняван като WASM в AudioWorklet.',
        },
      },
      {
        name: 'PDF.js',
        by: 'Mozilla',
        url: 'https://github.com/mozilla/pdf.js',
        license: 'Apache-2.0',
        kind: 'used',
        use: {
          en: 'Course textbooks in the browser.',
          bg: 'Учебниците на курсовете в браузъра.',
        },
      },
      {
        name: 'Zod',
        by: 'Colin McDonnell',
        url: 'https://github.com/colinhacks/zod',
        license: 'MIT',
        kind: 'used',
        use: {
          en: 'Request and form validation.',
          bg: 'Валидиране на заявките и формулярите.',
        },
      },
    ],
  },
  {
    project: 'jarvis',
    name: 'J.A.R.V.I.S.',
    items: [
      {
        name: 'llama.cpp',
        by: { en: 'ggml-org and contributors', bg: 'ggml-org и сътрудници' },
        url: 'https://github.com/ggml-org/llama.cpp',
        license: 'MIT',
        kind: 'used',
        use: {
          en: 'The supervised local inference server for the on-device model.',
          bg: 'Локалният сървър за изпълнение на модела на машината, под наблюдение.',
        },
      },
      {
        name: 'Qwen3-8B',
        by: 'Qwen team, Alibaba Cloud',
        url: 'https://github.com/QwenLM/Qwen3',
        license: 'Apache-2.0',
        kind: 'used',
        use: {
          en: 'The local model, quantised to Q4_K_M, for selected low-risk routes.',
          bg: 'Локалният модел, квантизиран до Q4_K_M, за избрани маршрути с нисък риск.',
        },
      },
      {
        name: 'faster-whisper',
        by: 'SYSTRAN',
        url: 'https://github.com/SYSTRAN/faster-whisper',
        license: 'MIT',
        kind: 'used',
        use: {
          en: 'Speech-to-text, on CTranslate2.',
          bg: 'Разпознаване на реч, върху CTranslate2.',
        },
      },
      {
        name: 'Piper',
        by: 'Open Home Foundation',
        url: 'https://github.com/OHF-Voice/piper1-gpl',
        license: 'GPL-3.0-or-later',
        kind: 'used',
        use: {
          en: 'Text-to-speech, run as a separate worker process.',
          bg: 'Синтез на реч, изпълняван като отделен работен процес.',
        },
      },
      {
        name: 'openWakeWord',
        by: 'David Scripka',
        url: 'https://github.com/dscripka/openWakeWord',
        license: {
          en: 'Apache-2.0 (code); pre-trained models CC BY-NC-SA 4.0',
          bg: 'Apache-2.0 (кодът); CC BY-NC-SA 4.0 (обучените модели)',
        },
        kind: 'used',
        use: {
          en: 'The opt-in wake-word sensor.',
          bg: 'Сензорът за дума за събуждане, включван по желание.',
        },
      },
      {
        name: 'MCP TypeScript SDK',
        by: 'Model Context Protocol',
        url: 'https://github.com/modelcontextprotocol/typescript-sdk',
        license: 'MIT',
        kind: 'used',
        use: {
          en: 'The MCP server that exposes the assistant’s tools.',
          bg: 'MCP сървърът, който предоставя инструментите на асистента.',
        },
      },
      {
        name: 'Tauri',
        by: { en: 'Tauri contributors', bg: 'сътрудниците на Tauri' },
        url: 'https://github.com/tauri-apps/tauri',
        license: 'Apache-2.0 OR MIT',
        kind: 'used',
        use: {
          en: 'The native desktop shell, in Rust.',
          bg: 'Нативната обвивка на настолното приложение, на Rust.',
        },
      },
      {
        name: { en: 'three.js and React Three Fiber', bg: 'three.js и React Three Fiber' },
        by: {
          en: 'Ricardo Cabello and contributors; Poimandres',
          bg: 'Ricardo Cabello и сътрудници; Poimandres',
        },
        url: 'https://github.com/pmndrs/react-three-fiber',
        license: 'MIT',
        kind: 'used',
        use: {
          en: 'The 3D presence sphere in the desktop window.',
          bg: '3D сферата на присъствието в настолния прозорец.',
        },
      },
    ],
  },
  {
    project: 'zone-32-19',
    name: 'Zone 32-19',
    items: [
      {
        name: { en: 'Next.js and React', bg: 'Next.js и React' },
        by: 'Vercel; Meta',
        url: 'https://github.com/vercel/next.js',
        license: 'MIT',
        kind: 'used',
        use: {
          en: 'The client and its same-origin BFF.',
          bg: 'Клиентът и неговият BFF на същия произход.',
        },
      },
      {
        name: { en: 'Express and node-postgres', bg: 'Express и node-postgres' },
        by: {
          en: 'OpenJS Foundation and contributors; Brian Carlson',
          bg: 'OpenJS Foundation и сътрудници; Brian Carlson',
        },
        url: 'https://github.com/expressjs/express',
        license: 'MIT',
        kind: 'used',
        use: {
          en: 'The modular monolith API and its raw parameterised SQL.',
          bg: 'API-то на модулния монолит и неговият чист параметризиран SQL.',
        },
      },
      {
        name: { en: 'Socket.IO and its Redis adapter', bg: 'Socket.IO и адаптерът му за Redis' },
        by: { en: 'Socket.IO contributors', bg: 'сътрудниците на Socket.IO' },
        url: 'https://github.com/socketio/socket.io',
        license: 'MIT',
        kind: 'used',
        use: {
          en: 'Messaging, presence and call signalling across replicas.',
          bg: 'Съобщения, онлайн статус и сигнализация за разговорите между репликите.',
        },
      },
      {
        name: 'BullMQ',
        by: 'Taskforce.sh',
        url: 'https://github.com/taskforcesh/bullmq',
        license: 'MIT',
        kind: 'used',
        use: {
          en: 'Finance jobs with retries.',
          bg: 'Финансовите задачи с повторни опити.',
        },
      },
      {
        name: 'Stripe SDKs',
        by: 'Stripe',
        url: 'https://github.com/stripe/stripe-node',
        license: 'MIT',
        kind: 'used',
        use: {
          en: 'PaymentIntents, the PaymentElement checkout and webhook verification.',
          bg: 'PaymentIntents, плащането през PaymentElement и проверката на уебхуковете.',
        },
      },
      {
        name: 'Sentry SDKs',
        by: 'Sentry',
        url: 'https://github.com/getsentry/sentry-javascript',
        license: 'MIT',
        kind: 'used',
        use: {
          en: 'Error tracking in the API and the client.',
          bg: 'Проследяване на грешки в API и в клиента.',
        },
      },
      {
        name: {
          en: 'Caddy, Coraza and the OWASP Core Rule Set',
          bg: 'Caddy, Coraza и OWASP Core Rule Set',
        },
        by: {
          en: 'Caddy contributors; OWASP Coraza; OWASP CRS',
          bg: 'сътрудниците на Caddy; OWASP Coraza; OWASP CRS',
        },
        url: 'https://github.com/corazawaf/coraza-caddy',
        license: 'Apache-2.0',
        kind: 'used',
        use: {
          en: 'The web application firewall, built and validated in development.',
          bg: 'Защитната стена за уеб приложения, изградена и проверена в среда за разработка.',
        },
      },
      {
        name: 'GSAP',
        by: 'GreenSock (Webflow)',
        url: 'https://github.com/greensock/GSAP',
        license: {
          en: 'GSAP Standard No Charge License (not open source)',
          bg: 'GSAP Standard No Charge License (не е с отворен код)',
        },
        kind: 'used',
        use: {
          en: 'Motion on the landing page.',
          bg: 'Анимацията на началната страница.',
        },
      },
    ],
  },
  {
    project: 'kobait',
    name: 'KObait',
    items: [
      {
        name: 'Adafruit GFX Library',
        by: 'Adafruit Industries',
        url: 'https://github.com/adafruit/Adafruit-GFX-Library',
        license: 'BSD',
        kind: 'used',
        use: {
          en: 'Graphics primitives on both boards; the remote’s ASCII text uses its 5×7 font.',
          bg: 'Графични примитиви на двете платки; ASCII текстът на дистанционното използва неговия шрифт 5×7.',
        },
      },
      {
        name: {
          en: 'Adafruit sensor and display drivers',
          bg: 'Драйвери на Adafruit за сензори и дисплеи',
        },
        by: 'Adafruit Industries',
        url: 'https://github.com/adafruit',
        license: 'MIT, BSD, Apache-2.0',
        kind: 'used',
        use: {
          en: 'Sensor and status-display drivers on the boat, through Adafruit’s driver, unified-sensor and bus libraries.',
          bg: 'Драйвери за сензорите и дисплея за състоянието на лодката, през драйверите и библиотеките на Adafruit.',
        },
      },
      {
        name: { en: 'A sensor-data parser', bg: 'Библиотека за разчитане на данни от сензори' },
        by: 'Mikal Hart',
        url: 'https://github.com/mikalhart',
        license: 'LGPL-2.1-or-later',
        kind: 'used',
        use: {
          en: 'Reads sensor data on the boat.',
          bg: 'Разчита данните от сензорите на лодката.',
        },
      },
      {
        name: 'SdFat',
        by: 'Bill Greiman',
        url: 'https://github.com/greiman/SdFat',
        license: 'MIT',
        kind: 'used',
        use: {
          en: 'SD card storage on the remote.',
          bg: 'Съхранение на SD карта в дистанционното.',
        },
      },
      {
        name: { en: 'Servo and the Arduino AVR core', bg: 'Servo и ядрото Arduino AVR' },
        by: 'Arduino',
        url: 'https://github.com/arduino/ArduinoCore-avr',
        license: 'LGPL-2.1',
        kind: 'used',
        use: {
          en: 'Motor-controller signals, serial, I²C, SPI and EEPROM on both boards.',
          bg: 'Сигналите към контролерите на моторите, серийна връзка, I²C, SPI и EEPROM на двете платки.',
        },
      },
      {
        name: { en: 'A community display driver', bg: 'Драйвер за дисплей от общността' },
        by: 'David Prentice',
        url: 'https://github.com/prenticedavid',
        license: {
          en: 'No license of its own; bundles BSD and LGPL code',
          bg: 'Без собствен лиценз; съдържа код под BSD и LGPL',
        },
        kind: 'used',
        use: {
          en: 'Drives the remote’s display.',
          bg: 'Управлява дисплея на дистанционното.',
        },
      },
    ],
  },
  {
    project: 'malrynth',
    name: 'Malrynth',
    items: [
      {
        name: 'uefi-rs',
        by: 'Rust OSDev',
        url: 'https://github.com/rust-osdev/uefi-rs',
        license: 'MIT OR Apache-2.0',
        kind: 'used',
        use: {
          en: 'The UEFI loader’s firmware bindings (uefi, uefi-raw, uefi-macros). The kernel has no dependencies at all.',
          bg: 'Връзката на UEFI зареждащата програма с фърмуера (uefi, uefi-raw, uefi-macros). Ядрото няма никакви зависимости.',
        },
      },
      {
        name: 'ucs2',
        by: 'Rust OSDev',
        url: 'https://github.com/rust-osdev/ucs2-rs',
        license: 'MPL-2.0',
        kind: 'used',
        use: {
          en: 'UCS-2 string handling, pulled in by uefi-rs (loader only).',
          bg: 'Работа с UCS-2 низове, идва с uefi-rs (само в зареждащата програма).',
        },
      },
      {
        name: {
          en: 'bitflags, log, cfg-if and the syn family',
          bg: 'bitflags, log, cfg-if и семейството syn',
        },
        by: { en: 'The Rust project and community', bg: 'проекта и общността на Rust' },
        url: 'https://github.com/bitflags/bitflags',
        license: 'MIT OR Apache-2.0',
        kind: 'used',
        use: {
          en: 'Transitive dependencies of uefi-rs; syn, quote and proc-macro2 run only at build time.',
          bg: 'Транзитивни зависимости на uefi-rs; syn, quote и proc-macro2 работят само при компилиране.',
        },
      },
      {
        name: { en: 'QEMU and OVMF', bg: 'QEMU и OVMF' },
        by: 'QEMU project, TianoCore',
        url: 'https://www.qemu.org',
        license: 'GPL-2.0; BSD-2-Clause-Patent',
        kind: 'used',
        use: {
          en: 'Development tools only: the emulator and UEFI firmware every boot test runs on. Not part of the system.',
          bg: 'Само инструменти: емулаторът и UEFI фърмуерът, върху които минава всеки тест за зареждане. Не са част от системата.',
        },
      },
    ],
  },
  {
    project: 'site',
    name: 'nikolay-georgiev.dev',
    items: [
      {
        name: 'Astro',
        by: {
          en: 'The Astro Technology Company and contributors',
          bg: 'The Astro Technology Company и сътрудници',
        },
        url: 'https://github.com/withastro/astro',
        license: 'MIT',
        kind: 'used',
        use: {
          en: 'The static site generator, content collections, image pipeline, sitemap and CSP for this site.',
          bg: 'Генераторът на статичния сайт, колекциите със съдържание, обработката на изображения, sitemap и CSP.',
        },
      },
      {
        name: { en: 'Hubot Sans and Mona Sans', bg: 'Hubot Sans и Mona Sans' },
        by: 'GitHub',
        url: 'https://github.com/github/mona-sans',
        license: 'OFL-1.1',
        kind: 'used',
        use: {
          en: 'Display and body type, self-hosted through Fontsource.',
          bg: 'Шрифтовете за заглавия и текст, хоствани на сайта чрез Fontsource.',
        },
      },
      {
        name: 'Martian Mono',
        by: 'Evil Martians',
        url: 'https://github.com/evilmartians/mono',
        license: 'OFL-1.1',
        kind: 'used',
        use: {
          en: 'Labels, figures and code.',
          bg: 'Етикети, числа и код.',
        },
      },
      {
        name: 'TikTok Sans',
        by: 'TikTok',
        url: 'https://fontsource.org/fonts/tiktok-sans',
        license: 'OFL-1.1',
        kind: 'used',
        use: {
          en: 'The Cyrillic companion face for the Bulgarian pages.',
          bg: 'Шрифтът за кирилица на българските страници.',
        },
      },
      {
        name: 'Simple Icons',
        by: { en: 'Simple Icons contributors', bg: 'сътрудниците на Simple Icons' },
        url: 'https://github.com/simple-icons/simple-icons',
        license: 'CC0-1.0',
        kind: 'used',
        use: {
          en: 'Technology logos in the stack lists. The logos remain their owners’ trademarks.',
          bg: 'Логата на технологиите в списъците със стека. Логата остават търговски марки на притежателите си.',
        },
      },
      {
        name: { en: 'Playwright and axe-core', bg: 'Playwright и axe-core' },
        by: 'Microsoft; Deque Systems',
        url: 'https://github.com/microsoft/playwright',
        license: 'Apache-2.0; MPL-2.0',
        kind: 'used',
        use: {
          en: 'End-to-end and accessibility tests, and the renderer for the CV and Open Graph cards. Development only.',
          bg: 'Тестовете от край до край и за достъпност, и изобразяването на CV-то и картите за споделяне. Само при разработка.',
        },
      },
      {
        name: 'Caddy',
        by: { en: 'Matthew Holt and contributors', bg: 'Matthew Holt и сътрудници' },
        url: 'https://github.com/caddyserver/caddy',
        license: 'Apache-2.0',
        kind: 'used',
        use: {
          en: 'Serves the built pages in production with the security and cache headers.',
          bg: 'Сървърът, който обслужва публикуваните страници със заглавките за сигурност и кеширане.',
        },
      },
    ],
  },
];

/** The credits that belong to one case study (its "Built with" block). */
export const creditsFor = (slug: string) => credits.find((group) => group.project === slug);
