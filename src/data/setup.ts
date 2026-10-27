import type { L } from '@/i18n';

/**
 * The /setup page: four explorable machines, the decisions their limits
 * forced, the toolchain and a roadmap.
 *
 * Sources, recorded per part in `source`:
 *   machine  read from Windows on 2026-10-27 (CIM/WMI, PnP device ids,
 *            nvidia-smi, Get-PhysicalDisk, the Stream Deck app's profile);
 *            no serials, MAC or IP addresses were collected
 *   docs     measured and written down in a project repository
 *   owner    stated by me; the hardware cannot report it
 *
 * Links go to manufacturer pages checked on 2026-10-27 (no shops, prices or
 * affiliate links). A part without a verifiable official page has no link.
 * Specs are the manufacturer's or measured ones, never an achieved speed.
 * KObait hardware is described by area only (PRODUCT.md).
 */

export type Source = 'machine' | 'docs' | 'owner';
/** current: owned and in use · spare: owned, no role · past: replaced · planned: not bought */
export type Status = 'current' | 'spare' | 'past' | 'planned';
export type View = 'desk' | 'inside' | 'secondary' | 'laptop';

export interface Part {
  id: string;
  view: View;
  /** Number drawn next to the part in the schematic; omitted when not drawn. */
  n?: number;
  kind: L;
  /** Brand names stay as they are; a description is written per locale. */
  maker: string | L;
  model: string | L;
  purpose: L;
  specs: readonly L[];
  /** How it fits my work, only where the projects or the machine show it. */
  workflow?: L;
  status: Status;
  source: Source;
  /** Per locale when the maker has a page in each language. */
  link?: string | L;
  /** Case-study slugs this part is used for. */
  for?: readonly string[];
}

const t = (en: string, bg: string): L => ({ en, bg });

export const parts: readonly Part[] = [
  // ---------- Desk ----------
  {
    id: 'desk',
    view: 'desk',
    n: 1,
    kind: t('Desk', 'Бюро'),
    maker: 'Gudewill',
    model: t(
      'Electric height-adjustable desk, 160 × 76 cm',
      'Бюро с електрическа регулация на височината, 160 × 76 см',
    ),
    purpose: t(
      'Moves between sitting and standing height, so long sessions are not spent in one position.',
      'Сменя височината между седнало и право положение, за да не минават дългите сесии в една поза.',
    ),
    specs: [t('160 × 76 cm top, brown and black', 'Плот 160 × 76 см, кафяво и черно')],
    status: 'current',
    source: 'owner',
  },
  {
    id: 'chair',
    view: 'desk',
    n: 2,
    kind: t('Chair', 'Стол'),
    maker: 'Mark Adler',
    model: 'Expert 7.9 Black',
    purpose: t(
      'Ergonomic mesh office chair with a footrest.',
      'Ергономичен офис стол с мрежа и подложка за краката.',
    ),
    specs: [t('Black mesh, footrest', 'Черна мрежа, подложка за краката')],
    status: 'current',
    source: 'owner',
    link: 'https://markadler.pl/products/fotel-biurowy-z-podnozkiem-mark-adler-expert-79-black',
  },
  {
    id: 'monitors',
    view: 'desk',
    n: 3,
    kind: t('Monitors', 'Монитори'),
    maker: 'AOC',
    model: '2 × 27G42E',
    purpose: t(
      'Code and documentation on one screen, the running app, game or browser test on the other.',
      'Код и документация на единия екран, работещото приложение, игра или браузърен тест на другия.',
    ),
    specs: [
      t('27-inch Full HD Fast IPS, 180 Hz', '27 инча, Full HD, Fast IPS, 180 Hz'),
      t('Windows reports each one as “27G4”', 'Windows отчита всеки от тях като „27G4“'),
    ],
    status: 'current',
    source: 'machine',
    link: t(
      'https://www.aoc.com/uk/gaming/monitors/27g42e',
      'https://www.aoc.com/bg/gaming/monitors/27g42e',
    ),
    for: ['caelora', 'uss-x-academy', 'zone-32-19'],
  },
  {
    id: 'arm',
    view: 'desk',
    n: 4,
    kind: t('Monitor mount', 'Стойка за монитори'),
    maker: 'StableArm',
    model: 'Lifter Duo',
    purpose: t(
      'Holds both monitors above the desk, which frees the surface for the audio interface, Stream Deck and boards on the bench.',
      'Държи двата монитора над бюрото и освобождава плота за аудиоинтерфейса, Stream Deck и платките.',
    ),
    specs: [t('Dual-monitor arm', 'Стойка-рамо за два монитора')],
    status: 'current',
    source: 'owner',
  },
  {
    id: 'webcam',
    view: 'desk',
    n: 5,
    kind: t('Webcam', 'Уеб камера'),
    maker: 'ASUS',
    model: 'ROG Eye S',
    purpose: t('Video calls and on-camera tests.', 'Видеоразговори и тестове с камера.'),
    specs: [t('USB webcam with built-in microphones', 'USB уеб камера с вградени микрофони')],
    workflow: t(
      'Used in a 240-second physical test of the J.A.R.V.I.S. presence sensor, which stays off by default.',
      'Използвана в 240-секунден физически тест на сензора за присъствие на J.A.R.V.I.S., който по подразбиране е изключен.',
    ),
    status: 'current',
    source: 'machine',
    link: 'https://rog.asus.com/streaming-kits/rog-eye-s-model/',
    for: ['jarvis'],
  },
  {
    id: 'mic',
    view: 'desk',
    n: 6,
    kind: t('Microphone', 'Микрофон'),
    maker: 'RØDE',
    model: 'Procaster',
    purpose: t(
      'My main microphone for calls, recordings and voice tests.',
      'Основният ми микрофон за разговори, записи и гласови тестове.',
    ),
    specs: [
      t('Dynamic broadcast microphone, XLR output', 'Динамичен излъчвателен микрофон, XLR изход'),
      t(
        'Internal pop filter and capsule shock mounting',
        'Вграден поп филтър и окачване на капсулата',
      ),
    ],
    workflow: t(
      'Replaced a RØDE PodMic. Voice work for J.A.R.V.I.S. goes through it, via the audio interface.',
      'Замени RØDE PodMic. Гласовата работа по J.A.R.V.I.S. минава през него и аудиоинтерфейса.',
    ),
    status: 'current',
    source: 'owner',
    link: 'https://rode.com/en-bg/products/procaster',
    for: ['jarvis'],
  },
  {
    id: 'micarm',
    view: 'desk',
    n: 7,
    kind: t('Microphone arm and mount', 'Рамо и държач за микрофона'),
    maker: 'RØDE',
    model: 'PSA1+ · PSM1',
    purpose: t(
      'The PSA1+ arm brings the microphone close and swings it away; the PSM1 shock mount isolates it from desk knocks.',
      'Рамото PSA1+ доближава микрофона и го прибира; държачът PSM1 го изолира от удари по бюрото.',
    ),
    specs: [
      t(
        'PSA1+: 360° rotation, damped springs, cable management',
        'PSA1+: въртене на 360°, амортизирани пружини, прибиране на кабела',
      ),
      t('PSM1: shock mount', 'PSM1: антивибрационен държач'),
    ],
    status: 'current',
    source: 'owner',
    link: 'https://rode.com/en-bg/products/psa1-plus',
  },
  {
    id: 'interface',
    view: 'desk',
    n: 8,
    kind: t('Audio interface', 'Аудиоинтерфейс'),
    maker: 'Focusrite',
    model: 'Scarlett 2i2 4th Gen',
    purpose: t(
      'Powers the microphone chain: a proper preamp and gain set on hardware, then USB into Windows.',
      'Сърцето на звуковата верига: истински предусилвател и усилване на хардуера, после USB към Windows.',
    ),
    specs: [t('Two mic/line inputs, USB', 'Два микрофонни/линейни входа, USB')],
    workflow: t(
      'A quiet dynamic microphone needs real gain; setting it on the interface keeps the level clean before any software processing.',
      'Тихият динамичен микрофон има нужда от истинско усилване; когато е настроено на интерфейса, нивото е чисто още преди софтуерната обработка.',
    ),
    status: 'current',
    source: 'machine',
    link: 'https://eu.focusrite.com/products/scarlett-2i2',
    for: ['jarvis'],
  },
  {
    id: 'streamdeck',
    view: 'desk',
    n: 9,
    kind: t('Control deck', 'Контролен панел'),
    maker: 'Elgato',
    model: 'Stream Deck MK.2',
    purpose: t(
      'Programmable keys with their own icons: application shortcuts, multi-step actions, profiles and streaming controls through Elgato’s plugins.',
      'Програмируеми бутони със собствени икони: бързи клавиши за приложения, действия в няколко стъпки, профили и контрол на стрийма чрез плъгините на Elgato.',
    ),
    specs: [
      t('15 LCD keys in a 5 × 3 layout', '15 LCD бутона в подредба 5 × 3'),
      t('USB, swappable faceplate', 'USB, сменяем преден панел'),
    ],
    workflow: t(
      'Its one profile drives OBS Studio, Discord, a microphone mute toggle and media playback. It is not connected to my development tools or to J.A.R.V.I.S.',
      'Единственият му профил управлява OBS Studio, Discord, изключване на микрофона и възпроизвеждането на музика. Не е свързан с инструментите ми за разработка, нито с J.A.R.V.I.S.',
    ),
    status: 'current',
    source: 'owner',
    link: 'https://www.elgato.com/ww/en/p/stream-deck',
  },
  {
    id: 'keyboard',
    view: 'desk',
    n: 10,
    kind: t('Keyboard', 'Клавиатура'),
    maker: 'Cougar',
    model: 'Attack X3 RGB',
    purpose: t(
      'Mechanical keyboard for long writing and coding sessions.',
      'Механична клавиатура за дълги сесии с текст и код.',
    ),
    specs: [
      t(
        'Cherry MX mechanical switches, RGB backlight',
        'Механични бутони Cherry MX, RGB подсветка',
      ),
    ],
    status: 'current',
    source: 'machine',
    link: 'https://cougargaming.com/products/keyboards/attackx3_rgb/',
  },
  {
    id: 'mouse',
    view: 'desk',
    n: 11,
    kind: t('Mouse and mat', 'Мишка и подложка'),
    maker: 'Logitech · Razer',
    model: 'G502 HERO · Goliathus Chroma Extended',
    purpose: t(
      'A mouse with extra programmable buttons, on an extended RGB mat.',
      'Мишка с допълнителни програмируеми бутони, върху удължена RGB подложка.',
    ),
    specs: [
      t('Extended cloth mat with RGB lighting', 'Удължена текстилна подложка с RGB подсветка'),
    ],
    status: 'current',
    source: 'machine',
    link: 'https://www.logitechg.com/en-eu/shop/p/g502-hero-gaming-mouse.910-005470',
  },
  {
    id: 'tower',
    view: 'desk',
    n: 12,
    kind: t('Workstation', 'Работна станция'),
    maker: t('Custom build', 'Собствена конфигурация'),
    model: 'Ryzen 9 5900X · RTX 3080',
    purpose: t(
      'The PC everything on this site was built on. Open “Inside the PC” to explore it part by part.',
      'Компютърът, на който е създадено всичко на този сайт. Отворете „Вътре в компютъра“, за да го разгледате част по част.',
    ),
    specs: [
      t('Windows 11 Pro, 64 GB RAM, two NVMe SSDs', 'Windows 11 Pro, 64 GB RAM, два NVMe SSD'),
    ],
    status: 'current',
    source: 'machine',
    for: ['caelora', 'jarvis', 'uss-x-academy', 'zone-32-19', 'kobait'],
  },
  {
    id: 'camera',
    view: 'desk',
    n: 13,
    kind: t('Camera', 'Фотоапарат'),
    maker: 'Sony',
    model: 'Alpha a6400',
    purpose: t(
      'For project demos, development diaries, streaming and hardware close-ups.',
      'За демонстрации на проекти, дневници на разработката, стрийминг и близки кадри на хардуер.',
    ),
    specs: [t('Mirrorless camera', 'Безогледален фотоапарат')],
    workflow: t(
      'Not bought. It would also need a lens, a mount, continuous power and a way to get video into the PC; none of those are bought either.',
      'Не е купен. Ще трябват и обектив, стойка, постоянно захранване и начин видеото да стига до компютъра; нищо от това също не е купено.',
    ),
    status: 'planned',
    source: 'owner',
    link: 'https://www.sony.com/electronics/support/e-mount-body/ilce-6400/specifications',
  },
  {
    id: 'podmic',
    view: 'desk',
    kind: t('Previous microphone', 'Предишен микрофон'),
    maker: 'RØDE',
    model: 'PodMic',
    purpose: t(
      'My microphone before the Procaster, also a dynamic broadcast model.',
      'Микрофонът ми преди Procaster, също динамичен излъчвателен модел.',
    ),
    specs: [t('Dynamic, XLR', 'Динамичен, XLR')],
    status: 'past',
    source: 'owner',
    link: 'https://rode.com/en-bg/products/podmic',
  },

  // ---------- Inside the PC ----------
  {
    id: 'cpu',
    view: 'inside',
    n: 1,
    kind: t('Processor', 'Процесор'),
    maker: 'AMD',
    model: 'Ryzen 9 5900X',
    purpose: t(
      'Builds, tests, Docker, the local database and speech models, often all at once.',
      'Компилации, тестове, Docker, локалната база данни и гласовите модели, често едновременно.',
    ),
    specs: [t('12 cores, 24 threads, AM4', '12 ядра, 24 нишки, AM4')],
    workflow: t(
      'J.A.R.V.I.S. keeps speech on the CPU on purpose, so the GPU stays free for the language model.',
      'J.A.R.V.I.S. нарочно държи гласа на процесора, за да остане видеокартата свободна за езиковия модел.',
    ),
    status: 'current',
    source: 'machine',
    link: 'https://www.amd.com/en/products/processors/desktops/ryzen/5000-series/amd-ryzen-9-5900x.html',
    for: ['caelora', 'jarvis', 'uss-x-academy', 'zone-32-19'],
  },
  {
    id: 'cooler',
    view: 'inside',
    n: 2,
    kind: t('CPU cooling', 'Охлаждане на процесора'),
    maker: 'Corsair',
    model: 'H100i RGB Platinum',
    purpose: t(
      'All-in-one liquid cooler for the 12-core CPU under long builds.',
      'Течно охлаждане за 12-ядрения процесор при дълги компилации.',
    ),
    specs: [
      t(
        '240 mm radiator, two 120 mm ML PRO RGB fans',
        'Радиатор 240 мм, два вентилатора ML PRO RGB 120 мм',
      ),
      t('Pump and fans controlled in iCUE', 'Помпата и вентилаторите се управляват в iCUE'),
    ],
    status: 'current',
    source: 'owner',
    link: 'https://www.corsair.com/newsroom/press-release/corsair-launches-new-hydro-series-h100i-and-h115i-rgb-platinum-liquid-cpu-coolers',
  },
  {
    id: 'ram',
    view: 'inside',
    n: 3,
    kind: t('Memory', 'Памет'),
    maker: 'Kingston',
    model: 'FURY Beast DDR4, 4 × 16 GB',
    purpose: t(
      'Room for the Unity editor, several worktrees, Docker and browser tests at the same time.',
      'Място за редактора на Unity, няколко работни копия, Docker и браузърни тестове едновременно.',
    ),
    specs: [t('64 GB at 3200 MT/s', '64 GB при 3200 MT/s')],
    status: 'current',
    source: 'machine',
    link: 'https://www.kingston.com/en/memory/gaming/kingston-fury-beast-ddr4-memory',
    for: ['caelora', 'jarvis'],
  },
  {
    id: 'gpu',
    view: 'inside',
    n: 4,
    kind: t('Graphics', 'Видеокарта'),
    maker: 'NVIDIA',
    model: 'GeForce RTX 3080 10 GB',
    purpose: t(
      'Runs the local language model for J.A.R.V.I.S. and renders Caelora.',
      'Изпълнява локалния езиков модел на J.A.R.V.I.S. и рендира Caelora.',
    ),
    specs: [
      t('10,240 MiB VRAM, compute capability 8.6', '10 240 MiB видеопамет, compute capability 8.6'),
    ],
    workflow: t(
      'Only about 8 GB is free at idle, which is the tightest limit in the setup and decided which model J.A.R.V.I.S. runs.',
      'В покой свободни са само около 8 GB – това е най-тясното ограничение в цялата техника и то реши кой модел работи в J.A.R.V.I.S.',
    ),
    status: 'current',
    source: 'machine',
    link: 'https://www.nvidia.com/en-us/geforce/graphics-cards/30-series/rtx-3080-3080ti/',
    for: ['jarvis', 'caelora'],
  },
  {
    id: 'board',
    view: 'inside',
    n: 5,
    kind: t('Motherboard', 'Дънна платка'),
    maker: 'MSI',
    model: 'MPG X570 GAMING PLUS',
    purpose: t(
      'Ties it together; its spare PCIe slots made the Wi-Fi 7 and USB cards possible.',
      'Свързва всичко; свободните ѝ PCIe слотове направиха възможни картите за Wi-Fi 7 и USB.',
    ),
    specs: [t('AM4, X570 chipset, PCIe 4.0', 'AM4, чипсет X570, PCIe 4.0')],
    status: 'current',
    source: 'machine',
    link: 'https://www.msi.com/Motherboard/MPG-X570-Gaming-PLUS/Specification',
  },
  {
    id: 'ssd',
    view: 'inside',
    n: 6,
    kind: t('System and work drives', 'Системен и работен диск'),
    maker: 'Samsung',
    model: '990 EVO Plus 1 TB · 990 PRO 1 TB',
    purpose: t(
      'Repositories, worktrees, build caches and model files; the local model alone is about 5 GB.',
      'Хранилища, работни копия, кешове на компилации и файлове на модели; само локалният модел е около 5 GB.',
    ),
    specs: [t('Two NVMe SSDs on the board', 'Два NVMe SSD на платката')],
    status: 'current',
    source: 'machine',
    link: 'https://www.samsung.com/bg/memory-storage/nvme-ssd/990-evo-plus-1tb-nvme-pcie-gen-4-mz-v9s1t0bw/',
    for: ['caelora', 'jarvis'],
  },
  {
    id: 'hdd',
    view: 'inside',
    n: 7,
    kind: t('Bulk storage', 'Архив'),
    maker: 'Seagate · WD · Toshiba',
    model: 'SkyHawk 1 TB · Purple 1 TB · 500 GB',
    purpose: t(
      'Recordings, raw captures and archives that do not need SSD speed.',
      'Записи, необработени кадри и архиви, на които не им трябва скоростта на SSD.',
    ),
    specs: [t('Three SATA hard drives', 'Три SATA твърди диска')],
    status: 'current',
    source: 'machine',
  },
  {
    id: 'psu',
    view: 'inside',
    n: 8,
    kind: t('Power supply', 'Захранване'),
    maker: 'Super Flower',
    model: 'Leadex III Gold 850 W',
    purpose: t(
      'Steady power for the CPU, the RTX 3080 and the expansion cards.',
      'Стабилно захранване за процесора, RTX 3080 и картите за разширение.',
    ),
    specs: [
      t('80 PLUS Gold, fully modular', '80 PLUS Gold, напълно модулно'),
      t('140 mm fluid-dynamic-bearing fan', 'Вентилатор 140 мм с FDB лагер'),
    ],
    status: 'current',
    source: 'owner',
    link: 'https://www.super-flower.com.tw/products-detail/LIII-G/',
  },
  {
    id: 'wifi',
    view: 'inside',
    n: 9,
    kind: t('Wireless card', 'Безжична карта'),
    maker: 'GIGABYTE',
    model: 'GC-WIFI7 (Rev. 1.0)',
    purpose: t(
      'Adds Wi-Fi 7 and Bluetooth to a board that predates both.',
      'Добавя Wi-Fi 7 и Bluetooth към платка, по-стара и от двете.',
    ),
    specs: [
      t('PCIe ×1 · Wi-Fi 7 on 2.4, 5 and 6 GHz · MLO', 'PCIe ×1 · Wi-Fi 7 на 2,4, 5 и 6 GHz · MLO'),
      t(
        'Bluetooth 5.3 · 2T2R antenna · Windows 11 only',
        'Bluetooth 5.3 · антена 2T2R · само Windows 11',
      ),
    ],
    workflow: t(
      'Windows sees a Qualcomm FastConnect 7800 adapter. Multi-Link Operation keeps links on two bands at once, and 6 GHz needs a router that supports it. Its throughput is not measured, so no speed is quoted.',
      'Windows го вижда като адаптер Qualcomm FastConnect 7800. Multi-Link Operation държи връзка в две ленти едновременно, а за 6 GHz е нужен рутер, който я поддържа. Скоростта не е измерена, затова тук няма цифри.',
    ),
    status: 'current',
    source: 'machine',
    link: 'https://www.gigabyte.com/PC-Accessory/GC-WIFI7-rev-10',
  },
  {
    id: 'usb',
    view: 'inside',
    n: 10,
    kind: t('USB card', 'USB карта'),
    maker: 'JESWO',
    model: t('7-port PCIe to USB 3.0 card', 'PCIe карта със 7 порта USB 3.0'),
    purpose: t(
      'More USB ports for the audio interface, webcam, controllers and development boards.',
      'Повече USB портове за аудиоинтерфейса, уеб камерата, контролерите и платките за разработка.',
    ),
    specs: [
      t('Renesas µPD720201 controller', 'Контролер Renesas µPD720201'),
      t(
        'One PCIe 2.0 ×1 link, shared by all seven ports',
        'Една PCIe 2.0 ×1 връзка, обща за седемте порта',
      ),
    ],
    workflow: t(
      'An internal card, not a hub. Plenty for peripherals and serial boards; two fast drives copying at once would share one lane.',
      'Вътрешна карта, а не хъб. Предостатъчно за периферия и платки със серийна връзка; два бързи диска, които копират едновременно, ще делят една линия.',
    ),
    status: 'current',
    source: 'machine',
    link: 'https://www.jeswo.com/',
    for: ['kobait'],
  },

  // ---------- Secondary PC ----------
  {
    id: 'old-board',
    view: 'secondary',
    n: 1,
    kind: t('Motherboard', 'Дънна платка'),
    maker: 'ASRock',
    model: 'H81M',
    purpose: t(
      'A Micro-ATX board from the Haswell era; its ports decide what the machine can still take.',
      'Micro-ATX платка от поколението Haswell; портовете ѝ определят какво още може да поеме машината.',
    ),
    specs: [
      t('Intel H81 chipset, LGA 1150, Micro-ATX', 'Чипсет Intel H81, LGA 1150, Micro-ATX'),
      t('2 × SATA3 6 Gb/s, 2 × SATA2 3 Gb/s', '2 × SATA3 6 Gb/s, 2 × SATA2 3 Gb/s'),
      t('2 × DDR3 slots, 16 GB maximum', '2 слота DDR3, максимум 16 GB'),
    ],
    status: 'spare',
    source: 'owner',
    link: 'https://www.asrock.com/mb/Intel/H81M/index.asp',
  },
  {
    id: 'old-cpu',
    view: 'secondary',
    n: 2,
    kind: t('Processor', 'Процесор'),
    maker: 'Intel',
    model: 'Core i7-4790K',
    purpose: t(
      'Four cores, eight threads: enough for light Linux services.',
      'Четири ядра, осем нишки: достатъчно за леки услуги под Linux.',
    ),
    specs: [t('4 cores, 8 threads, LGA 1150', '4 ядра, 8 нишки, LGA 1150')],
    status: 'spare',
    source: 'owner',
    link: 'https://www.intel.com/content/www/us/en/products/sku/80807/intel-core-i74790k-processor-8m-cache-up-to-4-40-ghz/specifications.html',
  },
  {
    id: 'old-ram',
    view: 'secondary',
    n: 3,
    kind: t('Memory', 'Памет'),
    maker: '—',
    model: '16 GB DDR3',
    purpose: t(
      'Enough for a few containers, not for large builds; it is already the board’s maximum.',
      'Достатъчно за няколко контейнера, но не и за големи компилации; това вече е максимумът на платката.',
    ),
    specs: [t('16 GB DDR3', '16 GB DDR3')],
    status: 'spare',
    source: 'owner',
  },
  {
    id: 'old-gpu',
    view: 'secondary',
    n: 4,
    kind: t('Graphics', 'Видеокарта'),
    maker: 'NVIDIA',
    model: 'GeForce GTX 1080 Ti 11 GB',
    purpose: t(
      'More VRAM than the main PC, which makes it interesting for a second model host.',
      'Повече видеопамет от основния компютър, което я прави интересна за втори хост на модели.',
    ),
    specs: [
      t(
        '11 GB VRAM, Pascal: no tensor cores, no bf16',
        '11 GB видеопамет, Pascal: без тензорни ядра и bf16',
      ),
      t('Runs in this board’s PCIe 2.0 ×16 slot', 'Работи в PCIe 2.0 ×16 слота на тази платка'),
    ],
    status: 'spare',
    source: 'owner',
    link: 'https://www.nvidia.com/en-gb/geforce/graphics-cards/geforce-gtx-1080-ti/',
  },
  {
    id: 'old-hdd',
    view: 'secondary',
    n: 5,
    kind: t('Storage', 'Дискове'),
    maker: '—',
    model: t('Two hard drives, 1 TB + 500 GB', 'Два твърди диска, 1 TB + 500 GB'),
    purpose: t(
      'The current system drive and the main bottleneck.',
      'Сегашният системен диск и основното тясно място.',
    ),
    specs: [t('1.5 TB in total; models not recorded', 'Общо 1,5 TB; моделите не са записани')],
    status: 'spare',
    source: 'owner',
  },
  {
    id: 'old-ssd',
    view: 'secondary',
    n: 6,
    kind: t('Planned upgrade', 'Планиран ъпгрейд'),
    maker: '—',
    model: t('2.5-inch SATA SSD, 1 TB or 2 TB', '2,5-инчов SATA SSD, 1 TB или 2 TB'),
    purpose: t(
      'Fixes the slow hard drives before the machine gets any role.',
      'Решава проблема с бавните дискове, преди машината да получи роля.',
    ),
    specs: [t('Not bought, not installed', 'Не е купен и не е монтиран')],
    workflow: t(
      'It should go on one of the two SATA3 (6 Gb/s) ports; a SATA2 port would cap it at half the speed. 1 TB covers an operating system, Docker images and a few models; 2 TB leaves room for backups and recordings.',
      'Трябва да се свърже към един от двата SATA3 порта (6 Gb/s); SATA2 порт би го ограничил до половината скорост. 1 TB стига за операционна система, Docker образи и няколко модела; 2 TB оставят място за резервни копия и записи.',
    ),
    status: 'planned',
    source: 'owner',
  },

  // ---------- Laptop ----------
  {
    id: 'nitro',
    view: 'laptop',
    n: 1,
    kind: t('Laptop', 'Лаптоп'),
    maker: 'Acer',
    model: 'Nitro AN515-52',
    purpose: t(
      'Portable development, and the machine that forced J.A.R.V.I.S. to work on Linux.',
      'Преносима разработка и машината, заради която J.A.R.V.I.S. трябваше да заработи под Linux.',
    ),
    specs: [t('15.6-inch gaming laptop', '15,6-инчов геймърски лаптоп')],
    status: 'current',
    source: 'docs',
    for: ['jarvis'],
  },
  {
    id: 'l-cpu',
    view: 'laptop',
    n: 2,
    kind: t('Processor', 'Процесор'),
    maker: 'Intel',
    model: 'Core i7-8750H',
    purpose: t(
      'Builds and tests the TypeScript core on Linux.',
      'Компилира и тества ядрото на TypeScript под Linux.',
    ),
    specs: [t('6 cores, 12 threads', '6 ядра, 12 нишки')],
    status: 'current',
    source: 'docs',
    link: 'https://www.intel.com/content/www/us/en/products/sku/134906/intel-core-i78750h-processor-9m-cache-up-to-4-10-ghz/specifications.html',
  },
  {
    id: 'l-gpu',
    view: 'laptop',
    n: 3,
    kind: t('Graphics', 'Видеокарта'),
    maker: 'NVIDIA',
    model: 'GeForce GTX 1050 Ti 4 GB',
    purpose: t(
      'Measured to fit roughly a 6B-parameter model at 4-bit: a development machine, not a model host.',
      'Измерено: побира приблизително модел с 6 милиарда параметъра при 4 бита – машина за разработка, а не хост на модели.',
    ),
    specs: [t('4 GB VRAM, compute capability 6.1', '4 GB видеопамет, compute capability 6.1')],
    status: 'current',
    source: 'docs',
  },
  {
    id: 'l-ram',
    view: 'laptop',
    n: 4,
    kind: t('Memory', 'Памет'),
    maker: '—',
    model: '24 GB',
    purpose: t(
      'Editor, Node and tests, without the game engine.',
      'Редактор, Node и тестове, без енджина на играта.',
    ),
    specs: [t('About 23,355 MB reported by Linux', 'Около 23 355 MB според Linux')],
    status: 'current',
    source: 'docs',
  },
  {
    id: 'l-ssd',
    view: 'laptop',
    n: 5,
    kind: t('System drive', 'Системен диск'),
    maker: 'Samsung',
    model: '970 EVO',
    purpose: t(
      'The NVMe drive the system and repositories run from.',
      'NVMe дискът, от който работят системата и хранилищата.',
    ),
    specs: [
      t(
        'Probably 500 GB; the capacity and exact model are not verified',
        'Вероятно 500 GB; капацитетът и точният модел не са проверени',
      ),
    ],
    status: 'current',
    source: 'owner',
    link: 'https://semiconductor.samsung.com/emea/consumer-storage/internal-ssd/970evo/',
  },
  {
    id: 'l-hdd',
    view: 'laptop',
    n: 6,
    kind: t('Second drive', 'Втори диск'),
    maker: 'Toshiba',
    model: t('Hard drive', 'Твърд диск'),
    purpose: t(
      'Extra space for files that do not need SSD speed.',
      'Допълнително място за файлове, на които не им трябва скоростта на SSD.',
    ),
    specs: [t('Capacity not verified', 'Капацитетът не е проверен')],
    status: 'current',
    source: 'owner',
  },
  {
    id: 'l-os',
    view: 'laptop',
    n: 7,
    kind: t('Operating system', 'Операционна система'),
    maker: '—',
    model: 'Ubuntu Linux',
    purpose: t(
      'GNOME on Wayland, Node 24, Git and the GitHub CLI.',
      'GNOME на Wayland, Node 24, Git и GitHub CLI.',
    ),
    specs: [
      t(
        'Ubuntu 26.04 LTS was recorded in August 2026; the current version is not verified',
        'През август 2026 г. е записана Ubuntu 26.04 LTS; сегашната версия не е проверена',
      ),
    ],
    status: 'current',
    source: 'docs',
  },
];

/** The views of the explorers, in page order. */
export const views: readonly View[] = ['desk', 'inside', 'secondary', 'laptop'];
export const partsIn = (view: View) => parts.filter((p) => p.view === view);

/** Possible roles for the secondary PC. None of them runs today. */
export const secondaryRoles: readonly L[] = [
  t('Linux home server and Docker host', 'Домашен сървър с Linux и Docker'),
  t('Backups and storage for recordings', 'Резервни копия и място за записите'),
  t('A CI or test runner for my repositories', 'CI или тестов агент за хранилищата ми'),
  t(
    'A second model host for J.A.R.V.I.S., thanks to its 11 GB GPU',
    'Втори хост на модели за J.A.R.V.I.S. заради видеокартата с 11 GB',
  ),
  t('A dedicated streaming PC', 'Отделен компютър за стрийминг'),
];

/** Honest costs of reusing old hardware. */
export const reuseLimits: readonly L[] = [
  t(
    'Higher idle power than a modern mini PC',
    'По-висока консумация в покой от съвременен мини компютър',
  ),
  t(
    'DDR3 and a 2014 CPU cap how much it can build or run',
    'DDR3 и процесор от 2014 г. ограничават колко може да компилира и изпълнява',
  ),
  t(
    'Hard drives are too slow until the SSD arrives',
    'Твърдите дискове са твърде бавни, докато не дойде SSD',
  ),
  t(
    '16 GB is already the board’s maximum, and its slots are PCIe 2.0',
    '16 GB вече са максимумът на платката, а слотовете ѝ са PCIe 2.0',
  ),
  t('One more machine to patch and maintain', 'Още една машина за обновяване и поддръжка'),
];

/** Problem → decision → implementation → trade-offs → result → lesson. */
export interface Decision {
  id: string;
  project: string;
  title: L;
  steps: readonly [L, L, L, L, L, L];
}

export const decisions: readonly Decision[] = [
  {
    id: 'vram',
    project: 'jarvis',
    title: { en: 'Fitting a local model into 10 GB', bg: 'Как локален модел се побира в 10 GB' },
    steps: [
      {
        en: 'The card has 10,240 MiB, but the desktop already holds about 1.9 GiB, so only 8,133 MiB is free at idle.',
        bg: 'Картата има 10 240 MiB, но работният плот вече държи около 1,9 GiB, така че свободни в покой са само 8133 MiB.',
      },
      {
        en: 'Qwen3-8B quantised to Q4_K_M with an 8K context. The 8-bit version was ruled out: its weights alone are 8.11 GiB.',
        bg: 'Qwen3-8B, квантизиран до Q4_K_M, с контекст 8K. Осембитовата версия отпадна: само теглата ѝ са 8,11 GiB.',
      },
      {
        en: 'A supervised llama.cpp server with its own CUDA 12.4 runtime next to the app; no system-wide CUDA toolkit.',
        bg: 'Наблюдаван llama.cpp сървър със собствен CUDA 12.4 runtime до приложението, без системно инсталиран CUDA toolkit.',
      },
      {
        en: 'A 16K context was measured at 6.93 GiB, leaving about 1 GiB: too thin, so it was rejected. A 4-bit model also gives up some quality.',
        bg: 'Контекст 16K беше измерен на 6,93 GiB и оставяше около 1 GiB – твърде малко, затова отпадна. Четирибитовият модел губи и част от качеството.',
      },
      {
        en: 'At 8K the model uses 5.8 GiB and leaves 2.2 GiB of headroom.',
        bg: 'При 8K моделът заема 5,8 GiB и оставя 2,2 GiB резерв.',
      },
      {
        en: 'Plan against free memory, not the number on the box.',
        bg: 'Планирай спрямо свободната памет, а не спрямо цифрата на кутията.',
      },
    ],
  },
  {
    id: 'speech',
    project: 'jarvis',
    title: {
      en: 'Speech on the CPU, reasoning on the GPU',
      bg: 'Гласът на процесора, мисленето на видеокартата',
    },
    steps: [
      {
        en: 'Would a speech engine fight the language model for the GPU and make the assistant stutter?',
        bg: 'Дали гласовият модел ще се бори с езиковия за видеокартата и асистентът ще започне да засича?',
      },
      {
        en: 'Speech runs on the 12-core CPU; the GPU belongs to the language model.',
        bg: 'Гласът работи на 12-ядрения процесор, а видеокартата е за езиковия модел.',
      },
      {
        en: 'The speech environment installs a CPU-only PyTorch, so it cannot drift onto CUDA by accident.',
        bg: 'В средата за глас е инсталиран PyTorch само за процесор, така че не може случайно да мине на CUDA.',
      },
      {
        en: 'Heavier voices are slower on a CPU: the most expressive one takes about 2.4 s to its first audio.',
        bg: 'По-тежките гласове са по-бавни на процесора: най-изразителният стига до първия звук за около 2,4 с.',
      },
      {
        en: 'With the model loaded, and even while it generated, the fast voice reached its first audio in about 275 ms, within noise of 283 ms without it. No dropouts, stalls or crashes.',
        bg: 'Със зареден модел, дори докато генерира, бързият глас стигаше до първия звук за около 275 мс – в рамките на шума спрямо 283 мс без него. Без прекъсвания, засичания и сривове.',
      },
      {
        en: 'Measure the contention before designing around it.',
        bg: 'Измери конкуренцията за ресурси, преди да проектираш около нея.',
      },
    ],
  },
  {
    id: 'portability',
    project: 'jarvis',
    title: { en: 'One codebase on Windows and Linux', bg: 'Един код за Windows и Linux' },
    steps: [
      {
        en: 'On the Ubuntu laptop, Windows assumptions failed quietly: a search for git.exe reported Git missing, CRLF files failed the formatter and registry readers returned nothing.',
        bg: 'На лаптопа с Ubuntu предположенията за Windows се проваляха тихо: търсенето на git.exe отчиташе, че Git липсва, файловете с CRLF не минаваха форматирането, а четенето от регистъра не връщаше нищо.',
      },
      {
        en: 'Windows stays the target, but both systems are development platforms, and anything Windows-only answers “unavailable” with a reason.',
        bg: 'Windows остава целевата система, но и двете са платформи за разработка, а всичко само за Windows отговаря „недостъпно“ с причина.',
      },
      {
        en: 'Executable names come from the platform, Git stores every text file with LF, and the CI workflow runs on Ubuntu and Windows.',
        bg: 'Имената на изпълнимите файлове се определят от платформата, Git пази всеки текстов файл с LF, а CI процесът работи под Ubuntu и Windows.',
      },
      {
        en: 'Linux reports warnings instead of a clean health check, by design.',
        bg: 'Под Linux проверката на състоянието показва предупреждения вместо чист резултат – нарочно.',
      },
      {
        en: 'The core builds and its tests run on both systems.',
        bg: 'Ядрото се компилира и тестовете му минават и на двете системи.',
      },
      {
        en: 'A plausible wrong answer is worse than a crash.',
        bg: 'Правдоподобният грешен отговор е по-лош от срив.',
      },
    ],
  },
  {
    id: 'headless',
    project: 'caelora',
    title: {
      en: 'Testing a game without opening the engine',
      bg: 'Тестване на игра, без да се отваря енджинът',
    },
    steps: [
      {
        en: 'Unity tests need the editor, which makes every check slow on a single desktop.',
        bg: 'Тестовете в Unity изискват редактора, а това прави всяка проверка бавна на един компютър.',
      },
      {
        en: 'The game rules live in assemblies with no reference to Unity.',
        bg: 'Правилата на играта са в асемблита, които не зависят от Unity.',
      },
      {
        en: 'Plain .NET projects compile the same source files, so the rules can be tested and benchmarked from the command line.',
        bg: 'Обикновени .NET проекти компилират същите изходни файлове, така че правилата се тестват и измерват от командния ред.',
      },
      {
        en: 'Presentation can only read the world and request changes, which means more interfaces to maintain.',
        bg: 'Визуализацията може само да чете света и да иска промени, което означава повече интерфейси за поддръжка.',
      },
      {
        en: 'The tree system’s 201 tests run headless; the last recorded full EditMode run had 6,293 tests and none failed.',
        bg: '201-те теста на дърветата минават headless; при последното записано пълно пускане в EditMode имаше 6293 теста и нито един не се провали.',
      },
      {
        en: 'Separate the rules from the engine on day one; later it is far harder.',
        bg: 'Отдели правилата от енджина още от първия ден – по-късно е много по-трудно.',
      },
    ],
  },
];

/** How a tool is used: every day, for one project, or installed but idle. */
export type Usage = 'daily' | 'project' | 'idle';

export interface Tool {
  name: string;
  usage: Usage;
  what: L;
}

export const tools: readonly Tool[] = [
  { name: 'Windows 11 Pro', usage: 'daily', what: { en: 'Main system', bg: 'Основна система' } },
  { name: 'Ubuntu 26.04 LTS', usage: 'project', what: { en: 'On the laptop', bg: 'На лаптопа' } },
  { name: 'VS Code', usage: 'daily', what: { en: 'Editor', bg: 'Редактор' } },
  {
    name: 'Git · worktrees',
    usage: 'daily',
    what: {
      en: 'One worktree per branch or agent',
      bg: 'Отделно работно копие за всеки клон или агент',
    },
  },
  {
    name: 'GitHub · Actions · CLI',
    usage: 'daily',
    what: { en: 'Repositories, CI, pull requests', bg: 'Хранилища, CI, pull requests' },
  },
  {
    name: 'Node.js 24 · TypeScript · npm · pnpm',
    usage: 'daily',
    what: { en: 'Web platforms, J.A.R.V.I.S.', bg: 'Уеб платформите, J.A.R.V.I.S.' },
  },
  {
    name: 'PostgreSQL 18',
    usage: 'daily',
    what: { en: 'Local database service', bg: 'Локална база данни' },
  },
  {
    name: 'Docker Desktop · WSL 2',
    usage: 'project',
    what: { en: 'Local services and images', bg: 'Локални услуги и образи' },
  },
  {
    name: 'Playwright · Vitest',
    usage: 'daily',
    what: { en: 'Automated tests', bg: 'Автоматизирани тестове' },
  },
  {
    name: 'Claude Code · Codex',
    usage: 'daily',
    what: {
      en: 'AI coding agents, under written rules',
      bg: 'AI агенти за програмиране, по писмени правила',
    },
  },
  { name: 'Unity 6 · C# · .NET 10', usage: 'project', what: { en: 'Caelora', bg: 'Caelora' } },
  {
    name: 'Python 3.14',
    usage: 'project',
    what: { en: 'Speech workers and tooling', bg: 'Гласови процеси и инструменти' },
  },
  {
    name: 'Rust',
    usage: 'project',
    what: {
      en: 'Malrynth, the J.A.R.V.I.S. desktop shell',
      bg: 'Malrynth, обвивката на J.A.R.V.I.S.',
    },
  },
  {
    name: 'llama.cpp · CUDA 12.4',
    usage: 'project',
    what: { en: 'Local model for J.A.R.V.I.S.', bg: 'Локалният модел на J.A.R.V.I.S.' },
  },
  {
    name: 'C++ · Arduino CLI',
    usage: 'project',
    what: { en: 'KObait firmware', bg: 'Фърмуерът на KObait' },
  },
  {
    name: 'Redis',
    usage: 'project',
    what: {
      en: 'In deployments, not installed locally',
      bg: 'В средите за внедряване, не локално',
    },
  },
  {
    name: 'Java 8',
    usage: 'idle',
    what: {
      en: 'Runtime only, not used for development',
      bg: 'Само среда за изпълнение, не се използва за разработка',
    },
  },
];

export type Stage = 'operational' | 'building' | 'past' | 'planned' | 'vision';

export interface Milestone {
  item: L;
  /** What it would enable, or which limit it addresses. Never a result. */
  why?: L;
}

export const roadmap: Record<Stage, readonly Milestone[]> = {
  operational: [
    {
      item: t(
        'Local Qwen3-8B on the RTX 3080 for selected J.A.R.V.I.S. requests',
        'Локален Qwen3-8B на RTX 3080 за избрани заявки в J.A.R.V.I.S.',
      ),
    },
    {
      item: t(
        'Push-to-talk voice and an opt-in wake word',
        'Глас с push-to-talk и дума за събуждане по желание',
      ),
    },
    {
      item: t(
        'Procaster and Scarlett chain for calls and recording',
        'Веригата Procaster и Scarlett за разговори и записи',
      ),
    },
    { item: t('A playable Windows build of Caelora', 'Играема версия на Caelora за Windows') },
    { item: t('The KObait test bench', 'Стендът за изпитване на KObait') },
  ],
  building: [
    {
      item: t('A new J.A.R.V.I.S. desktop window', 'Нов прозорец на J.A.R.V.I.S.'),
      why: t(
        'On an integration branch; real-hardware acceptance is still open.',
        'В интеграционен клон; приемането на реален хардуер предстои.',
      ),
    },
    {
      item: t('A multi-device link for J.A.R.V.I.S.', 'Връзка между устройства за J.A.R.V.I.S.'),
      why: t('Merged but switched off by default.', 'Слята, но изключена по подразбиране.'),
    },
    {
      item: t(
        'Creatures and villagers in Caelora’s valley',
        'Същества и селяни в долината на Caelora',
      ),
      why: t(
        'Tested core code that the game does not use yet.',
        'Тестван код в ядрото, който играта още не използва.',
      ),
    },
    {
      item: t(
        'KObait remote interface, second version',
        'Втора версия на интерфейса на дистанционното за KObait',
      ),
      why: t('Written, not yet on the hardware.', 'Написана, още не е качена на хардуера.'),
    },
  ],
  past: [
    {
      item: t('RØDE PodMic', 'RØDE PodMic'),
      why: t('Replaced by the Procaster.', 'Заменен от Procaster.'),
    },
    {
      item: t(
        'The laptop as the only development machine',
        'Лаптопът като единствен компютър за разработка',
      ),
      why: t(
        'August 2026; development moved back to the desktop.',
        'Август 2026 г.; разработката се върна на настолния компютър.',
      ),
    },
  ],
  planned: [
    {
      item: t(
        'A 1 TB or 2 TB SATA SSD for the secondary PC',
        'SATA SSD с 1 TB или 2 TB за втория компютър',
      ),
      why: t(
        'Removes the hard-drive bottleneck that rules out any server role today.',
        'Маха тясното място с твърдия диск, което днес изключва всяка сървърна роля.',
      ),
    },
    {
      item: t('A Linux home lab on that machine', 'Домашна лаборатория с Linux на тази машина'),
      why: t(
        'Docker services, backups and a CI runner away from the main PC.',
        'Docker услуги, резервни копия и CI агент извън основния компютър.',
      ),
    },
    {
      item: t('Sony a6400 for video', 'Sony a6400 за видео'),
      why: t(
        'Better image quality than a webcam for demos and development diaries.',
        'По-добро качество от уеб камера за демонстрации и дневници на разработката.',
      ),
    },
    {
      item: t('J.A.R.V.I.S. mobile companion', 'Мобилен придружител на J.A.R.V.I.S.'),
      why: t('So far only a design document.', 'Засега само проектен документ.'),
    },
    {
      item: t(
        'KObait water tests, starting tethered',
        'Изпитания на KObait във вода, първо с въже',
      ),
      why: t('The step after bench testing.', 'Следващата стъпка след изпитанията на стенд.'),
    },
  ],
  vision: [
    {
      item: t('A second model host for J.A.R.V.I.S.', 'Втори хост на модели за J.A.R.V.I.S.'),
      why: t(
        'The 11 GB GPU could take load the 10 GB card cannot.',
        'Видеокартата с 11 GB би поела това, което картата с 10 GB не може.',
      ),
    },
    {
      item: t('Streaming Caelora development', 'Стрийминг на разработката на Caelora'),
      why: t(
        'With the camera, the audio chain and possibly a second PC for encoding.',
        'С фотоапарата, звуковата верига и евентуално втори компютър за кодиране.',
      ),
    },
    {
      item: t(
        'A headless Caelora server, then multiplayer',
        'Headless сървър за Caelora, после мултиплейър',
      ),
      why: t(
        'The engine-free rules core was designed for this.',
        'Ядрото с правилата, независимо от енджина, е проектирано за това.',
      ),
    },
    {
      item: t('A next-generation embedded prototype', 'Следващо поколение вграден прототип'),
      why: t(
        'Better sensing, communication and reliability than KObait’s first build.',
        'По-добри сензори, връзка и надеждност от първата версия на KObait.',
      ),
    },
  ],
};
