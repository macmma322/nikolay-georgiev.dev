import { createHash } from 'node:crypto';
import { tech } from '@/data/tech';
import { iconFor } from '@/lib/icons';

/**
 * Every brand icon in the technology registry as one external SVG sprite.
 * Pages reference symbols with <use>, so an icon's path is downloaded once and
 * cached, instead of being repeated in the HTML each time the icon appears.
 * The file name carries a content hash, so it can be cached as immutable.
 */
const symbols = [...new Set(tech.map((t) => t.icon).filter((s): s is string => Boolean(s)))]
  .sort()
  .map(
    (slug) =>
      `<symbol id="${slug}" viewBox="0 0 24 24"><path d="${iconFor(slug)?.path}"/></symbol>`,
  )
  .join('');

export const spriteSvg = `<svg xmlns="http://www.w3.org/2000/svg">${symbols}</svg>`;
export const spriteName = `tech-${createHash('sha256').update(spriteSvg).digest('hex').slice(0, 10)}`;
export const spriteHref = `/icons/${spriteName}.svg`;
