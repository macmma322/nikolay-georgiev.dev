/**
 * Build-time settings of the enquiry form: where it posts (the mail-agent
 * service's /contact) and the Google appointment schedule it hands over to.
 * Server-side only: read in component frontmatter, passed to the page script
 * through data attributes.
 *
 *   PUBLIC_CONTACT_ENDPOINT  the form's POST URL
 *   BOOKING_URL              the shareable booking link (opened in a new tab)
 *   BOOKING_EMBED_URL        the schedule's inline embed (?gv=true)
 */
const TRUSTED_BOOKING_HOSTS = ['calendar.app.google', 'calendar.google.com'];

const DEFAULTS = {
  endpoint: 'https://mail-agent-production-2e66.up.railway.app/contact',
  booking: 'https://calendar.app.google/go5PwUs8EBNbsSWQ7',
  embed:
    'https://calendar.google.com/calendar/appointments/schedules/AcZssZ2MmfTN8ZZxHWcUmeRdlf7BPxG0iCAx2BwGIWH2QB2EEEyON44lBzvHYdsiuOFPozoMJP0k6_Hi?gv=true',
};

/** A booking URL must be https on Google Calendar's own hosts; anything else fails the build. */
export function trustedBookingUrl(raw: string, name: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${name} is not a URL: ${raw}`);
  }
  if (url.protocol !== 'https:' || !TRUSTED_BOOKING_HOSTS.includes(url.hostname)) {
    throw new Error(`${name} must be an https link on ${TRUSTED_BOOKING_HOSTS.join(' or ')}`);
  }
  return url.href;
}

/** The inline embed must be an appointment schedule on calendar.google.com. */
export function trustedEmbedUrl(raw: string): string {
  const href = trustedBookingUrl(raw, 'BOOKING_EMBED_URL');
  const url = new URL(href);
  if (
    url.hostname !== 'calendar.google.com' ||
    !url.pathname.startsWith('/calendar/appointments/schedules/')
  ) {
    throw new Error('BOOKING_EMBED_URL must be a calendar.google.com appointment schedule');
  }
  return href;
}

const env = import.meta.env;

export const booking = {
  url: trustedBookingUrl(env['BOOKING_URL'] || DEFAULTS.booking, 'BOOKING_URL'),
  embedUrl: trustedEmbedUrl(env['BOOKING_EMBED_URL'] || DEFAULTS.embed),
};

export const contactEndpoint = new URL(env['PUBLIC_CONTACT_ENDPOINT'] || DEFAULTS.endpoint).href;
