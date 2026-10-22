---
name: Stemini
order: 6
tier: B
accent: stemini
kicker: AI-assisted 3D model generation and printing
signature: 'The expensive mesh step runs only after a person approves a cheap concept image.'
summary: A multi-service platform that turns a prompt into a printable 3D model, with a person approving the concept before the paid mesh step, a token ledger and delivery all the way to a printer.
description: 'Case study of Stemini: a TypeScript platform chaining an LLM, an image model and a 3D mesh API, with OrcaSlicer slicing, a token ledger and a printer bridge.'
seoTitle: 'Stemini: from prompt to printed 3D model'
status: prototype
statusNote: Deployed pre-launch; development slowed since late June 2026
started: 2026-03
role: Product and architecture, and every service from frontend to printer bridge
context: Own product, sharing identity and infrastructure with USS X
layers: [ai, backend, web]
stack:
  [
    typescript,
    nextjs,
    react,
    nodejs,
    nestjs,
    postgresql,
    redis,
    bullmq,
    openai,
    gemini,
    meshy,
    orcaslicer,
    vitest,
    railway,
  ]
links:
  repoNote: Private repositories (frontend, core API, AI worker, slicing worker, bridge)
spec:
  - {
      label: Services,
      value: 'Next.js frontend, NestJS core API, AI worker, slicing worker, bridge',
    }
  - { label: Generation, value: 'LLM prompt rewrite, image model concept, image-to-3D mesh' }
  - { label: Human in loop, value: 'Concept approval before the paid mesh step, up to 3 attempts' }
  - { label: Metering, value: 'Token ledger: reserve, then charge or release, idempotent' }
  - { label: Slicing, value: 'OrcaSlicer CLI in a sandbox per job, .gcode.3mf and estimates' }
  - { label: Printers, value: 'OctoPrint, Moonraker, PrusaLink, Bambu LAN, drop folder' }
  - { label: Data, value: 'PostgreSQL stemini schema (40 tables) in the shared database' }
highlights:
  - The expensive mesh generation only runs after a person approves a cheap concept image.
  - Tokens are reserved before work starts and settle exactly once, whether the job succeeds, fails or is cancelled.
  - The printer bridge only makes outbound calls, so nothing opens a port on a home or school network.
built:
  - title: Generation pipeline
    points:
      - A server-enforced request state machine with 11 statuses and only legal transitions.
      - A concept phase (prompt rewrite and subject classification, then a concept image) that pauses for approval, and a mesh phase that runs only after it.
      - Dispatch to the AI worker over internal HTTP or a BullMQ queue, with deterministic job ids so the same job cannot be queued twice.
      - A dependency-free GLB to binary STL converter, used when the mesh provider returns no STL, that walks the glTF scene graph and applies world transforms.
  - title: Metering and platform
    points:
      - A token ledger with reserved and available balances, row locks, idempotency keys and an audit event for every movement.
      - Roles and 27 capability keys enforced by a guard, an audit log and S3-compatible storage behind presigned URLs.
      - Sign-in through the shared USS One single sign-on on the deployed branch, with a personal workspace per user.
  - title: Printing
    points:
      - A slicing worker that runs the OrcaSlicer CLI in a sandbox directory per job and caches sliced output.
      - Delivery lanes decided on the server (download, operator queue, LAN printing and a deferred cloud lane), with the client only able to hint.
      - A local bridge agent with five printer adapters that polls for commands, claims them under a lease and reports back.
diagrams: [stemini-pipeline]
architecture: The frontend never talks to the workers. Everything goes through the Core API, which owns tenancy, capabilities, the token ledger and the audit trail, and hands work to separate AI and slicing workers.
media:
  - src: ../../assets/media/stemini/stemini-keyart.webp
    alt: Stemini brand art in which a human hand and a robotic hand touch inside a glowing ring framing a 3D printer nozzle, above the Stemini wordmark.
    caption: Stemini's brand key art, from the product frontend.
    wide: false
hard:
  - title: One correct money path across asynchronous workers
    problem: Worker callbacks advance a request's status, and the token settlement must happen exactly once, in the same transaction as the status change, including for older requests that never had a reservation.
    solution: Settlement uses deterministic idempotency keys and locks the account row, so a retried or duplicated callback cannot charge twice or drive a balance negative.
  - title: Three AI providers with a human pause in the middle
    problem: A prompt model, an image model and a 3D model run across two separate dispatches, with a person deciding in between.
    solution: The concept image stays in private storage and reaches the mesh provider through a presigned URL. The subject is fixed on the first attempt so storage keys stay consistent across regenerations.
  - title: Many printer ecosystems behind one protocol
    figure: { value: '5', label: 'printer adapters behind one bridge protocol' }
    problem: OctoPrint, Moonraker, PrusaLink and Bambu printers all speak differently, and the operator's network should not accept inbound connections.
    solution: One bridge command protocol with claim leasing and five adapters. Remote print start on Bambu printers is deliberately deferred until bed-clear and camera checks exist.
  - title: Changing frameworks under a working system
    problem: The core API was moving from NestJS to Express to match the rest of the platform, without freezing the generation and printing path.
    solution: A strangler migration with shared read and write helpers, and parity tests that compare response bodies and recorded SQL between the two implementations.
decisions:
  - decision: Split generation into a cheap concept phase and an expensive mesh phase.
    why: The user can reject or regenerate the idea before the paid 3D call, and every attempt is kept as history.
  - decision: The server alone picks the delivery lane.
    why: School, printer and capabilities decide how a file may reach a machine, which keeps behaviour safe across tenants.
  - decision: A deferred cloud lane instead of a fake success.
    why: The cloud adapter validates and records the attempt but makes no vendor call until the integration is real.
  - decision: Default models chosen for latency and cost, overridable per environment.
    why: The higher-fidelity image preview model timed out during testing, so the faster model is the default.
now:
  - The services are on Railway as a pre-launch prototype, sharing identity, PostgreSQL and Redis with USS X Academy. The public frontend is currently asleep.
  - Text-to-model generation, approval, metering, slicing, the printer catalog and the bridge exist in code.
  - Development slowed after late June 2026 while USS X Academy took priority.
next:
  - Finishing the tenancy migration from schools to personal workspaces and organisations.
  - Image-upload generation end to end, and a checkout for buying tokens.
  - A live cloud printing integration and remote print start behind an audited capability.
  - Row-level security and a shared rate limiter, as recommended by its own architecture reviews.
learned:
  - Put the human decision before the expensive step. It is better for cost, and better for the result.
  - Anything that touches money needs idempotency designed in from the first migration, not added after a double charge.
  - Dated architecture reviews of the codebase are worth the time. They made the gap between "deployed" and "ready for users" explicit.
notes:
  - Stemini began as a platform for schools and moved to a consumer-first model in June 2026. It shares its auth service, database and Railway project with USS X Academy, but it is a separate product.
---

Stemini turns an idea into a physical object. A user describes a model, the system proposes a concept image, and once the user approves it, a 3D mesh is generated, converted, sliced and delivered to a printer.

**Why it exists.** Designing printable 3D models is a skill most people, including students, do not have. Stemini puts AI generation in front of a real printing workflow, with a person approving each step that costs money.

**Where it stands.** The services are built and deployed as a pre-launch prototype. Its own architecture reviews list what must be fixed before real users arrive, and those items are tracked openly.
