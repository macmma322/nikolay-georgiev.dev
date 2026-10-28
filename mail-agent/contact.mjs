// POST /contact: the website form's only backend. It validates a submission
// with the shared rules (enquiry.mjs) and delivers it to the inbox as one
// email; nothing is stored and nothing is sent to the visitor, whose address
// is unverified (an auto-reply would let anyone mail any address from here).
import { formatEnquiryEmail, makeReference, validateEnquiry } from './enquiry.mjs';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
// Faster than a person can choose a type and type a name and a message.
const MIN_FILL_MS = 3000;

/**
 * @param {object} options
 * @param {(mail: {subject: string, text: string, replyTo: string, key: string}) => Promise<void>} options.send
 * @param {string[]} options.origins  page origins allowed to post
 * @param {(n: number) => Uint8Array} options.random
 */
export function createContactHandler({
  send,
  origins,
  random,
  now = () => Date.now(),
  perIpHourly = 5,
  dailyCap = 50,
  audit = () => {},
}) {
  const recentByIp = new Map();
  const results = new Map(); // idempotency key → finished or in-flight result
  let day = '';
  let today = 0;

  const forget = () => {
    const cutoff = now() - DAY;
    for (const [key, entry] of results) if (entry.at < cutoff) results.delete(key);
    for (const [ip, times] of recentByIp) {
      const kept = times.filter((t) => t > now() - HOUR);
      if (kept.length) recentByIp.set(ip, kept);
      else recentByIp.delete(ip);
    }
  };

  return async function handleContact({ origin, ip, body }) {
    if (!origins.includes(origin)) return { status: 403, body: { ok: false, error: 'origin' } };
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      return { status: 400, body: { ok: false, error: 'invalid' } };
    }
    const key = typeof data?.idempotencyKey === 'string' ? data.idempotencyKey : '';
    if (!/^[A-Za-z0-9-]{16,64}$/.test(key)) {
      return { status: 400, body: { ok: false, error: 'invalid' } };
    }
    forget();
    // A retry, a double click or a replayed request returns the first answer.
    const previous = results.get(key);
    if (previous) return previous.response;

    const pending = (async () => {
      // Bot traps answer like a success, so a bot learns nothing, and send nothing.
      if (data.website || !(now() - Number(data.startedAt) >= MIN_FILL_MS)) {
        audit({ contact: 'trapped', reasons: [data.website ? 'honeypot' : 'too fast'] });
        return { status: 200, body: { ok: true, reference: makeReference(random) } };
      }
      const recent = recentByIp.get(ip) ?? [];
      const date = new Date(now()).toISOString().slice(0, 10);
      if (date !== day) [day, today] = [date, 0];
      if (recent.length >= perIpHourly || today >= dailyCap) {
        audit({ contact: 'limited', reasons: [today >= dailyCap ? 'daily cap' : 'per ip'] });
        return { status: 429, body: { ok: false, error: 'rate' } };
      }
      const checked = validateEnquiry(data);
      if (!checked.ok) {
        return { status: 422, body: { ok: false, error: 'invalid', fields: checked.errors } };
      }
      recentByIp.set(ip, [...recent, now()]);
      today += 1;
      const reference = makeReference(random);
      const mail = formatEnquiryEmail(checked.value, reference);
      try {
        await send({ ...mail, replyTo: checked.value.email, key });
      } catch (error) {
        audit({ contact: 'failed', reference, reasons: [String(error.message).slice(0, 200)] });
        return { status: 502, body: { ok: false, error: 'send' } };
      }
      // No names, addresses or message text in the log: category and outcome only.
      audit({
        contact: 'delivered',
        reference,
        category: checked.value.category,
        intent: checked.value.intent ?? null,
      });
      return { status: 200, body: { ok: true, reference } };
    })();

    results.set(key, { at: now(), response: pending });
    const response = await pending;
    // Only a delivered (or trapped) submission is final; failures may be retried.
    if (response.status === 200) results.set(key, { at: now(), response });
    else results.delete(key);
    return response;
  };
}
