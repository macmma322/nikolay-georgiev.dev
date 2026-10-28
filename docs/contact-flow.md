# Contact form, mail agent and consultation booking

How `/contact` (and `/bg/contact`) turns an enquiry into an email, when it
offers a consultation, and how the mail agent answers mail sent to
info@nikolay-georgiev.dev. Written October 2026; the mail-agent sections were
rewritten after the 28 October production audit.

## What exists

The site is static (Caddy serves `dist/`), so the form posts to the one
backend the project already runs: the `mail-agent` service on Railway.

| Piece                           | File                                                                        |
| ------------------------------- | --------------------------------------------------------------------------- |
| Form, booking step, page script | `src/components/contact/EnquiryForm.astro`                                  |
| Copy, English and Bulgarian     | `src/i18n/ui/enquiry.ts`                                                    |
| Build-time settings             | `src/lib/contact.ts`                                                        |
| Rules shared by form and server | `mail-agent/enquiry.mjs`                                                    |
| `POST /contact`                 | `mail-agent/contact.mjs`, `server.mjs`                                      |
| Inbound mail agent              | `mail-agent/server.mjs`, `pricing.md`, `schedule.mjs`                       |
| Durable limits, client address  | `mail-agent/state.mjs`, `net.mjs`                                           |
| Tests                           | `mail-agent/*.test.mjs` (`npm run test:agent`), `tests/e2e/enquiry.spec.ts` |

## The visitor's paths

1. **Choose a kind:** general question, discuss a project, job or
   collaboration, something else.
2. **Fill in its fields.** Hidden fields are disabled, not cleared, so
   switching kinds keeps what was typed.
3. **Send.** Every kind can always be sent as a written enquiry.

A project enquiry is also checked as it is written. When it says what is
being built, the help needed, the stage, and what a 30-minute call should
achieve (`qualify()` in `enquiry.mjs`), the form offers **Send brief and
schedule a consultation** next to **Send enquiry instead**. Anything missing
is listed; nothing blocks the written enquiry. The rules count words and
characters and catch a few "just to talk" phrasings in a short answer. They
ignore company size, budget and writing style.

After the brief is sent, the booking step shows the reference, the facts
(free, 30 minutes, Google Meet) and two ways in: **Continue to Google
Calendar** (a new tab) and **Show available times here** (Google's official
inline embed, loaded only on that click). The page never says a call is
booked; only Google's confirmation email does.

## Delivery and safeguards

`POST /contact` accepts JSON from the site's origins only (`CONTACT_ORIGINS`).

- **Validation:** `validateEnquiry()`, the same code the browser ran, with
  length limits and control characters stripped.
- **Bots:** a hidden honeypot field and a 3-second minimum fill time; both
  answer like a success and send nothing.
- **Limits:** 5 deliveries an hour per client address, 50 in any 24 hours
  overall, counted on the agent's volume (see "State" below) so a restart or
  redeploy does not reset them. The client address is Railway's `X-Real-IP`
  (see "Client address"); IPv6 counts by /64.
- **Duplicates:** the browser sends one idempotency key per enquiry; the
  server returns the first answer for a repeat, and Resend's own
  `Idempotency-Key` covers a restart.
- **The email:** plain text from `forms@nikolay-georgiev.dev` to the inbox,
  Reply-To the visitor, subject on one line. Because it comes from the site's
  own domain, the inbound mail agent never auto-replies to it. The visitor's
  address is unverified, and nothing is ever sent to it automatically.
- **Logs:** a reference, the kind and the outcome; never names, addresses or
  message text. Each request also logs where its client address came from and
  the proxy chain's shape (`public`, `private` …), never the address.

Nothing about the enquiry is stored: the email in the inbox is the record. The
state file holds only salted hashes of client addresses and timestamps.

The global cap is also what stops a flood: past 50 a day the form answers
"too many messages" and the page offers the email address instead. A CAPTCHA
was considered and not added: it would bring a third-party script to a site
with no trackers, for a volume of a few enquiries a week. Revisit if the
`contact: limited` log line with `daily cap` ever appears.

## Settings

| Variable                     | Where             | Default                                                  |
| ---------------------------- | ----------------- | -------------------------------------------------------- |
| `PUBLIC_CONTACT_ENDPOINT`    | site build        | the mail agent's `/contact` on Railway                   |
| `BOOKING_URL`                | site build, agent | `https://calendar.app.google/go5PwUs8EBNbsSWQ7`          |
| `BOOKING_EMBED_URL`          | site build        | the schedule's `calendar.google.com` URL with `?gv=true` |
| `CONTACT_ORIGINS`            | agent             | the two production origins                               |
| `CONTACT_FROM`, `CONTACT_TO` | agent             | `forms@` and `info@nikolay-georgiev.dev`                 |

Booking URLs must be https on `calendar.app.google` or `calendar.google.com`;
anything else fails the build.

## Known limits

- **The booking page is public.** Qualification is a courtesy, not access
  control: anyone with the Google link can book. Restricting that would need
  invitation tokens and is a separate decision.
- **Brief and booking are not linked automatically.** Google's form asks for a
  name, an email and the topic; match them to the brief by name, email or the
  reference the visitor was shown.
- **Google's interface follows Google's language**, not the page's.
- **No analytics.** The site has none ("No trackers, no cookies"), so the
  funnel events in the brief were not added. The Google embed may set Google's
  cookies, which is why it loads only on request.
- **The booking window on Google is 30 days.** The agreed rule is 14; on
  28 October the public page offered times up to 27 November. Hours, days and
  time zone match. Change it in Google Calendar (booking window, "maximum
  time in advance"); the agent's `MEETING_WINDOW_DAYS` is already 14.

## The mail agent

`mail-agent/server.mjs` answers mail to info@nikolay-georgiev.dev. Resend's own
inbox agent shares the inbox: it **labels, archives and drafts** job and
recruiter mail and is told not to draft for website or portfolio mail. Its
allowed actions are `draft_reply`, `add_labels`, `mark_as_spam` and `archive`:
it cannot send, so the two can never both answer a thread.

### Flow and trust boundaries

```text
sender ─SMTP─▶ Resend (computes SPF/DKIM/DMARC) ─webhook, Svix-signed─▶ Railway edge ─▶ mail-agent
 1. signature over the raw body, 5-minute timestamp window: proves Resend sent
    the event, not who wrote the email
 2. the email's status on the volume: a retry, replay or parallel delivery stops
 3. answerable? inbound, not this domain, not no-reply/daemon/recruiter, not spam
 4. the thread already has an outbound reply? Nikolay's conversation: stop
 5. sender cooldown (1 answer / 24 h), sender reads (3 / 24 h), all reads (40 / 24 h)
 6. GET the email from Resend: headers and Resend's authentication verdict
 7. a follow-up (In-Reply-To, References) or machine mail (Auto-Submitted,
    List-*, Precedence)? stop
 8. Haiku triage, schema-checked; off-schema or "other": stop
 9. generation cap (20 / 24 h); Sonnet (simple) or Opus (complex) writes text
10. code fills {{BOOKING_LINK}} from config; decide() runs every gate
11. send (reply endpoint, Idempotency-Key) only if every gate passes, else a draft
```

| Boundary                   | Trusted for                                | Never trusted for                            |
| -------------------------- | ------------------------------------------ | -------------------------------------------- |
| Website visitor            | nothing: form data is validated and capped | identity: nothing is sent to a typed address |
| Email sender               | nothing                                    | instructions, links, prices, recipients      |
| Resend webhook signature   | "Resend sent this event"                   | who wrote the email                          |
| Resend `authentication`    | SPF, DKIM, DMARC as Resend computed them   | anything a header in the email claims        |
| Railway edge               | `X-Real-IP`                                | `X-Forwarded-For` (undocumented)             |
| Models (Haiku/Sonnet/Opus) | proposing a category and reply text        | recipient, links, prices, whether to send    |
| Google Calendar            | free/busy (when configured), booking page  | the agent never writes to the calendar       |

### What the models decide, and what code decides

The models only **classify** (category, confidence, complexity, "unusual",
whether a call has an agenda) and **write text**. Code decides everything with
consequences: the recipient (the reply endpoint answers the original sender;
any other To or Cc address, or a different Reply-To, means a draft), the
booking link (the model writes a token, code inserts `BOOKING_URL`), which
links may appear (this site and the exact booking page only), prices and
percentages (only those in `pricing.md`), and whether to send.

A reply is **sent** only when all of these hold; otherwise it is a draft in the
inbox, and the log lists every failing reason:

- the category is in `AUTO_SEND_CATEGORIES` (empty by default: nothing sends);
- the state is on the volume (`STATE_DIR` works);
- Resend's DMARC verdict is `pass`, and no Reply-To points elsewhere;
- one plain sender address and no other recipients on To or Cc;
- high confidence, simple, not "unusual", not a meeting change, not a reply;
- headers readable, reply complete, no stray booking token;
- no link but the site and the booking page, and no address, phone number,
  IBAN, IP or bracketed placeholder, checked as written and with look-alike,
  full-width and invisible characters normalised;
- every price and percentage is one the brief lists;
- fewer than `AUTO_SEND_DAILY_CAP` (10) sends in the last 24 hours;
- `DRY_RUN=0`, or the sender is exactly an address in `SEND_TEST_RECIPIENTS`.

Never sent automatically, whatever the model says: recruiter and job mail
(triaged "other" and left to Resend's agent), complex enquiries, discounts or
negotiation, payment or bank details, complaints, anything "unusual", meeting
changes, follow-ups, and anything whose sender is not DMARC `pass`.

### Sender authentication: what is and isn't proven

Resend's received-email API returns `authentication: { spf, dkim, dmarc }`,
computed by Resend on receipt. It is a separate field, not a header the sender
wrote, and the agent reads only that field. Every message checked on 28
October carried all three. A DMARC `pass` proves the From **domain** sent the
email (for gmail.com, that a Gmail account did); it does not prove which
person at a shared domain wrote it. A domain without a DMARC record gets
`none`, which drafts. No spoofed From could be sent through Resend to confirm
it yields `fail`, so that is documented rather than tested live; the gate fails
closed either way, since anything but `pass` drafts.

### State

`mail-agent/state.mjs` keeps one append-only file, `/data/state.jsonl`, on the
Railway volume `mail-agent-volume` (mounted at `/data`, `STATE_DIR=/data`). It
holds limit timestamps and each email's status. Addresses appear only as
salted hashes (the salt is `/data/salt`). The file is compacted on every start.

- **Atomic:** each check-and-record is synchronous in one Node process, with no
  await in between, and is on disk before the caller acts.
- **One writer:** Railway refuses replicas on a service with a volume, so there
  is never a second instance. A redeploy stops the old container before the new
  one starts: a few seconds in which `/contact` and the webhook are down. Resend
  retries webhooks; the form says it could not send and keeps the text.
- **Statuses:** `processing`, then `drafted`, `sent` or `skipped` (final).
  `failed`, `deferred` (a cap) and `interrupted` (a restart mid-way) may run
  again on a replay, three attempts at most. `sending` (the send had started)
  never runs again: its outcome is unknown, and the reply endpoint's
  `Idempotency-Key` and the outbound-in-thread check back that up.
- **No volume:** if `STATE_DIR` is unset or unwritable, the same limits hold in
  memory, the start-up line says `state in memory: auto-send off`, and every
  reply is a draft.

### Client address

Railway documents `X-Real-IP` as the client's address. `X-Forwarded-For` is
not documented, so it is never used for limits. `net.mjs` takes `X-Real-IP`
when it holds exactly one address; if it is missing, repeated or malformed,
every such request shares one bucket, `unknown` (stricter, never looser).
IPv4-mapped IPv6 counts as IPv4, any other IPv6 by its /64.

**Measured on 28 October 2026** (the `contact: request` log line keeps the
shape, never the address): a request carrying a forged `X-Real-IP` and
`X-Forwarded-For` (documentation-range addresses) arrived with both replaced.
`X-Forwarded-For` comes as two public hops, client then edge, and `X-Real-IP`
equals the first. The earlier rule, the right-most `X-Forwarded-For` entry, was
therefore Railway's edge: every visitor routed through one edge shared a
single 5-an-hour bucket. IPv6 was not tested live (no IPv6 route here). To
re-check after a Railway change, send any request to `/contact` and read
`ip_source`, `xff`, `real_is_first_hop` and `real_is_last_hop` in the logs.

### Cost limits

All over rolling 24 hours: 40 emails read by Haiku (`READ_DAILY_CAP`), 3 of
them per sender (`SENDER_READ_DAILY_CAP`), 20 replies written
(`GENERATION_DAILY_CAP`), one answer per sender mailbox
(`SENDER_COOLDOWN_HOURS`, so nobody can buy repeated Opus replies) and 10
sends. Email text sent to a model is cut at 20,000 characters; Haiku answers
in at most 200 tokens and the writer in 4,000. Model calls time out after 90
seconds and Resend calls after 20, and nothing is retried automatically. Each
outcome logs the models and token counts used.

A sender mailbox is one key: `+tags` are dropped only at providers that
document them (Gmail, Outlook, Hotmail, Live, iCloud, Proton, Fastmail) and
dots only at Gmail. Elsewhere the address counts as written.

### Agent settings

| Variable                                                       | Default                      | Purpose                                      |
| -------------------------------------------------------------- | ---------------------------- | -------------------------------------------- |
| `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY` | none                         | secrets, Railway variables only              |
| `STATE_DIR`                                                    | unset: memory only, no sends | `/data` in production                        |
| `DRY_RUN`                                                      | on unless `0`                | the main switch                              |
| `AUTO_SEND_CATEGORIES`                                         | empty                        | `website_project`, `portfolio_question`      |
| `SEND_TEST_RECIPIENTS`                                         | empty                        | exact addresses with real sends in a dry run |
| `AUTO_SEND_DAILY_CAP`                                          | 10                           | sends per 24 hours                           |
| `READ_DAILY_CAP`, `SENDER_READ_DAILY_CAP`                      | 40, 3                        | Haiku reads per 24 hours, all and per sender |
| `GENERATION_DAILY_CAP`, `SENDER_COOLDOWN_HOURS`                | 20, 24                       | written replies; one answer per sender       |
| `BOOKING_URL`, `MEETING_SCHEDULE`, `MEETING_*`                 | see `schedule.mjs`           | call hours, as on the Google page            |
| `GOOGLE_CALENDAR_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON`            | unset: hours only, no times  | read-only free/busy                          |

## Operations

**Logs:** `railway logs --service mail-agent`. Each outcome is one JSON line,
`{"audit":"mail-agent","action":…}`, with `drafted`, `sent`, `skipped`,
`deferred`, `failed` or `duplicate`, and `reasons`, `category`, `model`,
`trust`, `usage` and `ms`. No addresses, subjects or text. The start-up line
says whether it is a dry run, which categories may send and where the state
is.

**Emergency stop:** either command below; each redeploys in about a minute.

```bash
railway variables --service mail-agent --set DRY_RUN=1
```

```bash
railway variables --service mail-agent --set AUTO_SEND_CATEGORIES=
```

To stop the agent reading mail at all, disable its webhook in Resend; the form
keeps working.

**Recovering an email** that ended `failed` or `deferred`: replay its event from
Resend's webhook page. The agent retries it while it has attempts left. Any
email can still be answered by hand from the inbox.

**Deploying:** after CI passes on `main`, from `mail-agent/`:
`railway up --service mail-agent --detach`, then check the start-up line in the
logs. **Rolling back:** redeploy the previous deployment from Railway's
dashboard, or `git revert` and `railway up`. The state file never needs a
migration: older code ignores it.

### Turning on automatic replies

1. **Stage 0 (now):** `DRY_RUN=1`, `AUTO_SEND_CATEGORIES` empty. Everything is a
   draft.
2. **Stage 1, canary:** keep `DRY_RUN=1`; `SEND_TEST_RECIPIENTS` lists your own
   inboxes; `AUTO_SEND_CATEGORIES=website_project`. Write enquiries from those
   inboxes and confirm both the delivered reply and a `sent` log line.
3. **Stage 2, limited:** `DRY_RUN=0`, `AUTO_SEND_CATEGORIES=website_project`,
   `AUTO_SEND_DAILY_CAP=3`. Read every `sent` line for the first weeks.
4. **Stage 3:** add `portfolio_question` and raise the cap, if Stage 2 was clean.

## Rolling back the form

The form is one component in `src/views/Contact.astro`; removing that line
returns the page to email and links only. The endpoint is independent of the
inbound mail handling, so the agent can keep running with or without it.
