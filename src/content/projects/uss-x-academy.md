---
name: USS X Academy
order: 2
tier: A
accent: ussx
kicker: Education platform with live classrooms
signature: 'A student removed mid-lesson stops receiving events immediately, even on a stream that is already open.'
summary: A production education platform for a Bulgarian vocational training centre, with course intakes and applications, live classrooms, a regional technician directory and single sign-on across products.
description: 'Case study of USS X Academy: Next.js and Express 5 services with cross-domain SSO, LiveKit classrooms, SSE realtime, PostgreSQL and consent-aware tracking.'
seoTitle: 'USS X Academy: education platform'
status: production
statusNote: Live at ussxacademy.bg, in active development
started: 2026-05
role: Sole engineer across architecture, backend, frontends, auth, schema, deployment and tracking
context: Client platform; the training centre owns the business and content
layers: [web, backend, realtime]
stack:
  [
    nextjs,
    react,
    typescript,
    tailwind,
    nodejs,
    express,
    postgresql,
    redis,
    livekit,
    zod,
    openapi,
    vitest,
    resend,
    railway,
    docker,
    ga4,
    googleads,
    gtm,
  ]
links:
  live: https://www.ussxacademy.bg
  liveLabel: ussxacademy.bg
  repoNote: Private client repositories
spec:
  - { label: Frontends, value: 'Next.js 15, React 19, Tailwind v4: academy site and accounts app' }
  - { label: API, value: 'Express 5 and TypeScript, about 250 routes, hand-written SQL' }
  - { label: Identity, value: 'Separate auth service, Argon2id, single-use SSO tickets' }
  - { label: Classroom, value: 'LiveKit media, admission and moderation owned by the API' }
  - { label: Realtime, value: 'Server-Sent Events fanned out through Redis pub/sub' }
  - { label: Data, value: 'PostgreSQL with core, academy and stemini schemas; 46 migrations' }
  - { label: Contract, value: 'OpenAPI 3.1 (216 operations), generated typed client' }
  - { label: Tests, value: '162 backend spec files, 189 frontend test files (Vitest)' }
  - { label: Locales, value: 'Bulgarian by default, English, Russian' }
highlights:
  - Sign-in works across two registrable domains without sharing a cookie or a credential.
  - Classroom chat is deliberately ephemeral. It lives in Redis and is deleted when the lesson ends.
  - A student removed mid-lesson stops receiving events immediately, even on a stream that is already open.
  - Conversions fire only after the server confirms an application, carry no personal data and are deduplicated.
built:
  - title: Identity and platform
    points:
      - A central auth service with registration, verification, password reset, profile, RBAC and GDPR erasure dispatched to each product.
      - Cross-domain single sign-on with HMAC-signed, single-use tickets redeemed server to server. Each product mints its own first-party session.
      - Sessions stored in PostgreSQL with a Redis cache, sliding idle expiry and an absolute cap, plus CSRF protection on every state change.
      - Capability-based access control and an audit log for admin and security events that the code only ever appends to.
  - title: Courses and applications
    points:
      - Courses, modules and lessons, with textbooks, self-tests, free content and an admin course editor.
      - City-based intakes with capacity limits. Early-bird and two-person prices are resolved and frozen on the server under a row lock.
      - An application funnel for guests and members, with staff review states, email claim links, and notifications to each offering's organiser with a copy to the academy.
      - A transactional email outbox drained to Resend, with signature-verified delivery webhooks.
  - title: Live classroom
    points:
      - LiveKit join tokens scoped by room and role, and a waiting room with host approval, lock, mute, mute-all, remove and readmit.
      - 'Guest-first access: an invited guest joins a lesson from a signed invitation link, without creating an account first.'
      - Host presence, student check-in and attendance records.
      - A meeting interface with pre-join checks, an adaptive participant grid, chat and participant panels, and mobile wake-lock and volume fixes.
      - An enhanced microphone mode that uses native voice isolation where available, otherwise a DTLN neural model in an AudioWorklet, with a watchdog fallback.
  - title: Directory, content and growth
    points:
      - A technician directory with a keyboard-operable SVG map of Bulgaria's 28 regions and an admin approval, rejection and suspension flow.
      - A blog with RSS, server-rendered course landing pages, sitemap, robots rules, llms.txt, hreflang and JSON-LD for courses, FAQs and articles.
      - GA4, Google Ads and Google Tag Manager behind Google Consent Mode v2 in basic or advanced mode; the Meta Pixel always waits for consent.
      - First-touch UTM attribution stored with each lead, plus a Google Ads provisioning script and runbook for the campaign's technical setup.
diagrams: [ussx-platform, ussx-sso]
architecture: Separate services with clear ownership. The API owns academy rules, the auth service owns identity, LiveKit carries media, PostgreSQL is the system of record and Redis holds everything that should not live forever.
hard:
  - title: Revoking access on streams that are already open
    problem: Checking access when a realtime stream opens is not enough. A student removed in the middle of a lesson could keep receiving chat on a connection that was valid when it started.
    solution: Revocations are pushed over a Redis control channel to every instance, and a cached re-check runs before each sensitive event, which also catches access that simply expired.
  - title: Seats and early-bird places under concurrency
    problem: Applications that arrive together can oversell an intake's capacity or its pool of discounted places.
    solution: Seats are counted under a row lock on the course, and the price is resolved and frozen on the server at the moment the application is created.
  - title: Single sign-on across domains
    figure: { value: '60 s', label: 'lifetime of a single-use sign-on ticket' }
    problem: The academy and Stemini live on different registrable domains, so they cannot share a cookie, and no credential or master session should ever cross between them.
    solution: Login happens once on the accounts app. The product receives a 60-second, single-use ticket bound to that product, burns its nonce atomically in Redis and redeems it server to server.
  - title: Classroom audio on real devices
    figure: { value: '20 ms', label: 'frame budget; three strikes fall back' }
    problem: Students join from phones and laptops in noisy rooms, and in-browser neural noise suppression can stutter on slow hardware.
    solution: A three-step chain of native voice isolation, then a DTLN model running as WASM in an AudioWorklet, then standard browser processing, guarded by a watchdog. Each frame over its 20 ms budget adds a strike, each good frame removes one, and three strikes fall back to standard processing.
  - title: Two products, one schema and one identity
    problem: The academy and Stemini each started with their own database, which would have meant two accounts per person.
    solution: I consolidated them into namespaced core, academy and stemini schemas, with a data-migration plan and verification SQL.
  - title: Recording a lesson through an external media service
    problem: The recorder runs outside the app. Its webhooks can arrive late, twice or out of order, a lesson can end while a recording is still starting, and the recorder must neither take a student's seat nor keep an empty room alive.
    solution: 'Recording status only moves forward and every write checks the current status first, so a duplicate or stale event changes nothing. A verified webhook drives the status and a read-time check repairs a missed one; every way a lesson can end stops the recording first; the app counts participants itself and leaves the recorder out. Playback is private, through short-lived authorised links, and stricter than access to the lesson itself. Built and tested on a release branch in October; not deployed yet.'
decisions:
  - decision: Classroom chat is stored only in Redis and deleted when the lesson ends.
    why: Keeping lesson chatter would create retention, moderation and export obligations for content nobody needs. Attendance and the audit trail stay in PostgreSQL.
  - decision: Hosted login with a ticket handoff; every product mints its own session.
    why: Cookies cannot cross registrable domains, and no credential or master cookie should.
  - decision: The email outbox is written in the same transaction as the business fact.
    why: An owed email is never lost if the process dies between commit and send, and raw claim tokens never reach the database.
  - decision: Lead conversions carry no value and no personal data.
    why: A lead is not revenue, and names, emails and phone numbers are never sent to an ad platform.
  - decision: Hand-written SQL and forward-only migrations, with 25 recorded ADRs.
    why: The SQL schema is the source of truth, and changing a structural rule, such as adding an ORM, requires a written decision.
now:
  - 'In production on Railway: academy site, API, accounts app, auth service, PostgreSQL and Redis.'
  - Live classrooms, course intakes and applications, the technician directory, the blog and consent-aware tracking are deployed.
  - Production was last deployed on 21 September 2026. The October work sits on release branches that do not deploy, waiting for a staging environment.
next:
  - Lesson recording through LiveKit Egress, with private storage and short-lived playback links. Built and tested on a release branch, together with a combined course-management page for admins; it still has to run against real Egress on staging before release.
  - Stripe billing through a small hand-written client, entitlements, an AI assessment engine and an AI coach. Built on a branch with an open pull request; not deployed.
  - Separate development and staging environments.
  - Automated contract tests between the API and its OpenAPI specification.
learned:
  - Realtime features need access checks on every event, not only when the connection opens.
  - Measurement is engineering too. Consent, attribution and deduplication decide whether an ad platform learns from real signal or noise.
  - Keeping the schema, the API contract and the decision records in one umbrella repository keeps a multi-service system manageable for one engineer.
notes:
  - The training centre owns the business, so pricing, content and campaign decisions are theirs. My part is the software, the infrastructure and the technical side of marketing (tags, consent, conversion events and campaign setup scripts). Campaign performance data belongs to the client and is not published here.
---

USS X Academy is the online platform of a Bulgarian vocational training centre that runs practical courses, including solar installation training. Students apply for city-based course intakes, attend live classes in the browser, and customers can find trained technicians by region.

**Why it exists.** The training centre needed more than a brochure site. It needed applications with real capacity limits, live lessons with proper host control, and a public directory of technicians, with Bulgarian as the first language.

**What I built.** The whole software side, alone: two Next.js frontends, an Express 5 API, a separate authentication and single sign-on service, the PostgreSQL schema, the deployment on Railway and the measurement layer for its marketing.
