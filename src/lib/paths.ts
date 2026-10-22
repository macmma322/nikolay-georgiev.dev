/**
 * Normalises Astro.url.pathname across dev ("/work/jarvis") and
 * build.format "file" output ("/work/jarvis.html", "/index.html").
 */
export function cleanPath(pathname: string): string {
  const stripped = pathname
    .replace(/\.html$/, '')
    .replace(/\/index$/, '')
    .replace(/\/$/, '');
  return stripped === '' || stripped === '/index' ? '/' : stripped;
}
