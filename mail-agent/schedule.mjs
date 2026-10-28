// Meeting times for the mail agent. Read-only: it suggests free times and
// checks requested ones against Google Calendar free/busy. It never creates,
// moves or cancels an event; booking goes through the Google Calendar
// appointment page (BOOKING_URL), which re-checks availability itself.
import { createSign } from 'node:crypto';

const number = (value, fallback) =>
  value === undefined || value === '' ? fallback : Number(value);

/** "1-5" or "1,3,5" as ISO weekdays (1 = Monday). */
const parseDays = (spec) =>
  spec.split(',').flatMap((part) => {
    const [from, to = from] = part.split('-').map(Number);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  });

/** "09:00-13:00,14:00-18:00" as [startMinute, endMinute] pairs. */
const parseHours = (spec) =>
  spec.split(',').map((range) =>
    range.split('-').map((time) => {
      const [h, m = '0'] = time.trim().split(':');
      return Number(h) * 60 + Number(m);
    }),
  );

/**
 * Bookable hours per weekday, groups split by ";":
 * "1-5 13:00-13:30,18:30-20:30; 6 10:00-12:00" is weekday lunch and evenings,
 * plus Saturday morning. Days not listed take no calls.
 */
export const parseSchedule = (spec) => {
  const byDay = new Map();
  for (const group of spec.split(';')) {
    const [days, hours] = group.trim().split(/\s+/);
    for (const day of parseDays(days)) byDay.set(day, parseHours(hours));
  }
  return byDay;
};

// Mirrors the Google booking page (the authority at booking time): weekday lunch and
// evenings around the day job, and Saturday. Override with MEETING_SCHEDULE.
const DEFAULT_SCHEDULE = '1-5 13:00-14:00,18:30-20:30; 6 11:00-16:00';

export function scheduleConfig(env) {
  return {
    bookingUrl: env.BOOKING_URL ?? '',
    timeZone: env.MEETING_TZ ?? 'Europe/Sofia',
    hours: parseSchedule(env.MEETING_SCHEDULE || DEFAULT_SCHEDULE),
    minutes: number(env.MEETING_MINUTES, 30),
    buffer: number(env.MEETING_BUFFER_MINUTES, 15),
    noticeHours: number(env.MEETING_NOTICE_HOURS, 12),
    windowDays: number(env.MEETING_WINDOW_DAYS, 14),
    calendarId: env.GOOGLE_CALENDAR_ID ?? '',
    serviceAccount: env.GOOGLE_SERVICE_ACCOUNT_JSON ?? '',
  };
}

// ---------- Wall-clock time in the owner's zone ----------

const formatters = new Map();
const partsIn = (ms, timeZone) => {
  if (!formatters.has(timeZone)) {
    formatters.set(
      timeZone,
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    );
  }
  return Object.fromEntries(
    formatters
      .get(timeZone)
      .formatToParts(ms)
      .map((part) => [part.type, Number(part.value)]),
  );
};

const offsetAt = (ms, timeZone) => {
  const p = partsIn(ms, timeZone);
  return (
    Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000
  );
};

/** UTC instant of a wall-clock minute on a civil date in `timeZone` (DST-safe). */
export function zonedToUtc(year, monthIndex, day, minuteOfDay, timeZone) {
  const guess = Date.UTC(year, monthIndex, day, 0, minuteOfDay);
  return guess - offsetAt(guess - offsetAt(guess, timeZone), timeZone);
}

/** Civil date and minute of day of an instant in `timeZone`. */
function localOf(ms, timeZone) {
  const p = partsIn(ms, timeZone);
  const weekday = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay() || 7;
  return {
    year: p.year,
    monthIndex: p.month - 1,
    day: p.day,
    minute: p.hour * 60 + p.minute,
    weekday,
  };
}

// ---------- Slots ----------

const overlaps = (start, end, busy) => busy.some((b) => start < b.end && end > b.start);

/** Whether a start time follows the rules: bookable day and hours, notice, window. */
export function withinRules(start, cfg, now) {
  const local = localOf(start, cfg.timeZone);
  const fitsHours = (cfg.hours.get(local.weekday) ?? []).some(
    ([from, to]) => local.minute >= from && local.minute + cfg.minutes <= to,
  );
  return (
    fitsHours &&
    start >= now + cfg.noticeHours * 3_600_000 &&
    start <= now + cfg.windowDays * 86_400_000
  );
}

/** Every rule-abiding start, every 30 minutes, clear of busy time plus the buffer. */
export function freeSlots(busy, cfg, now) {
  const today = localOf(now, cfg.timeZone);
  const slots = [];
  for (let i = 0; i <= cfg.windowDays; i += 1) {
    const date = new Date(Date.UTC(today.year, today.monthIndex, today.day + i));
    for (const [from, to] of cfg.hours.get(date.getUTCDay() || 7) ?? []) {
      for (let minute = from; minute + cfg.minutes <= to; minute += 30) {
        const start = zonedToUtc(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate(),
          minute,
          cfg.timeZone,
        );
        const end = start + cfg.minutes * 60_000;
        const pad = cfg.buffer * 60_000;
        if (withinRules(start, cfg, now) && !overlaps(start - pad, end + pad, busy))
          slots.push(start);
      }
    }
  }
  return slots;
}

/**
 * What to tell a client who asked for `requested` (ms, optional):
 * whether that time works, whether it breaks the rules (owner must approve),
 * and up to `count` free times, at most one per day, nearest the request first.
 */
export function suggest(busy, cfg, now, requested, count = 3) {
  const slots = freeSlots(busy, cfg, now);
  const result = { requested: 'none', slots: [] };
  if (requested !== undefined) {
    if (!withinRules(requested, cfg, now)) result.requested = 'outside_rules';
    else result.requested = slots.includes(requested) ? 'free' : 'unavailable';
  }
  const ordered =
    requested === undefined
      ? slots
      : [...slots].sort((a, b) => Math.abs(a - requested) - Math.abs(b - requested));
  const days = new Set();
  for (const slot of ordered) {
    const local = localOf(slot, cfg.timeZone);
    const key = `${local.year}-${local.monthIndex}-${local.day}`;
    if (slot === requested || days.has(key)) continue;
    days.add(key);
    result.slots.push(slot);
    if (result.slots.length === count) break;
  }
  result.slots.sort((a, b) => a - b);
  return result;
}

const DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const clock = (minute) =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

/** "Mon–Fri 13:00–13:30, 18:30–20:30; Sat 10:00–12:00", grouping days with the same hours. */
export function describeHours(cfg) {
  const groups = [];
  for (const day of [...cfg.hours.keys()].sort((a, b) => a - b)) {
    const hours = cfg.hours
      .get(day)
      .map(([from, to]) => `${clock(from)}–${clock(to)}`)
      .join(', ');
    const last = groups.at(-1);
    if (last && last.hours === hours && last.to === day - 1) last.to = day;
    else groups.push({ from: day, to: day, hours });
  }
  return groups
    .map(
      ({ from, to, hours }) => `${DAY_NAMES[from]}${to > from ? `–${DAY_NAMES[to]}` : ''} ${hours}`,
    )
    .join('; ');
}

export const formatSlot = (start, cfg) => {
  const format = (ms, options) =>
    new Intl.DateTimeFormat('en-GB', { timeZone: cfg.timeZone, ...options }).format(ms);
  const time = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
  return `${format(start, { weekday: 'short', day: 'numeric', month: 'short' })}, ${format(start, time)}–${format(start + cfg.minutes * 60_000, time)}`;
};

// ---------- Google Calendar free/busy (read-only) ----------

let token = { value: '', expires: 0 };

async function accessToken(serviceAccount) {
  if (token.expires > Date.now() + 60_000) return token.value;
  const { client_email, private_key } = JSON.parse(serviceAccount);
  const now = Math.floor(Date.now() / 1000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
    iss: client_email,
    // Free/busy only: the key cannot read event details or write anything.
    scope: 'https://www.googleapis.com/auth/calendar.freebusy',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(private_key, 'base64url');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  });
  if (!response.ok) throw new Error(`Google token ${response.status}: ${await response.text()}`);
  const body = await response.json();
  token = { value: body.access_token, expires: Date.now() + body.expires_in * 1000 };
  return token.value;
}

/** Busy intervals (ms) in the booking window. Only start/end come back: never titles or guests. */
export async function busyTimes(cfg, now = Date.now()) {
  const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await accessToken(cfg.serviceAccount)}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      timeMin: new Date(now).toISOString(),
      timeMax: new Date(now + (cfg.windowDays + 1) * 86_400_000).toISOString(),
      items: [{ id: cfg.calendarId }],
    }),
  });
  if (!response.ok)
    throw new Error(`Google free/busy ${response.status}: ${await response.text()}`);
  const calendar = (await response.json()).calendars?.[cfg.calendarId];
  if (!calendar || calendar.errors?.length)
    throw new Error(`Google free/busy: ${JSON.stringify(calendar?.errors)}`);
  return calendar.busy.map(({ start, end }) => ({
    start: Date.parse(start),
    end: Date.parse(end),
  }));
}
