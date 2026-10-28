// Durable limits and per-email progress for the mail agent, kept in one
// append-only file on the service's volume (STATE_DIR). This process is the only
// writer: the service runs a single replica, and Railway refuses replicas on a
// service with a volume. Every check-and-record below is synchronous, so two
// requests in flight can never both pass a limit, and each record is flushed to
// the disk (fsync) before the caller acts on it.
//
// Without STATE_DIR, or if the disk fails, the same limits hold in memory only
// and `durable` is false: callers keep taking enquiries but never send on their own.
import {
  closeSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  writeSync,
} from 'node:fs';
import { createHmac, randomBytes } from 'node:crypto';
import { join } from 'node:path';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
// How long an email's outcome is remembered. Limit records are kept for
// keepHitsMs, which the caller sets to at least its longest limit window.
const KEEP_EMAILS_MS = 30 * DAY;
// Statuses that end an email's processing; anything else may be retried.
export const FINAL = new Set(['drafted', 'sent', 'skipped']);

/** Writes a whole file beside `path`, flushes it to the disk, then renames it into place. */
function replaceFile(path, data) {
  const temp = `${path}.tmp`;
  const fd = openSync(temp, 'w', 0o600);
  try {
    writeSync(fd, data);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(temp, path);
}

export function openState({
  dir = '',
  now = () => Date.now(),
  log = () => {},
  keepHitsMs = 2 * DAY,
} = {}) {
  const hits = new Map(); // limit key -> timestamps
  const emails = new Map(); // email id -> { status, at, attempts }
  let file = '';
  let fd = null; // the state file, appended to and flushed per record
  let salt = randomBytes(32);
  let durable = false;
  let lines = 0;

  const apply = (entry) => {
    if (entry.h) hits.set(entry.h, [...(hits.get(entry.h) ?? []), entry.t]);
    else if (entry.u) {
      const list = hits.get(entry.u) ?? [];
      const at = list.lastIndexOf(entry.t);
      if (at >= 0) list.splice(at, 1);
    } else if (entry.e)
      emails.set(entry.e, { status: entry.s, at: entry.t, attempts: entry.n ?? 0 });
  };

  const live = () => {
    const cutoff = now();
    const entries = [];
    for (const [key, times] of hits) {
      for (const t of times) if (t > cutoff - keepHitsMs) entries.push({ h: key, t });
    }
    for (const [id, e] of emails) {
      if (e.at > cutoff - KEEP_EMAILS_MS)
        entries.push({ e: id, s: e.status, t: e.at, n: e.attempts });
    }
    return entries;
  };

  // Rewrites the file with only what is still needed, then appends to the new one.
  const compact = () => {
    const entries = live();
    hits.clear();
    emails.clear();
    entries.forEach(apply);
    replaceFile(file, entries.map((entry) => `${JSON.stringify(entry)}\n`).join(''));
    if (fd !== null) closeSync(fd);
    fd = openSync(file, 'a');
    lines = entries.length;
  };

  const record = (entry) => {
    apply(entry);
    if (!durable) return;
    try {
      writeSync(fd, `${JSON.stringify(entry)}\n`);
      fsyncSync(fd);
      if ((lines += 1) > 20_000) compact();
    } catch (error) {
      durable = false;
      log({ state: 'degraded', reasons: [String(error.message).slice(0, 200)] });
    }
  };

  if (dir) {
    try {
      mkdirSync(dir, { recursive: true });
      const saltFile = join(dir, 'salt');
      try {
        salt = readFileSync(saltFile);
      } catch (error) {
        // Only a missing salt is made anew; any other failure must not reset every limit.
        if (error.code !== 'ENOENT') throw error;
        replaceFile(saltFile, salt);
      }
      if (salt.length !== 32) throw new Error('state salt is damaged');
      file = join(dir, 'state.jsonl');
      let text = '';
      try {
        text = readFileSync(file, 'utf8');
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      for (const row of text.split('\n')) {
        // A line cut short by a crash is skipped; everything before it stands.
        try {
          if (row) apply(JSON.parse(row));
        } catch {}
      }
      // Work cut off by a restart may run again; a send whose outcome is unknown may not.
      for (const e of emails.values()) if (e.status === 'processing') e.status = 'interrupted';
      compact();
      durable = true;
    } catch (error) {
      log({ state: 'degraded', reasons: [String(error.message).slice(0, 200)] });
    }
  }

  const within = (key, windowMs) => {
    const cutoff = now() - windowMs;
    const kept = (hits.get(key) ?? []).filter((t) => t > cutoff);
    hits.set(key, kept);
    return kept;
  };

  return {
    get durable() {
      return durable;
    },
    /** Uses one of `limit` slots in the window: the slot's token, or null when full. */
    take(key, limit, windowMs) {
      if (within(key, windowMs).length >= limit) return null;
      const t = now();
      record({ h: key, t });
      return t;
    },
    /** Gives a slot back (a claim that came to nothing). */
    give(key, token) {
      if (token !== null && token !== undefined) record({ u: key, t: token });
    },
    count: (key, windowMs) => within(key, windowMs).length,
    email: (id) => emails.get(id),
    /** Records an email's status; entering "processing" counts an attempt. */
    mark(id, status) {
      const attempts = (emails.get(id)?.attempts ?? 0) + (status === 'processing' ? 1 : 0);
      record({ e: id, s: status, t: now(), n: attempts });
    },
    /** Lets go of the file (a restart in tests; Windows cannot replace an open file). */
    close() {
      if (fd !== null) closeSync(fd);
      fd = null;
      durable = false;
    },
    /** A stable, salted stand-in for an address, so none is written to disk. */
    key: (...parts) =>
      createHmac('sha256', salt).update(parts.join('\n')).digest('base64url').slice(0, 22),
  };
}

export { DAY, HOUR };
