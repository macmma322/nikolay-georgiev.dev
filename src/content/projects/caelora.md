---
name: Caelora
order: 1
tier: A
accent: caelora
kicker: Voxel fantasy sandbox game on Unity 6
signature: 'A background job’s mesh is accepted only while its version stamps are current, so it can never paint over a newer edit.'
summary: A native PC voxel sandbox set in a living medieval-fantasy valley. Unity 6 draws it; the voxel meshing, streaming, saves and living trees are my own code, on a deterministic rules core.
description: 'Case study of Caelora: a Unity 6 voxel sandbox with its own meshing pipeline, deterministic engine-free rules, crash-safe saves and living trees.'
seoTitle: 'Caelora: voxel fantasy sandbox game'
status: prototype
statusNote: Playable Windows build v0.1.0, in active development
started: 2026-10
role: Sole developer across design, architecture, game systems and integration
context: Own game, private repository
layers: [realtime, system]
stack: [unity, csharp, dotnet, python, claude, git]
links:
  repoNote: Private repository
spec:
  - { label: Engine, value: 'Unity 6 LTS with URP; Direct3D 12 on Windows' }
  - { label: Language, value: 'C#, with Burst, Jobs and Collections on hot paths' }
  - { label: Structure, value: '51 assemblies; the rules core has no engine references' }
  - { label: World, value: 'Versioned voxel sections, streamed and meshed in background jobs' }
  - { label: Determinism, value: '16.16 fixed-point noise, keyed RNG, a Python reference oracle' }
  - { label: Saves, value: 'Edited sections only, checksummed regions, one commit file' }
  - { label: Trees, value: 'One skeleton drives wood, leaves, structure and collision' }
  - { label: Tests, value: '6,293 EditMode tests in the last recorded full run, 0 failed' }
  - { label: Decisions, value: '41 ADRs and 21 benchmark records' }
  - { label: Size, value: 'About 238k lines of C#, roughly 108k of them tests' }
highlights:
  - Rules and rendering never trade places. An engine-free, deterministic authority owns the world; Unity only draws it and asks for changes through commands.
  - Chunk meshes are built by background jobs and accepted only while their version stamps are current, so the old mesh stays on screen until the new one is valid.
  - A crash cannot pair new world data with an old player. One commit file names every saved part with its size and checksum.
  - Trees grow, can be cut and fall, and all of it comes from one deterministic skeleton.
built:
  - title: World
    points:
      - Deterministic terrain generation on SplitMix64 hashing and 16.16 fixed-point maths, so managed code and Burst produce the same world on every machine.
      - Section streaming with an ownership state machine; Burst jobs fill mesh buffers in parallel and copy-on-write edits keep the previous mesh visible while remeshing.
      - Architectural blocks (stairs, slabs, beams, roofs) packed into a 32-bit block state, with faces clipped at shared boundaries by an 8-bit coverage mask.
      - 12 custom shaders for terrain, water, bark, foliage wind and block cracks.
  - title: Living trees
    points:
      - Procedural species from one generator, drawn as tube-mesh wood with leaf voxels at the tips.
      - Growth over time, verified in PlayMode and in a native Windows build.
      - Chopping and felling driven by a structural graph that decides the cut, what detaches, an integer fall curve with swept collision, saving mid-fall and the logs paid out.
  - title: Play
    points:
      - A playable First Valley with rivers, forests, a hotbar, survival vitals and field crafting.
      - A front-end shell, a loading screen and menus, with the main menu shown as v0.1.0.
  - title: Persistence and tooling
    points:
      - Double-buffered, checksummed region files written through a commit coordinator, with fault-injection tests.
      - Plain .NET projects compile the same source files without Unity for headless tests and benchmarks.
      - 21 benchmark records for streaming, meshing and simulation, and a scripted Windows release build.
diagrams: [caelora-world]
architecture: Two layers that never trade places. An engine-free authority owns the world and every rule; Unity owns only what is seen and heard. Commands go in; versioned sections and accepted meshes come out.
media:
  - src: ../../assets/media/caelora/caelora-valley.webp
    alt: A voxel valley seen past a large textured tree trunk; grass slopes, block trees and a stone-roofed building below.
    caption: A standalone build of the First Valley. In-engine capture.
    wide: true
  - src: ../../assets/media/caelora/caelora-oak.webp
    alt: A voxel oak with smooth, branching wooden limbs and clusters of leaf blocks at the ends of the branches, against a pale sky.
    caption: A mature oak. Tube-mesh branches follow the tree skeleton; leaf voxels sit at the tips.
    wide: false
  - src: ../../assets/media/caelora/caelora-forest.webp
    alt: Seven voxel trees of different species and shapes standing on a flat grass test plot, casting shadows.
    caption: Procedural tree species on a test plot.
    wide: false
  - src: ../../assets/media/caelora/caelora-river.webp
    alt: A river cutting through blocky brown terrain and green fields, with a hotbar of tools and rows of hearts and stamina at the bottom of the screen.
    caption: A Windows development build with the hotbar and survival vitals.
    wide: true
hard:
  - title: Background meshing without stale frames
    problem: Meshes are built on worker threads while the player keeps editing. A job that finishes late would paint an old shape over a newer edit, or leak its buffers.
    solution: Every section moves through an ownership state machine, and a finished mesh carries the epoch, content version and boundary revision it was built from. It is accepted only if all three are still current; edits are copy-on-write, so the previous mesh stays visible until the replacement is valid.
  - title: The same world on every machine
    figure: { value: '16.16', label: 'fixed-point noise, no floats' }
    problem: Floating-point results can differ between managed code, Burst-compiled code and processors, and a world seed has to produce the same terrain everywhere.
    solution: Terrain noise uses SplitMix64 hashing and 16.16 fixed-point maths with no floats at all, and a separate Python implementation serves as the oracle the C# output is checked against.
  - title: Saves that survive a crash
    problem: A world, a player and the other saved parts are written separately. A crash between two writes could pair new terrain with an old inventory.
    solution: Only edited sections are stored, as checksummed, double-buffered region files. A single commit file then names every part with its size and checksum, and loading trusts only a complete commit. Fault injection tests cover the crash points.
  - title: Trees that grow, break and fall
    problem: A tree is at once a mesh, leaf blocks, something to collide with and a structure that can be cut. Four separate models would drift apart.
    solution: One deterministic skeleton feeds all four. Its structural graph decides where a cut lands, what detaches and how the trunk falls on an integer fall curve with swept collision, and a falling tree is saved like any other state.
decisions:
  - decision: The rules live in engine-free assemblies.
    why: The same code can run in tests, in a command-line harness and later on a headless server. Presentation reads that state and requests changes; it never writes it.
  - decision: Store only edited sections, as full snapshots.
    why: A later version of the terrain generator can never change what a player has already built.
  - decision: No hash-order iteration in anything saved or authoritative.
    why: Dictionary order is not stable across runs; deterministic output has to be deterministic everywhere, not most of the time.
  - decision: One skeleton for every representation of a tree.
    why: The wood you see, the leaves, the collision and the cutting structure cannot disagree if they all come from the same data.
  - decision: One milestone, one worktree, one written record.
    why: Each milestone is a slice of the first valley and ends with tests, a benchmark where performance is touched, a save-and-reload check and an ADR for every new decision.
now:
  - A playable Windows build of the First Valley with terrain, rivers, forests, living trees that grow and fall, architectural blocks, survival vitals and field crafting.
  - Creatures, villager memory and combat exist as tested core code, but the game does not use them yet.
  - World audio, live water and newer menu work are on milestone branches, not merged.
next:
  - Bringing creatures and villagers into the playable valley.
  - A headless server on the engine-free authority, then multiplayer. Neither exists; the multiplayer screen is a placeholder and there is no networking code.
  - Villages, kingdoms and an economy, which are design documents today.
  - A public website and account platform (Astro, Angular, .NET), built locally and not deployed.
learned:
  - Separating the rules from the engine early means the same code can be tested headless, without opening Unity.
  - In a voxel engine most bugs are stale data. Anything a background job can see needs a version.
notes:
  - Much of Caelora’s code is written with AI coding agents (Claude Code and Codex) under rules I maintain in the repository, the same way as J.A.R.V.I.S. Design, architecture, review and integration are mine.
  - The screenshots here are in-engine captures. The menu background and loading video are generated art, and character models were generated and auto-rigged with a third-party tool.
---

Caelora is a native PC sandbox game set in a medieval-fantasy world made of blocks. You explore a living valley, cut trees that actually fall, build with stairs, slabs, beams and roofs, and survive. Every milestone is a slice of that first valley rather than a wider, thinner world.

**Why it exists.** It is the game I wanted to play, and the project where I learned what engine-side work really is: threading, determinism, memory ownership and saves that survive a crash.

**What it shows.** Unity draws the picture, but the world underneath is my own: a deterministic, engine-free rules core, a background meshing pipeline with version-checked results, crash-safe persistence and living trees, with an ADR for every decision and a benchmark wherever performance is touched.
