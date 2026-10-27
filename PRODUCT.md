# Product

## What the site is for

One site that shows Nikolay Georgiev as a software engineer who builds whole
systems across six layers: web, backend, realtime, AI, hardware and system
software. It has to work for three readers:

- **Recruiters** need the role, location, availability, experience and CV in
  under a minute. These are in the hero, the header CV button, the About page
  and the footer on every page.
- **Engineers** want evidence: architecture, hard problems, decisions,
  trade-offs and honest status. Every case study gives them that, with a
  diagram and a text alternative.
- **Clients** want to know what was delivered and for whom. USS X Academy is
  the reference, described without client data.

## Positioning

- Name and role: Nikolay Georgiev, Software Engineer, Varna, Bulgaria.
- Core line: "I build production platforms, intelligent systems, embedded
  hardware and low-level technology."
- The day job (Junior Backend Developer at DXC Technology) is stated plainly,
  and independent work is not inflated into a company.

## Content rules

1. **Evidence over adjectives.** A claim needs a source in a repository, a
   document or the CV. Counts (modules, migrations, tests) come from the code
   and were re-checked by a second, skeptical pass.
2. **No invented numbers.** No users, revenue, traffic, uptime, conversion
   rates, campaign results or performance gains unless measured and
   publishable. Genpact metrics appear only in the CV, as self-reported.
3. **Status is always visible.** Use one of: Production, Live pre-launch,
   Active development, Prototype, Research, Experimental, Paused, Planned,
   Concept. Shape and label carry the meaning, not colour alone.
4. **Planned is not proven.** Java, Spring Boot and Angular are "expanding
   into" and are never listed as experience (Angular appears only as
   "learning", from Caelora's undeployed website). LedgerForge is planned and
   Velnethyrn is paused.
5. **Name what is not done.** Each case study has "Now" and "Next" lists.
   KObait says it has not been on the water. Malrynth says paging is next.
6. **AI assistance is disclosed.** Where AI coding agents wrote much of the
   implementation (J.A.R.V.I.S. especially), the case study says so and
   describes the ownership split: architecture, boundaries, review and
   integration are Nikolay's.
7. **Marketing is technical.** For USS X Academy the site describes tags,
   consent, conversion events and campaign setup scripts. It publishes no
   campaign performance, and Meta Ads appear only as future work.

## Project facts that are easy to get wrong

- **Caelora** is a Unity 6 / C# game, not a custom engine. The voxel meshing,
  streaming, persistence and living trees are the project's own code. There is
  no "Alpha 0.2.1": the build is v0.1.0. Creatures, villagers and combat are
  tested core code not used by the game; multiplayer has no code. Much of it
  is written with AI agents, and the case study says so. The menu art, loading
  video and character models are generated; publish only in-engine captures.
- **Malrynth** is an operating system with its own UEFI loader and kernel. It
  is not a Linux distribution.
- **KObait** is a two-board system (boat controller and handheld remote) with
  its own radio protocol. It is bench-tested only. **Hardware is named by kind,
  never by model**: radio module, GPS module, gyro module, ESC controllers. No
  part numbers, ratings, pin names, protocol byte layouts or timing constants
  anywhere (case study, plate, diagram, CV, SEO copy, Open Graph cards), so the
  build cannot be copied from the site. The module architecture diagram stays.
- **Zone 32-19** is pre-launch and runs only in a development environment;
  zone-32-19.com is not serving (checked 2026-10-27), so the case study has no
  live link. Never publish Stripe key modes, environment flags or WAF rules.
  The WAF in the live path and separate staging are still next.
- **USS X Academy** is client work in production, last deployed 2026-09-21.
  Lesson recording (LiveKit Egress), the admin redesign and Stripe billing are
  on unmerged branches and are described as not deployed.
- **Stemini** is a pre-launch prototype whose development slowed from late
  June 2026.

## Setup page

`/setup` (`src/data/setup.ts`) lists hardware with a source per item: read
from the machine (2026-10-27), measured in project docs, or stated by the
owner. Re-read the machine before changing a "machine" item. The main PC has a
Samsung 990 PRO and a 990 EVO Plus (both 1 TB); no 970 EVO Plus was found.
Planned items (Sony a6400, the secondary PC's SATA SSD) stay visibly planned.
Manufacturer links by default, never affiliate links, prices or buy buttons,
and the non-sponsorship disclosure stays. The one exception is the StableArm
arm, which has no maker page: its plain eMAG listing is shown labelled as a
shop listing (owner decision, 2026-10-27). The GPU is an EVGA RTX 3080 FTW3
Ultra Gaming (PCI subsystem 3842:3897, part 10G-P5-3897). The printer is an
HP LaserJet Pro MFP M125nw (Windows print queue). The ASUS RT-BE88U is a
candidate, not a purchase: never present it as bought, and never say it
replaces the provider's optical terminal.

The 3D views (`src/scripts/setup3d`) are illustrations built in code from
published dimensions: the layout of the desk is idealised, the case models are
not recorded (both cases are neutral), and the laptop's internals show the
general arrangement, not a teardown. Do not add third-party models or
textures without a licence that allows it. KObait appears there only by area (embedded electronics,
wireless communication, sensors, motor control), with no component list
(owner decision, 2026-10-27), in the 3D views too. The secondary PC (ASRock H81M, i7-4790K, GTX 1080 Ti, 16 GB DDR3, 1 TB +
500 GB HDDs) and the laptop's storage (Samsung 970 EVO, a Toshiba HDD) and
current Ubuntu version are owner-stated or unverified; say so on the page.
The Stream Deck is an MK.2 (owner, 2026-10-27; its
profile shows a 5 × 3 layout). Never
publish serials, MAC or IP addresses, Bluetooth device names or local paths.

## Privacy

Never publish: secrets or `.env` values, internal hostnames, local file paths,
client or student data, private J.A.R.V.I.S. memory, private operational
dashboards, private repository URLs, the phone number or a postal address.
The build audit enforces the mechanical parts of this list.

## Open decisions for the owner

- Connect `nikolay-georgiev.dev` (purchase and DNS are the owner's call).
- Point the Railway service at this repository, or port the site.
- Replace the CV on the current live portfolio, which exposes personal data.
- Add real interface media for J.A.R.V.I.S. and KObait, and ask the client
  before publishing USS X Academy screenshots.
