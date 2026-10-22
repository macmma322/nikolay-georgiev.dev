import { createHash } from 'node:crypto';

/**
 * Stylesheets generated from data (`<style set:html>`) are not hashed by
 * Astro's CSP automatically. Components that render one register its hash
 * with `Astro.csp?.insertStyleHash(styleHash(css))`, otherwise the browser
 * blocks it in production while the dev server (no CSP) shows it working.
 */
export function styleHash(css: string): `sha256-${string}` {
  return `sha256-${createHash('sha256').update(css).digest('base64')}`;
}

/** The same digest for an inline `<script set:html>`: `Astro.csp?.insertScriptHash(...)`. */
export const scriptHash = styleHash;
