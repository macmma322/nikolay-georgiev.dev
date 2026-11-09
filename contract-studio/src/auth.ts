// One administrator, signing in with passkeys. No passwords exist to store or
// leak. The root of trust for enrolment is the Railway account: a one-time
// SETUP_TOKEN set there is the only way to add the first passkey or recover.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server';
import type { Config } from './config.ts';
import { audit, many, one, tx, type Db, type Queryable } from './db.ts';

const hash = (value: string) => createHash('sha256').update(value).digest();

export const safeEqual = (a: string, b: string) => {
  const x = hash(a);
  const y = hash(b);
  return timingSafeEqual(x, y);
};

// ponytail: in-memory and per-process. Fine for one replica; a second replica needs a shared store.
export class RateLimiter {
  #hits = new Map<string, number[]>();
  #limit: number;
  #windowMs: number;
  constructor(limit: number, windowMs: number) {
    this.#limit = limit;
    this.#windowMs = windowMs;
  }
  allow(key: string, now = Date.now()) {
    const recent = (this.#hits.get(key) ?? []).filter((at) => now - at < this.#windowMs);
    if (recent.length >= this.#limit) {
      this.#hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.#hits.set(key, recent);
    if (this.#hits.size > 5000) this.#hits.clear();
    return true;
  }
}

type Credential = {
  id: string;
  public_key: Buffer;
  counter: number;
  transports: string[];
  label: string;
};

export const listCredentials = (db: Queryable) =>
  many<Credential & { created_at: Date; last_used_at: Date | null }>(
    db,
    'select * from admin_credentials order by created_at',
  );

const CHALLENGE_TTL = "interval '5 minutes'";

const storeChallenge = async (db: Queryable, challenge: string, kind: 'register' | 'login') =>
  (
    await one<{ id: string }>(
      db,
      `insert into auth_challenges (challenge, kind, expires_at) values ($1, $2, now() + ${CHALLENGE_TTL}) returning id`,
      [challenge, kind],
    )
  )?.id as string;

// Single use: the row is gone whether verification then passes or fails.
const takeChallenge = async (db: Queryable, id: string, kind: 'register' | 'login') =>
  (
    await one<{ challenge: string }>(
      db,
      'delete from auth_challenges where id = $1 and kind = $2 and expires_at > now() returning challenge',
      [id, kind],
    )
  )?.challenge;

export async function setupAllowed(db: Queryable, config: Config, token: string) {
  if (!config.setupToken || !token || !safeEqual(token, config.setupToken)) return false;
  const used = await one(db, 'select 1 from used_setup_tokens where token_hash = $1', [
    hash(token),
  ]);
  return !used;
}

const USER_ID = new TextEncoder().encode('contract-studio-admin');

export async function registrationOptions(db: Queryable, config: Config) {
  const existing = await listCredentials(db);
  const options = await generateRegistrationOptions({
    rpName: 'Contract Studio',
    rpID: config.rpId,
    userID: USER_ID,
    userName: 'admin',
    userDisplayName: 'Contract Studio admin',
    attestationType: 'none',
    excludeCredentials: existing.map((credential) => ({ id: credential.id })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
  });
  return { options, challengeId: await storeChallenge(db, options.challenge, 'register') };
}

export async function finishRegistration(
  db: Db,
  config: Config,
  challengeId: string,
  response: RegistrationResponseJSON,
  label: string,
  setupToken?: string,
) {
  const expectedChallenge = await takeChallenge(db, challengeId, 'register');
  if (!expectedChallenge) return false;
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: config.appOrigin,
    expectedRPID: config.rpId,
    requireUserVerification: true,
  });
  if (!verification.verified) return false;
  const { credential } = verification.registrationInfo;
  await tx(db, async (client) => {
    if (setupToken) {
      // The primary key makes a concurrent replay of the token fail here.
      await client.query('insert into used_setup_tokens (token_hash) values ($1)', [
        hash(setupToken),
      ]);
    }
    await client.query(
      'insert into admin_credentials (id, public_key, counter, transports, label) values ($1, $2, $3, $4, $5)',
      [
        credential.id,
        Buffer.from(credential.publicKey),
        credential.counter,
        credential.transports ?? [],
        label || 'Passkey',
      ],
    );
    await audit(client, 'auth.passkey_added', 'credential', credential.id, { label });
  });
  return true;
}

export async function authenticationOptions(db: Queryable, config: Config) {
  const options = await generateAuthenticationOptions({
    rpID: config.rpId,
    userVerification: 'required',
  });
  return { options, challengeId: await storeChallenge(db, options.challenge, 'login') };
}

export async function finishAuthentication(
  db: Db,
  config: Config,
  challengeId: string,
  response: AuthenticationResponseJSON,
) {
  const expectedChallenge = await takeChallenge(db, challengeId, 'login');
  if (!expectedChallenge) return false;
  const stored = await one<Credential>(db, 'select * from admin_credentials where id = $1', [
    response.id,
  ]);
  if (!stored) return false;
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: config.appOrigin,
    expectedRPID: config.rpId,
    requireUserVerification: true,
    credential: {
      id: stored.id,
      publicKey: new Uint8Array(stored.public_key),
      counter: Number(stored.counter),
      transports: stored.transports as never,
    },
  });
  if (!verification.verified) return false;
  await db.query('update admin_credentials set counter = $1, last_used_at = now() where id = $2', [
    verification.authenticationInfo.newCounter,
    stored.id,
  ]);
  return true;
}

// -------------------------------- Sessions -----------------------------------

const newToken = () => randomBytes(32).toString('base64url');

export const cookieName = (config: Config) => (config.secureCookies ? '__Host-studio' : 'studio');

export async function createSession(
  db: Queryable,
  config: Config,
  userAgent: string | null,
  ip: string | null,
) {
  const token = newToken();
  await db.query(
    `insert into sessions (token_hash, user_agent, ip, expires_at)
     values ($1, $2, $3, now() + make_interval(hours => $4))`,
    [hash(token), userAgent?.slice(0, 300) ?? null, ip, config.sessionMaxHours],
  );
  return token;
}

export type Session = { id: string; token: string; rotated: boolean };

// Rotates on a timer. The previous token stays valid for a minute because a
// streaming response or a parallel request may still be carrying it.
export async function loadSession(
  db: Queryable,
  config: Config,
  token: string,
): Promise<Session | null> {
  const digest = hash(token);
  const row = await one<{ id: string; current: boolean; rotate: boolean }>(
    db,
    `select id, token_hash = $1 as current,
       rotated_at < now() - make_interval(mins => $3) as rotate
     from sessions
     where (token_hash = $1 or (previous_token_hash = $1 and rotated_at > now() - interval '60 seconds'))
       and revoked_at is null and expires_at > now()
       and last_seen_at > now() - make_interval(mins => $2)`,
    [digest, config.sessionIdleMinutes, config.sessionRotateMinutes],
  );
  if (!row) return null;
  if (row.current && row.rotate) {
    const next = newToken();
    await db.query(
      `update sessions set previous_token_hash = token_hash, token_hash = $1, rotated_at = now(), last_seen_at = now() where id = $2`,
      [hash(next), row.id],
    );
    return { id: row.id, token: next, rotated: true };
  }
  await db.query('update sessions set last_seen_at = now() where id = $1', [row.id]);
  return { id: row.id, token, rotated: false };
}

export const revokeSession = (db: Queryable, id: string) =>
  db.query('update sessions set revoked_at = now() where id = $1', [id]);

export async function housekeeping(db: Queryable, retentionDays: number) {
  await db.query('delete from auth_challenges where expires_at < now()');
  await db.query("delete from sessions where expires_at < now() - interval '30 days'");
  if (retentionDays > 0) {
    await db.query('delete from ai_messages where created_at < now() - make_interval(days => $1)', [
      retentionDays,
    ]);
    await db.query(
      `delete from ai_conversations c where updated_at < now() - make_interval(days => $1)
       and not exists (select 1 from ai_messages m where m.conversation_id = c.id)`,
      [retentionDays],
    );
  }
}
