import * as si from 'simple-icons';

/**
 * Build-time lookup into simple-icons (CC0). Only the paths that are actually
 * rendered end up in the HTML; nothing ships to the client as JavaScript.
 */
interface SimpleIcon {
  slug: string;
  path: string;
  hex: string;
  title: string;
}

const bySlug = new Map<string, SimpleIcon>();
for (const value of Object.values(si)) {
  const icon = value as Partial<SimpleIcon>;
  if (icon && typeof icon === 'object' && icon.slug && icon.path && icon.hex) {
    bySlug.set(icon.slug, icon as SimpleIcon);
  }
}

function luminance(hex: string): number {
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export interface ResolvedIcon {
  path: string;
  hex: string;
  /** False for near-black brand colours that would vanish on the dark theme. */
  brandable: boolean;
}

export function iconFor(slug: string | undefined): ResolvedIcon | undefined {
  if (!slug) return undefined;
  const icon = bySlug.get(slug);
  if (!icon) throw new Error(`simple-icons: unknown slug "${slug}"`);
  return { path: icon.path, hex: `#${icon.hex}`, brandable: luminance(icon.hex) > 0.06 };
}
