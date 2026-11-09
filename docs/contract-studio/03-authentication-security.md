# 03. Authentication, security and privacy

## Signing in

One administrator, passkeys only (WebAuthn with user verification required). No passwords exist.

**First passkey.** Set `SETUP_TOKEN` on Railway to a long random value, open `/workspace/contracts/setup` on the real domain, enter the token, and create the passkey. The token is then spent and cannot be reused. Remove the variable afterwards.

**Lost every passkey.** Set a _new_ `SETUP_TOKEN` and repeat. Additional passkeys are added from Settings while signed in; add a second one on another device so this path stays rare.

## Sessions

| Property           | Value                                                              |
| ------------------ | ------------------------------------------------------------------ |
| Cookie             | `__Host-studio`: `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/` |
| Stored server-side | SHA-256 of the token only                                          |
| Idle timeout       | 30 minutes (`SESSION_IDLE_MINUTES`)                                |
| Absolute lifetime  | 12 hours (`SESSION_MAX_HOURS`)                                     |
| Rotation           | Every 15 minutes, with 60 seconds of grace for requests in flight  |
| Revocation         | Logout, or Settings → Active sessions                              |

## Controls

- **Authorization**: middleware covers everything under the base path, and checks run on the server for every request and download.
- **Direct access**: the proxy secret is compared in constant time; otherwise 404.
- **CSRF**: every non-GET request must carry the exact `Origin`, on top of `SameSite=Strict`.
- **Rate limits**: sign-in 10 per minute per IP, 60 globally; writes 240 per minute; Claude per `CLAUDE_REQUESTS_PER_MINUTE`.
- **Output**: all HTML goes through an auto-escaping template. CSP is `default-src 'none'` with no inline script or style. The chat's markdown escapes first, then adds a small tag allowlist.
- **Input**: Zod at each boundary; request bodies limited to 512 KB; parameterised SQL throughout.
- **Headers**: HSTS, `nosniff`, `X-Frame-Options: DENY`, `Cache-Control: no-store`, `X-Robots-Tag: noindex, noarchive, nofollow`.
- **Errors**: a generic message and a reference. Logs hold the error name and reference, never bodies or connection strings.
- **Downloads**: session required; files are verified against their stored checksum on every download.

## Claude and prompt injection

The model can stream text and file two schema-validated proposals. It has no tool that writes, queries or reads anything. Applying a proposal is a separate human action that creates a new draft.

- Strict schemas have no field for parties, status or approvals, so an attempt to set them discards the whole proposal.
- Client-supplied text sits in a data block with `<` escaped so it cannot close the tag, and the system prompt says never to follow instructions inside it.
- Amounts that neither you nor the contract stated are removed and turned into questions.

## Personal data

This is not legal advice, and using Claude does not by itself make the workflow GDPR-compliant. You are the controller for your clients' data. Check with a lawyer, and see Anthropic's current commercial terms and data-processing addendum for your API account.

| Topic             | What happens                                                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Sent to Anthropic | Client name, kind and country; project; contract terms and clause text; your messages.                                              |
| Never sent        | Client email, phone, address, EIK, VAT number, internal notes.                                                                      |
| Not collected     | EGN, national ID.                                                                                                                   |
| Stored            | Railway PostgreSQL and volume, in the region you choose. Choose an EU region.                                                       |
| Retention         | AI messages are deleted after the number of days in Settings (default 365; 0 keeps them). Conversations can be deleted at any time. |
| Backups           | Keep the deleted data until they age out: 6 days daily, 27 weekly, 89 monthly on Railway.                                           |
| Audit log         | Events and IP addresses, no contract text.                                                                                          |

## Rotating credentials

| Secret                  | How                                                                                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`     | Create a new key in the Anthropic Console, set it on Railway, then revoke the old one.                                                                           |
| Database password       | Regenerate it in Railway's Postgres service, or run `create-app-role.ts` with a new `APP_DB_PASSWORD`, then update `DATABASE_URL` and redeploy. Update DataGrip. |
| `PROXY_SHARED_SECRET`   | Generate a new value, set it on the Studio service as `PROXY_SHARED_SECRET` and on the portfolio service as `STUDIO_PROXY_SECRET`, and redeploy both.            |
| Suspected session theft | Settings → Revoke, or in SQL: `update sessions set revoked_at = now();`                                                                                          |
| Lost device             | Sign in from another passkey and remove the lost one in Settings.                                                                                                |

## Security Review Audit (WP2)

An independent security review was conducted across all application paths and subsystems:

1. **Middleware Pipeline & Routing**:
   - Request order: `errorMiddleware` → `proxySecretMiddleware` → `/workspace` redirect → `securityHeadersMiddleware` → `bodyLimit(512KB)` → `csrfProtection` → `authMiddleware`.
   - Wildcard matching on `${BASE}/*` covers the base path and subpaths. Public exceptions are strictly whitelisted (`/login`, `/auth/*`, `/setup`, `/assets/*`). Private assets like `/assets/studio.js` enforce authentication with session rotation disabled (`rotate: false`).
   - Constant-time secret comparison (`crypto.timingSafeEqual`) prevents timing attacks against `X-Studio-Proxy-Secret`.
2. **WebAuthn & Session Security**:
   - Single-use challenges stored in transient cookies prevent replay attacks.
   - `SETUP_TOKEN` is consumed in an atomic transaction and cannot be reused.
   - Session tokens are stored hashed (SHA-256). Atomic rotation (`WHERE id = $1 AND token_hash = $old`) prevents race conditions between parallel requests.
   - Production cookies enforce `__Host-studio`, `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`.
3. **Immutability & Privilege Separation (Migration 0003)**:
   - Database trigger `contract_versions_guard()` was hardened so that the runtime application user (`studio_app`) cannot delete approved contract versions even if executing `SET LOCAL studio.allow_purge = 'on'`. Purge capabilities are restricted to the migration/owner role.
   - `studio_app` has no DDL permissions and is blocked from modifying or truncating `audit_logs` or `schema_migrations`.
4. **Input Validation & Injection Defense**:
   - All SQL uses parameterized queries ($1, $2, ...).
   - HTML output is escaped by default via template tags. AI markdown rendering in `studio.js` performs HTML escaping prior to tag whitelisting (`<strong>`, `<em>`, `<code>`, `<p>`, `<ul>`, `<li>`).
   - Document filenames use strict ASCII and alphanumeric sanitization with no path traversal characters.
   - Prompt injection defense: client-supplied text is sanitized inside `<data>` blocks; AI tool schemas reject attempts to modify parties, approvals, or statuses; invented financial figures are dropped.
5. **Storage & Cleanup**:
   - Contract deletions delete database rows and purge associated file artifacts in `/data/documents/<contract-id>/` post-transaction.
