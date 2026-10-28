// Who is asking, for rate limits only. The service sits behind exactly one
// proxy, Railway's edge: no CDN, no other hop (the form posts straight to the
// *.up.railway.app domain). Railway documents one header as the client's
// address, X-Real-IP. Measured live on 28 October 2026: the edge replaces a
// client's X-Real-IP and X-Forwarded-For, and sends X-Forwarded-For as two
// hops, "client, edge", so its right-most entry is Railway's own address.
// X-Forwarded-For is undocumented and only appears in diagnostics.
// docs/contact-flow.md records the probe.
import { isIP } from 'node:net';

const v4ToNumber = (ip) => ip.split('.').reduce((n, part) => n * 256 + Number(part), 0);

/** Eight 16-bit groups of an IPv6 address (zone and brackets already removed). */
function v6Groups(ip) {
  let text = ip.toLowerCase();
  const v4 = text.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    const n = v4ToNumber(v4[1]);
    text = `${text.slice(0, -v4[1].length)}${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`;
  }
  const [head, tail] = text.split('::');
  const left = head ? head.split(':') : [];
  const right = tail === undefined ? [] : tail ? tail.split(':') : [];
  const fill = tail === undefined ? [] : Array(8 - left.length - right.length).fill('0');
  return [...left, ...fill, ...right].map((group) => parseInt(group, 16));
}

/**
 * One address as a rate-limit bucket: IPv4 as written, IPv4-mapped IPv6 as its
 * IPv4, any other IPv6 as its /64 (one subscriber's block, which a client can
 * rotate through freely). Null for anything that is not a single address.
 */
export function ipBucket(raw) {
  const ip = String(raw ?? '')
    .trim()
    .replace(/^\[(.*)\]$/, '$1')
    .replace(/%.*$/, '');
  const version = isIP(ip);
  if (version === 4) return ip;
  if (version !== 6) return null;
  const groups = v6Groups(ip);
  if (groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff) {
    return [groups[6] >> 8, groups[6] & 255, groups[7] >> 8, groups[7] & 255].join('.');
  }
  return `${groups
    .slice(0, 4)
    .map((g) => g.toString(16))
    .join(':')}::/64`;
}

/** The kind of address, for diagnostics that must not log the address itself. */
export function ipKind(raw) {
  const bucket = ipBucket(raw);
  if (!bucket) return 'invalid';
  if (!bucket.endsWith('/64')) {
    const n = v4ToNumber(bucket);
    const inRange = (base, bits) => n >>> (32 - bits) === v4ToNumber(base) >>> (32 - bits);
    if (inRange('127.0.0.0', 8)) return 'loopback';
    if (['192.0.2.0', '198.51.100.0', '203.0.113.0'].some((base) => inRange(base, 24)))
      return 'documentation';
    if (
      inRange('10.0.0.0', 8) ||
      inRange('172.16.0.0', 12) ||
      inRange('192.168.0.0', 16) ||
      inRange('100.64.0.0', 10) ||
      inRange('169.254.0.0', 16)
    )
      return 'private';
    return 'public';
  }
  const first = parseInt(bucket, 16);
  if (bucket === '0:0:0:0::/64') return 'loopback';
  if (bucket.startsWith('2001:db8:')) return 'documentation';
  if ((first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80) return 'private';
  return 'public';
}

const header = (headers, name) => [headers[name]].flat().filter(Boolean).join(', ');

/**
 * The rate-limit bucket for a request, and where it came from. X-Real-IP when it
 * holds exactly one address; otherwise every client without one shares the
 * bucket "unknown", which only makes limits stricter, never looser. The socket
 * address is used only when there is no proxy at all (local runs and tests).
 */
export function clientAddress(headers, socketAddress = '') {
  const real = header(headers, 'x-real-ip');
  const fromProxy = ipBucket(real);
  if (fromProxy) return { ip: fromProxy, source: 'x-real-ip' };
  if (real || header(headers, 'x-forwarded-for')) return { ip: 'unknown', source: 'unusable' };
  const socket = ipBucket(socketAddress);
  return socket ? { ip: socket, source: 'socket' } : { ip: 'unknown', source: 'none' };
}

/** The proxy chain's shape, with no address in it: what a request log may keep. */
export function forwardedShape(headers) {
  const hops = header(headers, 'x-forwarded-for')
    .split(',')
    .map((hop) => hop.trim())
    .filter(Boolean);
  const real = header(headers, 'x-real-ip');
  return {
    xff: hops.map(ipKind),
    real_ip: real ? ipKind(real) : 'absent',
    real_is_first_hop: Boolean(real) && ipBucket(real) === ipBucket(hops[0]),
    real_is_last_hop: Boolean(real) && ipBucket(real) === ipBucket(hops.at(-1)),
  };
}
