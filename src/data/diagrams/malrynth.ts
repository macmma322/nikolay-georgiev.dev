import type { Diagram } from '@/lib/diagram';

/**
 * Source: macmma322/malrynth main @ e2732a4 (2026-08-27): core/boot/uefi,
 * core/abi, core/kernel (memory_boot.rs, memory/physical.rs), tools/test,
 * docs/roadmap/M1.md.
 * Layout: the loader runs left to right, the handoff turns down into the
 * kernel, serial markers run back to the harness, and the dashed bottom row
 * is the milestone plan.
 */
export const malrynthBoot: Diagram = {
  id: 'malrynth-boot',
  title: { en: 'Boot path, and what comes next', bg: 'Пътят на зареждане и какво следва' },
  caption: {
    en: 'What exists today: UEFI firmware loads malboot, which validates and places the kernel, prepares the handoff and exits boot services; the kernel validates the handoff, canonicalises the untrusted memory map and takes ownership of physical memory. The boot test passes only on an exact serial marker. The dashed row is the milestone plan and is not built yet.',
    bg: 'Какво съществува днес: UEFI фърмуерът зарежда malboot, който проверява ядрото, поставя го в паметта, подготвя данните за предаване и излиза от boot services; ядрото проверява предадените данни, привежда недоверената карта на паметта в канонична форма и поема управлението на физическата памет. Тестът за зареждане минава само при точен маркер по серийния порт. Пунктираният ред е планът по етапи и още не е изграден.',
  },
  cols: 5,
  rows: 4,
  nodes: [
    {
      id: 'fw',
      label: { en: 'UEFI firmware', bg: 'UEFI фърмуер' },
      sub: { en: 'OVMF on QEMU q35', bg: 'OVMF на QEMU q35' },
      kind: 'external',
      col: 0,
      row: 0,
    },
    {
      id: 'boot',
      label: { en: 'malboot', bg: 'malboot' },
      sub: {
        en: 'Rust UEFI app,\nown ELF64 parser',
        bg: 'UEFI приложение на Rust,\nсобствен ELF64 парсер',
      },
      kind: 'stage',
      col: 1,
      row: 0,
      emphasis: true,
    },
    {
      id: 'place',
      label: { en: 'Place kernel', bg: 'Поставяне на ядрото' },
      sub: {
        en: 'exact physical address;\nrefuse, never relocate',
        bg: 'точен физически адрес;\nотказва, не премества',
      },
      kind: 'stage',
      col: 2,
      row: 0,
    },
    {
      id: 'exit',
      label: { en: 'ExitBootServices', bg: 'ExitBootServices' },
      sub: {
        en: 'map pre-flighted with\nheadroom; no way back',
        bg: 'картата е подготвена\nс резерв; няма връщане',
      },
      kind: 'stage',
      col: 3,
      row: 0,
    },
    {
      id: 'abi',
      label: { en: 'BootInfo v1', bg: 'BootInfo v1' },
      sub: {
        en: 'repr(C), magic, version,\nsize, memory regions',
        bg: 'repr(C), magic, версия,\nразмер, зони на паметта',
      },
      kind: 'store',
      col: 4,
      row: 0,
    },
    {
      id: 'harness',
      label: { en: 'Boot test harness', bg: 'Тест на зареждането' },
      sub: {
        en: 'exact success marker,\nrepeated boots in CI',
        bg: 'точен маркер за успех,\nповторни зареждания в CI',
      },
      kind: 'service',
      col: 0,
      row: 1,
    },
    {
      id: 'serial',
      label: { en: 'COM1 serial', bg: 'Сериен порт COM1' },
      sub: { en: 'polled 16550 UART', bg: '16550 UART, без IRQ' },
      kind: 'hardware',
      col: 2,
      row: 1,
    },
    {
      id: 'entry',
      label: { en: 'Kernel _start', bg: '_start на ядрото' },
      sub: {
        en: 'no_std, zero crates;\nvalidates the handoff',
        bg: 'no_std, без крейтове;\nпроверява предаденото',
      },
      kind: 'stage',
      col: 4,
      row: 1,
    },
    {
      id: 'pmm',
      label: { en: 'Physical memory (M1A)', bg: 'Физическа памет (M1A)' },
      sub: {
        en: 'untrusted map canonicalised,\nbitmap frame allocator',
        bg: 'недоверената карта в канонична форма,\nалокатор на рамки с битови карти',
      },
      kind: 'service',
      col: 3,
      row: 2,
      colSpan: 2,
      emphasis: true,
    },
    {
      id: 'paging',
      label: { en: 'Page tables, higher half', bg: 'Таблици на страниците, горна половина' },
      sub: {
        en: 'M1B: W^X, guarded\nstacks, heap',
        bg: 'M1B: W^X, защитени\nстекове, динамична памет',
      },
      kind: 'service',
      col: 0,
      row: 3,
      colSpan: 2,
      planned: true,
      tag: { en: 'Next milestone', bg: 'Следващ етап' },
    },
    {
      id: 'irq',
      label: { en: 'Interrupts and time', bg: 'Прекъсвания и време' },
      sub: { en: 'M1C-F: IDT, APIC,\ntimer, SMP', bg: 'M1C-F: IDT, APIC,\nтаймер, SMP' },
      kind: 'service',
      col: 2,
      row: 3,
      planned: true,
    },
    {
      id: 'user',
      label: { en: 'Scheduler, userspace', bg: 'Планировчик, потребителско пространство' },
      sub: {
        en: 'M2+: processes, syscalls,\ncapabilities, IPC',
        bg: 'M2+: процеси, системни извиквания,\ncapabilities, IPC',
      },
      kind: 'service',
      col: 3,
      row: 3,
      colSpan: 2,
      planned: true,
    },
  ],
  edges: [
    { from: 'fw', to: 'boot', flow: true },
    { from: 'boot', to: 'place', flow: true },
    { from: 'place', to: 'exit', flow: true },
    { from: 'exit', to: 'abi', flow: true },
    { from: 'abi', to: 'entry', label: { en: 'rdi', bg: 'rdi' }, flow: true },
    { from: 'entry', to: 'pmm', fromSide: 'bottom', toSide: 'top', toOffset: 100 },
    {
      from: 'entry',
      to: 'serial',
      fromSide: 'left',
      toSide: 'right',
      label: { en: 'diagnostics', bg: 'диагностика' },
    },
    {
      from: 'serial',
      to: 'harness',
      fromSide: 'left',
      toSide: 'right',
      label: { en: 'markers', bg: 'маркери' },
    },
    { from: 'pmm', to: 'paging', fromSide: 'left', toSide: 'top', dashed: true },
    { from: 'paging', to: 'irq', dashed: true },
    { from: 'irq', to: 'user', dashed: true },
  ],
  tiers: [
    {
      label: { en: 'Firmware and loader', bg: 'Фърмуер и зареждащ модул' },
      nodes: ['fw', 'boot', 'place', 'exit'],
    },
    {
      label: { en: 'Handoff and kernel', bg: 'Предаване и ядро' },
      nodes: ['abi', 'entry', 'pmm', 'serial', 'harness'],
    },
    { label: { en: 'Next milestones', bg: 'Следващи етапи' }, nodes: ['paging', 'irq', 'user'] },
  ],
};
