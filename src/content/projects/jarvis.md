---
name: J.A.R.V.I.S.
order: 3
tier: A
accent: jarvis
kicker: Local-first AI assistant
signature: 'On a 79-case adversarial set, the local model made six fluent claims of granted authority or completed changes. None were true; a postcondition now refuses such answers.'
summary: A private, local-first desktop assistant in which models choose what information helps, but never what the computer executes.
description: 'Case study of J.A.R.V.I.S.: a desktop assistant with compiled authority tiers, routing between a local Qwen model and frontier CLIs, durable memory and local voice.'
seoTitle: 'J.A.R.V.I.S.: local-first AI assistant'
status: active
statusNote: Private, single user, not released
started: 2026-08
role: Architect and sole human developer, directing AI coding agents
context: Personal system, private repository
layers: [ai, backend]
stack:
  [
    typescript,
    nodejs,
    sqlite,
    zod,
    rust,
    tauri,
    react,
    r3f,
    llamacpp,
    qwen,
    claude,
    mcp,
    python,
    whisper,
    piper,
    githubactions,
    windows,
    linux,
  ]
links:
  repoNote: Private repository
spec:
  - { label: Runtime, value: 'Node 24, strict TypeScript, npm workspaces' }
  - { label: Shape, value: '16 packages, 4 apps: CLI, MCP server, host, desktop' }
  - { label: Desktop, value: 'Tauri v2 shell in Rust, React 19 and React Three Fiber UI' }
  - { label: Local model, value: 'Qwen3-8B (Q4_K_M) on a supervised llama.cpp server' }
  - { label: Frontier, value: 'Claude Code CLI by default, Gemini when named; zero tools' }
  - { label: Authority, value: '100 compiled operations, executable ceiling at tier 2' }
  - { label: Memory, value: 'Markdown vault (authoritative), SQLite cache with 12 migrations' }
  - { label: Voice, value: 'faster-whisper, Piper, openWakeWord; English and Bulgarian' }
  - { label: Tests, value: '242 test files, about 4,900 test cases (integration branch)' }
highlights:
  - Models may choose what information helps. They never choose what the computer executes.
  - Answers that claim an action the runtime never took are refused before they are shown or spoken.
  - The window and the host talk over a parent-child pipe, so no local port is ever opened.
  - No transcript is ever stored. Tests assert that the columns do not exist.
built:
  - title: Authority and safety
    points:
      - A compiled registry of 100 operations with fixed tiers from 0 to 4. The executable ceiling is pinned at tier 2 in two packages and cross-checked by a test.
      - Ten operations sit at tier 2. The five reachable today are reversible file operations behind a single-use approval in the local UI, bound to a digest of the exact change, with drift-checked rollback.
      - A capability-claim postcondition that compares every model answer with receipts of what actually executed.
      - Provider CLIs spawned with argv arrays, no shell, zero tools and an environment allow-list.
  - title: Routing and intelligence
    points:
      - A deterministic cognitive router that scans for hazards first, matches 37 intents, detects English and Bulgarian and picks a FAST, SMART or DEEP lane.
      - A provider lane that answers without a model, with a local Qwen3-8B on a loopback llama.cpp server (fresh token per start), or with a frontier CLI.
      - A bounded agent loop with 21 read-only tools the model can request only by identifier, and result budgeting that drops detail before it drops subjects.
  - title: Memory and continuity
    points:
      - An Obsidian-compatible Markdown vault as the only authoritative memory, with SQLite (node:sqlite) as a cache that can be rebuilt from it.
      - A findings ledger of dated, deterministic observations with explicit supersession and contradiction records.
      - An activity timeline and continuity checkpoints labelled observed, model-inferred or user-confirmed. There are no screen, keystroke, clipboard or browser-history observers.
      - Governed memory admission. Models can propose memories; nothing becomes durable without review.
  - title: Desktop, voice and integration
    points:
      - A Tauri v2 shell that exposes one command behind a compiled method gate, with a strict window CSP, tray and single-instance lock.
      - A Node host that owns the only core, the task-writer lock and the microphone, speaking a closed 45-method IPC vocabulary with strict schemas.
      - A Python voice worker for push-to-talk capture, speech-to-text, bilingual text-to-speech and an opt-in wake-word sensor.
      - An MCP server over stdio with 45 tools, 40 of them read-only and five that only record derived state such as checkpoints and memory proposals. Plus a CLI with versioned JSON output and a crash-honest durable task queue.
diagrams: [jarvis-request, jarvis-topology]
architecture: Three surfaces share one TypeScript core. Routing is decided by compiled rules before any model is involved, and authority lives in a registry that no prompt, configuration key or model output can widen.
hard:
  - title: Stopping a model from claiming actions it never took
    figure:
      { value: '6', label: 'false claims of authority or completed changes, 79 adversarial cases' }
    problem: On a 79-case adversarial test set, the local model produced six fluent claims of granted authority or completed changes, while the broker had in fact refused everything.
    solution: I added a postcondition instead of a better prompt. The runtime records receipts of what actually executed, and any claim of authority, mutation or memory is checked against them.
  - title: Isolating agent CLIs that ship with shells, browsers and computer use
    problem: Frontier CLIs carry their own tools, and their isolation flags do not always mean what they say. An empty allow-list is not always deny-all, and some CLIs read context files from their working directory.
    solution: I checked each CLI's flags against its installed source. The adapters now use compiled argument literals, explicit sentinel values, empty scratch working directories and an environment allow-list, so a provider brings intelligence but no machine authority.
  - title: Voice latency dominated by model round trips
    figure: { value: '2 → 0', label: 'provider round trips for questions about its own state' }
    problem: Physical testing showed that spoken requests were slow because every request made two provider round trips, even questions the system could answer from its own state.
    solution: I moved lane selection in front of the models. Questions about the assistant's own state are answered from compiled evidence with zero provider calls, and only open-ended requests reach a model.
  - title: Cancelling the work, not just the screen
    problem: Physical testing showed that cancelling a turn cleared the window while its provider call ran on for about 26 seconds, and the next request then started a second call.
    solution: The stop signal now reaches every provider path, a cancelled call is reported as cancelled rather than as a failure, and an integration test pins it.
    figure: { value: '26 s', label: 'a cancelled call kept running before the fix' }
  - title: A task queue that never fabricates completion
    problem: A restart may lose running work, but it must never report work as finished, restore permissions it should not, or loop on a crashing task.
    solution: Interruption is inferred from durable rows, recovered tasks are re-queued without their permissions, and attempts are counted when execution starts. A single-writer lock uses process identity and start time to decide liveness.
  - title: Honest bilingual speech
    problem: A Bulgarian phrase was spelled out letter by letter by an English voice and still reported as a success.
    solution: Speech is routed by detected language. A turn gets a voice that speaks its language, or silence with a stated reason.
decisions:
  - decision: Tiers are compiled constants, not configuration.
    why: No config key, environment variable or request field can raise privilege. Moving the ceiling takes two reviewed code changes.
  - decision: The Markdown vault is the only authoritative memory.
    why: No derived layer may be the only owner of a fact, and memory stays readable as plain files even without the assistant.
  - decision: A pipe between window and host, not a socket.
    why: Any local process can reach a listening port. A parent-child pipe is reachable by exactly two processes.
  - decision: Rust as a thin shell, Node as the host, Python only for audio and ML workers.
    why: Capability logic stays in one typed core that every surface shares.
  - decision: Wake-word listening is a sensor, on a separate axis from operations.
    why: Hearing a room is a privacy question, not a question of what the system is allowed to change.
  - decision: No numeric confidence scores on memories or findings.
    why: A single number blends origin, standing and age into something that looks more authoritative than it is.
  - decision: No agent framework, vector database or message broker.
    why: Every dependency is a reviewed decision, pinned to an exact version.
now:
  - Runs on my own machines as a CLI, an MCP server and a native desktop app, with Linux builds and a scripted Windows build on the integration branch.
  - Local Qwen3-8B routing is active for selected low-risk routes; frontier CLIs handle the rest as tool-less advisers.
  - Push-to-talk voice, speech-to-text, bilingual text-to-speech and the opt-in wake-word sensor are implemented.
  - 'October’s work is on the integration branch, not yet on main: a redesigned desktop window (a dot sphere with conversation, missions, capabilities and presence views, and approvals beside it), answers to “can you…?” from the compiled registries, and cancellation that stops the provider call. Real-hardware acceptance of the new window is still open.'
  - 242 test files and about 4,900 test cases on the integration branch.
next:
  - Writing approved memory proposals into the vault. The apply step is designed but not built.
  - Proactive nudges beyond shadow mode.
  - Windows Hello approval (in progress) and TOTP, and anything above tier 2.
  - A multi-device fabric over TLS, merged into the integration branch and switched off by default.
  - Filling the temporal knowledge graph, which now has a read-only operation but no data yet.
  - A mobile companion, which exists only as a design document.
learned:
  - Safety properties hold up when they are compiled constants and tests that assert what must not exist, not instructions in a prompt.
  - Physical testing finds what unit tests miss. Latency, audio devices and a window that shows "online" over stale data all surfaced on real hardware.
  - Directing several AI coding agents works only when the boundaries, decisions and defects are written down and kept current.
notes:
  - 'How it is built: the architecture, boundaries and integration are mine. Much of the implementation is written with AI coding agents (Claude, Codex, Gemini) working on parallel branches under a written governance file and a decision log of 62 recorded decisions.'
---

J.A.R.V.I.S. is my personal assistant for one person and one machine. It knows my projects, reads the state of my computer, keeps a record of what it has observed, and it can listen and speak.

**Why it exists.** I wanted an assistant I could trust with my own computer. That means local-first by default, no conversation archive, and a hard line between intelligence and authority. A model can choose which evidence helps answer a question, but it can never choose what the computer executes.

**What makes it different.** Routing, authority and memory are compiled code, not prompt text. A deterministic router answers many questions with no model at all, a local model handles low-risk turns, and frontier models are called as advisers with no tools. Anything that would change the machine passes through a registry of fixed tiers and, today, a single-use approval in the local UI.
