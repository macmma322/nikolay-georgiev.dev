import type { L } from '@/i18n';

/**
 * The /setup page: hardware, environment, decisions and roadmap.
 *
 * Sources, recorded per item in `source`:
 *   machine  read from Windows on 2026-10-27 (CIM/WMI, PnP device ids,
 *            nvidia-smi, Get-PhysicalDisk); no serials, MACs or addresses
 *            were collected
 *   docs     measured and written down in a project repository
 *   owner    stated by me; the hardware cannot report it (a PSU, an analogue
 *            microphone, a cooler without a USB link)
 *
 * Product links go to manufacturer pages, checked on 2026-10-27; there are no
 * shop or affiliate links. Specs are the manufacturer's or measured ones, never
 * a claim of achieved speed. KObait hardware is named by kind (PRODUCT.md).
 */

export type Source = 'machine' | 'docs' | 'owner';
/** in-use: owned and in use · planned: not bought · spare: owned, waiting for a role */
export type Use = 'in-use' | 'planned' | 'spare';

export interface Part {
  id: string;
  kind: L;
  /** Brand and model; omitted where the model is deliberately not published. */
  name?: string;
  spec: L;
  note?: L;
  use: Use;
  source: Source;
  link?: string;
  /** Case-study slugs this part is used for (lights on hover). */
  for?: readonly string[];
}

export interface Group {
  id: string;
  label: L;
  title: L;
  lede: L;
  parts: readonly Part[];
}

export const groups: readonly Group[] = [
  {
    id: 'workstation',
    label: { en: '01 · Main workstation', bg: '01 · Основен компютър' },
    title: {
      en: 'One Windows desktop does most of the work',
      bg: 'Един настолен компютър с Windows върши основната работа',
    },
    lede: {
      en: 'Everything on this site was built here: the web platforms, the AI assistant, the game and the boat firmware. It is an AM4 build that I keep extending rather than replacing.',
      bg: 'Всичко на този сайт е създадено тук: уеб платформите, AI асистентът, играта и фърмуерът на лодката. Това е конфигурация на AM4, която продължавам да разширявам, вместо да сменям.',
    },
    parts: [
      {
        id: 'cpu',
        kind: { en: 'Processor', bg: 'Процесор' },
        name: 'AMD Ryzen 9 5900X',
        spec: { en: '12 cores, 24 threads', bg: '12 ядра, 24 нишки' },
        note: {
          en: 'Unity builds, Docker, local PostgreSQL and the speech models all run on the CPU at the same time; J.A.R.V.I.S. deliberately keeps speech here so the GPU stays free for the language model.',
          bg: 'Компилации в Unity, Docker, локален PostgreSQL и гласовите модели работят на процесора едновременно; J.A.R.V.I.S. нарочно държи гласа тук, за да остане видеокартата свободна за езиковия модел.',
        },
        use: 'in-use',
        source: 'machine',
        link: 'https://www.amd.com/en/products/processors/desktops/ryzen/5000-series/amd-ryzen-9-5900x.html',
        for: ['caelora', 'jarvis', 'uss-x-academy', 'zone-32-19'],
      },
      {
        id: 'gpu',
        kind: { en: 'Graphics', bg: 'Видеокарта' },
        name: 'NVIDIA GeForce RTX 3080',
        spec: {
          en: '10 GB VRAM, compute capability 8.6',
          bg: '10 GB видеопамет, compute capability 8.6',
        },
        note: {
          en: 'Runs the local model for J.A.R.V.I.S. through a CUDA build of llama.cpp and renders Caelora. The 10 GB is the tightest limit in the whole setup.',
          bg: 'Изпълнява локалния модел на J.A.R.V.I.S. чрез CUDA компилация на llama.cpp и рендира Caelora. Десетте гигабайта са най-тясното ограничение в цялата конфигурация.',
        },
        use: 'in-use',
        source: 'machine',
        link: 'https://www.nvidia.com/en-us/geforce/graphics-cards/30-series/rtx-3080-3080ti/',
        for: ['jarvis', 'caelora'],
      },
      {
        id: 'ram',
        kind: { en: 'Memory', bg: 'Памет' },
        name: 'Kingston FURY Beast DDR4',
        spec: { en: '64 GB: 4 × 16 GB at 3200 MT/s', bg: '64 GB: 4 × 16 GB при 3200 MT/s' },
        note: {
          en: 'Enough to keep the Unity editor, several worktrees, Docker and a browser test run open together.',
          bg: 'Достатъчно, за да са отворени заедно редакторът на Unity, няколко работни копия, Docker и браузърни тестове.',
        },
        use: 'in-use',
        source: 'machine',
        link: 'https://www.kingston.com/en/memory/gaming/kingston-fury-beast-ddr4-memory',
        for: ['caelora', 'jarvis'],
      },
      {
        id: 'board',
        kind: { en: 'Motherboard', bg: 'Дънна платка' },
        name: 'MSI MPG X570 GAMING PLUS',
        spec: { en: 'AM4, X570 chipset, PCIe 4.0', bg: 'AM4, чипсет X570, PCIe 4.0' },
        note: {
          en: 'Its spare PCIe slots are what make the Wi-Fi 7 and USB expansion cards possible.',
          bg: 'Свободните ѝ PCIe слотове правят възможни картите за Wi-Fi 7 и за допълнителни USB портове.',
        },
        use: 'in-use',
        source: 'machine',
        link: 'https://www.msi.com/Motherboard/MPG-X570-GAMING-PLUS',
      },
      {
        id: 'nvme',
        kind: { en: 'System and work drives', bg: 'Системен и работен диск' },
        name: 'Samsung 990 PRO 1 TB · Samsung 990 EVO Plus 1 TB',
        spec: { en: 'Two NVMe SSDs', bg: 'Два NVMe SSD диска' },
        note: {
          en: 'Repositories, worktrees, build caches and model files live on NVMe; the local model alone is about 5 GB.',
          bg: 'Хранилищата, работните копия, кешовете на компилациите и файловете на моделите са на NVMe; само локалният модел е около 5 GB.',
        },
        use: 'in-use',
        source: 'machine',
        link: 'https://semiconductor.samsung.com/consumer-storage/internal-ssd/990-evo-plus/',
        for: ['caelora', 'jarvis'],
      },
      {
        id: 'hdd',
        kind: { en: 'Bulk storage', bg: 'Архив' },
        name: 'Seagate SkyHawk 1 TB · WD Purple 1 TB · Toshiba 500 GB',
        spec: { en: 'Three SATA hard drives', bg: 'Три SATA твърди диска' },
        note: {
          en: 'Recordings, raw captures and archives that do not need SSD speed.',
          bg: 'Записи, необработени кадри и архиви, на които не им трябва скоростта на SSD.',
        },
        use: 'in-use',
        source: 'machine',
      },
      {
        id: 'cooling',
        kind: { en: 'Cooling and power', bg: 'Охлаждане и захранване' },
        name: 'Corsair liquid cooler · 850 W 80 PLUS Gold PSU',
        spec: { en: 'Exact models not recorded yet', bg: 'Точните модели още не са записани' },
        use: 'in-use',
        source: 'owner',
      },
      {
        id: 'os',
        kind: { en: 'Operating system', bg: 'Операционна система' },
        name: 'Windows 11 Pro',
        spec: { en: 'With WSL 2 for Docker Desktop', bg: 'С WSL 2 за Docker Desktop' },
        use: 'in-use',
        source: 'machine',
      },
      {
        id: 'displays',
        kind: { en: 'Displays and input', bg: 'Монитори и периферия' },
        name: '2 × AOC 27G4 · Logitech G502 HERO · Cougar Attack X3',
        spec: {
          en: 'Two 27-inch monitors, mouse and mechanical keyboard',
          bg: 'Два 27-инчови монитора, мишка и механична клавиатура',
        },
        note: {
          en: 'The monitors and mouse are identified by the system; the keyboard reports itself only as a generic device.',
          bg: 'Мониторите и мишката се разпознават от системата; клавиатурата се представя само като общо устройство.',
        },
        use: 'in-use',
        source: 'machine',
        link: 'https://www.logitechg.com/en-us/products/gaming-mice/g502-hero-gaming-mouse.html',
      },
    ],
  },
  {
    id: 'audio',
    label: { en: '02 · Audio and camera', bg: '02 · Звук и камера' },
    title: {
      en: 'A broadcast microphone on a real interface',
      bg: 'Излъчвателен микрофон през истински аудиоинтерфейс',
    },
    lede: {
      en: 'Calls, recordings and voice tests for J.A.R.V.I.S. all go through the same chain. A dynamic microphone with an XLR cable needs a proper preamp, which is what the interface is for.',
      bg: 'Разговорите, записите и гласовите тестове на J.A.R.V.I.S. минават през една и съща верига. Динамичен микрофон с XLR кабел има нужда от истински предусилвател и точно за това е интерфейсът.',
    },
    parts: [
      {
        id: 'mic',
        kind: { en: 'Microphone', bg: 'Микрофон' },
        name: 'RØDE Procaster',
        spec: { en: 'Dynamic, end-address, XLR', bg: 'Динамичен, с челно насочване, XLR' },
        note: {
          en: 'My main microphone, on a RØDE boom arm with a shock mount.',
          bg: 'Основният ми микрофон, на стойка-рамо на RØDE с антивибрационен държач.',
        },
        use: 'in-use',
        source: 'owner',
        link: 'https://rode.com/en/microphones/broadcast/procaster',
        for: ['jarvis'],
      },
      {
        id: 'interface',
        kind: { en: 'Audio interface', bg: 'Аудиоинтерфейс' },
        name: 'Focusrite Scarlett 2i2 4th Gen',
        spec: { en: 'Two mic/line inputs, USB', bg: 'Два микрофонни/линейни входа, USB' },
        note: {
          en: 'Gain is set on the interface, not in software, so a quiet dynamic microphone reaches a usable level before any processing.',
          bg: 'Усилването се настройва на интерфейса, а не в софтуера, така че тих динамичен микрофон достига използваемо ниво преди всякаква обработка.',
        },
        use: 'in-use',
        source: 'machine',
        link: 'https://focusrite.com/products/scarlett-2i2',
        for: ['jarvis'],
      },
      {
        id: 'webcam',
        kind: { en: 'Webcam', bg: 'Уеб камера' },
        name: 'ASUS ROG Eye S',
        spec: {
          en: 'USB webcam with built-in microphones',
          bg: 'USB уеб камера с вградени микрофони',
        },
        note: {
          en: 'Used for calls, and in a 240-second physical test of the J.A.R.V.I.S. presence sensor, which stays off by default.',
          bg: 'Използва се за разговори и в 240-секунден физически тест на сензора за присъствие на J.A.R.V.I.S., който по подразбиране е изключен.',
        },
        use: 'in-use',
        source: 'machine',
        for: ['jarvis'],
      },
      {
        id: 'camera',
        kind: { en: 'Camera', bg: 'Фотоапарат' },
        name: 'Sony Alpha a6400',
        spec: {
          en: 'Mirrorless camera, not bought yet',
          bg: 'Безогледален фотоапарат, още не е купен',
        },
        note: {
          en: 'For project demos, development diaries and hardware close-ups. It would also need a lens, a mount, continuous power and a capture path into the PC; none of those are bought either.',
          bg: 'За демонстрации на проекти, дневници на разработката и близки кадри на хардуер. Ще са нужни и обектив, стойка, постоянно захранване и начин за подаване на картината към компютъра; нищо от това също не е купено.',
        },
        use: 'planned',
        source: 'owner',
      },
    ],
  },
  {
    id: 'expansion',
    label: { en: '03 · Connectivity and expansion', bg: '03 · Свързаност и разширения' },
    title: {
      en: 'Two cards that added what the board lacked',
      bg: 'Две карти, които добавиха липсващото на платката',
    },
    lede: {
      en: 'The X570 board predates Wi-Fi 7 and runs short of USB ports with a microphone interface, a webcam, two boat controllers and test hardware attached. Both gaps were filled with PCIe cards rather than a new board.',
      bg: 'Платката X570 е по-стара от Wi-Fi 7 и не ѝ стигат USB портовете, когато са включени аудиоинтерфейс, уеб камера, двата контролера на лодката и тестов хардуер. И двете липси са запълнени с PCIe карти вместо с нова платка.',
    },
    parts: [
      {
        id: 'wifi',
        kind: { en: 'Wireless', bg: 'Безжична мрежа' },
        name: 'GIGABYTE GC-WIFI7 (Rev. 1.0)',
        spec: {
          en: 'PCIe ×1 · Wi-Fi 7 on 2.4, 5 and 6 GHz · MLO · Bluetooth 5.3 · 2T2R antenna',
          bg: 'PCIe ×1 · Wi-Fi 7 на 2,4, 5 и 6 GHz · MLO · Bluetooth 5.3 · антена 2T2R',
        },
        note: {
          en: 'The system sees a Qualcomm FastConnect 7800 adapter. Multi-Link Operation lets the card hold links on two bands at once, and the 6 GHz band only works with a router that supports it. I have not measured its throughput, so no speed figure is quoted here; it also gives the PC Bluetooth.',
          bg: 'Системата го разпознава като адаптер Qualcomm FastConnect 7800. Multi-Link Operation позволява връзка в две честотни ленти едновременно, а лентата 6 GHz работи само с рутер, който я поддържа. Не съм измервал скоростта, затова тук няма цифри; картата дава на компютъра и Bluetooth.',
        },
        use: 'in-use',
        source: 'machine',
        link: 'https://www.gigabyte.com/PC-Accessory/GC-WIFI7-rev-10',
      },
      {
        id: 'usb',
        kind: { en: 'USB expansion', bg: 'Допълнителни USB портове' },
        name: 'JESWO 7-port PCIe to USB 3.0 card',
        spec: {
          en: 'Renesas µPD720201 controller · one PCIe 2.0 ×1 link',
          bg: 'Контролер Renesas µPD720201 · една PCIe 2.0 ×1 връзка',
        },
        note: {
          en: 'An internal card, not an external hub. Windows reports its link as PCIe 2.0 ×1, so all seven ports share that one lane: plenty for keyboards, controllers and serial boards, but two fast drives copying at once would share it.',
          bg: 'Вътрешна карта, а не външен хъб. Windows отчита връзката ѝ като PCIe 2.0 ×1, така че седемте порта делят една линия: предостатъчно за клавиатури, контролери и платки със серийна връзка, но два бързи диска, които копират едновременно, ще си я поделят.',
        },
        use: 'in-use',
        source: 'machine',
        link: 'https://www.renesas.com/en/products/upd720201',
        for: ['kobait'],
      },
    ],
  },
  {
    id: 'secondary',
    label: { en: '04 · Secondary PC', bg: '04 · Втори компютър' },
    title: { en: 'Older hardware, waiting for a job', bg: 'По-стар хардуер, който чака задача' },
    lede: {
      en: 'My previous desktop still works. It has no role yet, and everything listed for it below is a possibility, not something that runs today.',
      bg: 'Предишният ми настолен компютър още работи. Засега няма роля и всичко, изброено за него по-долу, е възможност, а не нещо, което работи днес.',
    },
    parts: [
      {
        id: 'old-pc',
        kind: { en: 'Desktop', bg: 'Настолен компютър' },
        name: 'Intel Core i7-4790K · NVIDIA GTX 1080 Ti 11 GB · 16 GB DDR3',
        spec: { en: 'Hard drive only', bg: 'Само твърд диск' },
        note: {
          en: 'The 11 GB of VRAM is more than the main PC has, which makes it interesting as a second inference machine, even though its Pascal GPU lacks tensor cores and bf16.',
          bg: 'Единадесетте гигабайта видеопамет са повече, отколкото има основният компютър, и това го прави интересен като втора машина за изпълнение на модели, въпреки че видеокартата му е Pascal и няма тензорни ядра и bf16.',
        },
        use: 'spare',
        source: 'owner',
      },
      {
        id: 'old-ssd',
        kind: { en: 'Planned upgrade', bg: 'Планиран ъпгрейд' },
        name: '2.5-inch SATA SSD, 1 TB or 2 TB',
        spec: { en: 'Not bought', bg: 'Не е купен' },
        note: {
          en: '1 TB is enough for an operating system, Docker images and a few models; 2 TB leaves room for backups and recordings. Before buying, the free drive bay, SATA ports and power connectors need checking.',
          bg: '1 TB стига за операционна система, Docker образи и няколко модела; 2 TB оставят място за резервни копия и записи. Преди покупка трябва да се проверят свободното гнездо, SATA портовете и кабелите за захранване.',
        },
        use: 'planned',
        source: 'owner',
      },
    ],
  },
  {
    id: 'laptop',
    label: { en: '05 · Linux laptop', bg: '05 · Лаптоп с Linux' },
    title: {
      en: 'Where the code learned to leave Windows',
      bg: 'Къде кодът се научи да работи и извън Windows',
    },
    lede: {
      en: 'For a stretch of August 2026 the laptop was my only machine, so J.A.R.V.I.S. had to build, test and run on Ubuntu as well.',
      bg: 'За известно време през август 2026 г. лаптопът беше единственият ми компютър, затова J.A.R.V.I.S. трябваше да се компилира, тества и работи и под Ubuntu.',
    },
    parts: [
      {
        id: 'nitro',
        kind: { en: 'Laptop', bg: 'Лаптоп' },
        name: 'Acer Nitro AN515-52',
        spec: {
          en: 'Intel Core i7-8750H · GTX 1050 Ti 4 GB · 24 GB RAM · Ubuntu 26.04 LTS',
          bg: 'Intel Core i7-8750H · GTX 1050 Ti 4 GB · 24 GB RAM · Ubuntu 26.04 LTS',
        },
        note: {
          en: 'Measured in August: the 4 GB Pascal GPU fits roughly a 6B-parameter model at 4-bit, so it is a development machine, not an inference host.',
          bg: 'Измерено през август: видеокартата Pascal с 4 GB събира приблизително модел с 6 милиарда параметъра при 4 бита, така че това е машина за разработка, а не за изпълнение на модели.',
        },
        use: 'in-use',
        source: 'docs',
        for: ['jarvis'],
      },
    ],
  },
  {
    id: 'bench',
    label: { en: '06 · Electronics bench', bg: '06 · Работна маса за електроника' },
    title: {
      en: 'Hardware that has to fail safely',
      bg: 'Хардуер, който трябва да отказва безопасно',
    },
    lede: {
      en: 'The KObait boat and its remote are built and tested here. The parts are named by kind on purpose, so this site is not a shopping list for copying the boat.',
      bg: 'Лодката KObait и нейното дистанционно се сглобяват и тестват тук. Частите са назовани само по вид нарочно, за да не е сайтът списък за покупки, по който лодката да се копира.',
    },
    parts: [
      {
        id: 'boards',
        kind: { en: 'Controllers', bg: 'Контролери' },
        spec: {
          en: 'Two microcontroller boards: one in the boat, one in the handheld remote',
          bg: 'Две микроконтролерни платки: една в лодката и една в ръчното дистанционно',
        },
        use: 'in-use',
        source: 'owner',
        for: ['kobait'],
      },
      {
        id: 'modules',
        kind: { en: 'Modules', bg: 'Модули' },
        spec: {
          en: 'Long-range radio modules, a GPS module, a gyro module, displays and ESC motor controllers',
          bg: 'Радиомодули с голям обхват, GPS модул, жироскопичен модул, дисплеи и ESC контролери за моторите',
        },
        note: {
          en: 'Everything is bench-tested only. The boat has not been on the water yet.',
          bg: 'Всичко е изпитано само на стенд. Лодката още не е пускана на вода.',
        },
        use: 'in-use',
        source: 'owner',
        for: ['kobait'],
      },
    ],
  },
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

export type Stage = 'operational' | 'building' | 'planned' | 'vision';

export const roadmap: Record<Stage, readonly L[]> = {
  operational: [
    {
      en: 'A local Qwen3-8B on the RTX 3080 answers selected low-risk J.A.R.V.I.S. requests',
      bg: 'Локален Qwen3-8B на RTX 3080 отговаря на избрани заявки с нисък риск в J.A.R.V.I.S.',
    },
    {
      en: 'Push-to-talk voice and an opt-in wake word',
      bg: 'Глас с push-to-talk и дума за събуждане по желание',
    },
    {
      en: 'The Procaster and Scarlett chain for calls and recording',
      bg: 'Веригата Procaster и Scarlett за разговори и записи',
    },
    { en: 'A playable Windows build of Caelora', bg: 'Играема версия на Caelora за Windows' },
    { en: 'The KObait bench rig', bg: 'Стендът за KObait' },
  ],
  building: [
    {
      en: 'A new J.A.R.V.I.S. desktop window, on an integration branch',
      bg: 'Нов прозорец на J.A.R.V.I.S., в интеграционен клон',
    },
    {
      en: 'A multi-device link for J.A.R.V.I.S., merged but switched off',
      bg: 'Връзка между няколко устройства за J.A.R.V.I.S., слята, но изключена',
    },
    {
      en: 'Creatures and villagers in Caelora’s playable valley',
      bg: 'Същества и селяни в играемата долина на Caelora',
    },
    {
      en: 'A second version of the KObait remote interface',
      bg: 'Втора версия на интерфейса на дистанционното на KObait',
    },
  ],
  planned: [
    {
      en: 'A SATA SSD for the secondary PC, then a Linux home server for Docker, backups and self-hosted services',
      bg: 'SATA SSD за втория компютър, а след това домашен сървър с Linux за Docker, резервни копия и собствени услуги',
    },
    {
      en: 'A Sony a6400 for project demos and development diaries',
      bg: 'Sony a6400 за демонстрации на проекти и дневници на разработката',
    },
    {
      en: 'A J.A.R.V.I.S. mobile companion, so far only a design document',
      bg: 'Мобилен придружител на J.A.R.V.I.S., засега само проектен документ',
    },
    {
      en: 'KObait water tests, starting tethered',
      bg: 'Изпитания на KObait във вода, първо с въже',
    },
  ],
  vision: [
    {
      en: 'The secondary PC’s 11 GB GPU as a second inference machine',
      bg: 'Видеокартата с 11 GB на втория компютър като втора машина за модели',
    },
    {
      en: 'Dual-PC streaming of Caelora development',
      bg: 'Стрийминг на разработката на Caelora с два компютъра',
    },
    {
      en: 'A headless Caelora server, then multiplayer',
      bg: 'Headless сървър за Caelora, а после мултиплейър',
    },
    {
      en: 'New sensors and microcontrollers for the next embedded prototype',
      bg: 'Нови сензори и микроконтролери за следващия вграден прототип',
    },
  ],
};
