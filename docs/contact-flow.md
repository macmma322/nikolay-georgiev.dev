# Contact form and consultation booking

How `/contact` (and `/bg/contact`) turns an enquiry into an email, and when it
offers a consultation. Written October 2026, when the form was added.

## What exists

The site is static (Caddy serves `dist/`), so the form posts to the one
backend the project already runs: the `mail-agent` service on Railway.

| Piece                           | File                                                       |
| ------------------------------- | ---------------------------------------------------------- |
| Form, booking step, page script | `src/components/contact/EnquiryForm.astro`                 |
| Copy, English and Bulgarian     | `src/i18n/ui/enquiry.ts`                                   |
| Build-time settings             | `src/lib/contact.ts`                                       |
| Rules shared by form and server | `mail-agent/enquiry.mjs`                                   |
| `POST /contact`                 | `mail-agent/contact.mjs`, `server.mjs`                     |
| Tests                           | `mail-agent/enquiry.test.mjs`, `tests/e2e/enquiry.spec.ts` |

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
- **Limits:** 5 deliveries an hour per client address, 50 a day overall.
- **Duplicates:** the browser sends one idempotency key per enquiry; the
  server returns the first answer for a repeat, and Resend's own
  `Idempotency-Key` covers a restart.
- **The email:** plain text from `forms@nikolay-georgiev.dev` to the inbox,
  Reply-To the visitor, subject on one line. Because it comes from the site's
  own domain, the inbound mail agent never auto-replies to it. The visitor's
  address is unverified, and nothing is ever sent to it automatically.
- **Logs:** a reference, the kind and the outcome; never names, addresses or
  message text.

Nothing is stored: the email in the inbox is the record.

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
- **Limits live in memory** and reset when the service restarts; Resend's
  idempotency still prevents duplicate emails across a restart.

## Rolling back

The form is one component in `src/views/Contact.astro`; removing that line
returns the page to email and links only. The endpoint is independent of the
inbound mail handling, so the agent can keep running with or without it.
