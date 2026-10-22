---
name: Malrynth
order: 5
tier: A
accent: malrynth
kicker: Operating system written from scratch in Rust
signature: 'A 42,496-byte UEFI loader, byte-reproducible across hosts, hands a checked BootInfo v1 to a kernel with zero dependencies.'
summary: An independent x86-64 operating system with its own loader and kernel. A Rust UEFI loader hands a validated boot contract to a dependency-free kernel that owns physical memory, and CI boot-tests it under QEMU and OVMF.
description: 'Case study of Malrynth: a from-scratch x86-64 OS in Rust with its own UEFI loader, a versioned boot ABI, a frame allocator and reproducible, boot-tested builds.'
seoTitle: 'Malrynth: x86-64 operating system in Rust'
status: prototype
statusNote: Boot milestone complete, physical memory merged
started: 2026-08
role: Founder and sole developer
context: Long-term personal systems project, private repository
layers: [system]
stack: [rust, uefi, x86, qemu, python, githubactions, linux, windows]
links:
  repoNote: Private repository
spec:
  - { label: Language, value: 'Rust 1.97 stable, pinned; no nightly features' }
  - { label: Targets, value: 'x86_64-unknown-uefi (loader), x86_64-unknown-none (kernel)' }
  - { label: Crates, value: '3: boot ABI, UEFI loader, kernel; the kernel has zero dependencies' }
  - { label: Loader, value: '42,496-byte PE32+ application, byte-reproducible' }
  - { label: Handoff, value: 'BootInfo v1: repr(C), magic, version and size checked' }
  - { label: Memory, value: 'Canonical ownership map and a two-bitmap frame allocator' }
  - { label: Verification, value: 'Repeated QEMU and OVMF boots, panic path, reproducibility' }
  - { label: Tests, value: '22 Rust unit tests, 67 tooling tests, 2 CI workflows' }
  - { label: Design, value: '6 ADRs, an M0 to M7 roadmap, 107 design documents' }
highlights:
  - Not a Linux distribution. Malrynth has its own loader and kernel, and Linux is only a development host.
  - The kernel trusts nothing the firmware hands it. The memory map is re-validated and canonicalised before use.
  - A boot passes only on an exact serial marker. CI also boots a build that must panic, and fault-injection runs are documented.
  - Builds are byte-reproducible across paths and hosts, and a test enforces it.
built:
  - title: Boot
    points:
      - malboot, a UEFI application with its own bounds-checked ELF64 loader that accepts only a static x86-64 executable.
      - The kernel is placed at an exact physical address. If the firmware cannot provide it, the loader refuses rather than relocating.
      - Framebuffer and ACPI RSDP discovery, handoff memory allocated in advance, and a memory-map pre-flight with headroom before ExitBootServices.
  - title: Kernel
    points:
      - A no_std, no_main kernel with zero external crates, a custom linker script and separate executable, read-only and writable segments.
      - Handoff validation (pointer, magic, version, size, load address) and a polled 16550 serial console.
      - Physical memory ownership. The firmware map is treated as untrusted, canonicalised with explicit reservations and managed by a two-bitmap frame allocator that checks itself on every boot.
      - A panic handler with a validated frame-pointer backtrace, symbolised on the host so no symbol parser runs in the kernel.
  - title: Tooling and verification
    points:
      - Build, run and test tooling for Linux (Bash) and native Windows (Python), with a contract test that fails when their compiler flags drift apart.
      - QEMU and OVMF boot tests that pass only on an exact success marker, plus panic-path and byte-reproducibility checks, all in CI.
      - Secret scanning, SHA-pinned CI actions, a committed lockfile and a ledger for every third-party dependency.
  - title: Architecture and governance
    points:
      - A constitution, 6 ADRs that must record rejected alternatives, an M0 to M7 roadmap and a threat model.
      - Design specifications for capabilities, IPC, drivers, storage, UI and compatibility, each labelled with its real status.
diagrams: [malrynth-boot]
architecture: Today the system has three layers, firmware, a Rust UEFI loader and a kernel that owns physical memory. Everything above that (paging, interrupts, scheduling, userspace, drivers, desktop) is specified in milestones and not built yet.
hard:
  - title: Failing well after ExitBootServices
    problem: After ExitBootServices there is no console, allocator or firmware to return to, so a late failure cannot even be reported.
    solution: The loader allocates all handoff memory in advance and checks that the final memory map will fit, with headroom, while it can still print a reason. After the exit it halts rather than returning to firmware that no longer exists.
  - title: Trusting the memory map
    problem: A firmware memory map can overlap, arrive unsorted or describe memory that must never be handed out.
    solution: The kernel recomputes every range with checked arithmetic, rounds usable RAM inward and reservations outward, lets reservations win overlaps, and sorts and merges the result without an allocator, using fixed scratch arrays.
  - title: Sparse memory and high MMIO
    problem: Holes in physical memory and device ranges far above RAM would inflate the allocator's bitmap and its accounting.
    solution: Frame numbers are compacted across holes, and host tests cover sparse RAM and high MMIO explicitly.
  - title: Reproducible binaries across hosts
    problem: The loader embedded absolute paths that path remapping could not reach, so builds differed between machines and directories.
    solution: Loader debug info was dropped and deterministic linker options were set. A structural PE differ found the remaining cross-host differences, and a test now enforces identical hashes.
  - title: Backtraces you can trust
    problem: A corrupted stack can produce a backtrace that looks plausible but is false.
    solution: Every frame is validated for alignment, direction and distance, the walk reports why it stopped, and a dedicated panic build proves the path in CI.
decisions:
  - decision: Its own kernel, never Linux underneath.
    why: Linux is a development host and a future compatibility target, never the kernel Malrynth runs on.
  - decision: Use uefi-rs, but only in the loader.
    why: A wrong firmware structure offset silently corrupts boot. The dependency stops running at ExitBootServices, so it never becomes part of the kernel's trusted base.
  - decision: Stable, pinned Rust with no nightly features.
    why: The build should not depend on unstable compiler features, and both targets ship precompiled core libraries.
  - decision: Refuse an oversized memory map rather than truncate it.
    why: A truncated map could let the allocator hand out firmware or device memory.
  - decision: Symbolise panics on the host.
    why: It keeps a symbol parser, which handles untrusted input, out of ring 0.
  - decision: The next milestone's direct map will cover classified RAM only.
    why: The boot contract carries no cacheability attributes, so mapping all physical space could mis-cache device memory.
now:
  - Boots under QEMU and OVMF through loader, handoff, kernel entry, serial diagnostics and physical memory ownership.
  - CI runs formatting, lints, 22 unit tests, repeated boots, a panic-path check and a reproducibility check.
  - Development tooling runs natively on both Windows and Linux.
next:
  - M1B, with Malrynth-owned page tables, a higher-half kernel, W^X, guarded stacks and a heap.
  - M1C to M1F, covering exceptions, the APIC and timer, ACPI tables and multiple cores.
  - M2 and later, bringing processes, a scheduler, system calls and userspace, then capabilities, IPC and drivers.
  - Moving from QEMU to a physical reference machine, which is researched on a separate branch.
learned:
  - A boot loader teaches you to decide early, while you can still report a failure.
  - Treat every input as untrusted, including the firmware.
  - A long vision needs short, testable milestones, or it stays a document.
notes:
  - The long-term vision (a desktop, identity, security, applications, device management, a developer platform and optional, provider-neutral AI) is written down as specifications. None of it is presented here as built.
---

Malrynth is my long-term operating-system project, an independent x86-64 OS with its own loader and kernel, written in Rust. It is not a Linux distribution and does not run on Linux underneath.

**Why it exists.** To understand the machine all the way down, and to design a platform on my own terms, with capability-based security, local accounts as first-class citizens and any AI integration optional and never in charge of security.

**Where it is.** Early, and stated plainly. The first milestone boots and reports diagnostics, and the kernel now owns physical memory. Paging, interrupts, scheduling and userspace are the next milestones.
