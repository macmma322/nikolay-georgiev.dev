// Pre-build check of the localized sources (dictionaries, data, case studies,
// templates). Exits non-zero on any problem so `npm run build` stops early.
//   - a Bulgarian side left empty while the English one is not
//   - an English sentence left in a Bulgarian value (copied, not translated)
//   - placeholders ({n}) present in one locale but not the other
//   - plural/function leaves whose locales disagree in shape
//   - literal English in accessibility attributes of templates (hardcoded UI)
// The dictionaries are TypeScript; Node strips the types on import.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const LOCALES = ['en', 'bg'];
const CYRILLIC = /[Ѐ-ӿ]/;
// Function words that only an English sentence strings together.
const EN_WORDS =
  /\b(the|and|of|to|is|are|with|for|on|in|it|that|this|not|by|from|an?|be|or|as|at|was|has|have|only|every|its|into|your|you|when|which)\b/gi;
const problems = [];

/** Four or more words, two or more of them English function words, no Cyrillic. */
export function looksEnglish(text) {
  if (CYRILLIC.test(text)) return false;
  const words = text.split(/\s+/).filter((w) => /[A-Za-z]{2,}/.test(w));
  return words.length >= 4 && (text.match(EN_WORDS) ?? []).length >= 2;
}

const placeholders = (text) =>
  [...text.matchAll(/\{\w+\}/g)]
    .map((m) => m[0])
    .sort()
    .join(' ');

const isLeaf = (v) =>
  typeof v === 'object' &&
  v !== null &&
  !Array.isArray(v) &&
  Object.keys(v).length === LOCALES.length &&
  LOCALES.every((l) => l in v);

function checkStrings(where, en, bg) {
  if (bg === '' && en !== '') problems.push(`${where}: Bulgarian is empty`);
  // An empty English side is the "Bulgarian pages only" pattern (a note
  // that the CV or the blueprint is in English).
  if (bg && looksEnglish(bg)) problems.push(`${where}: Bulgarian reads as English: "${bg}"`);
  if (placeholders(en) !== placeholders(bg))
    problems.push(
      `${where}: placeholders differ (en "${placeholders(en)}", bg "${placeholders(bg)}")`,
    );
}

function walk(value, where) {
  if (isLeaf(value)) {
    const { en, bg } = value;
    if (typeof en === 'string' && typeof bg === 'string') return checkStrings(where, en, bg);
    if (typeof en === 'function' || typeof bg === 'function') {
      if (typeof en !== typeof bg || en.length !== bg.length)
        problems.push(`${where}: the locales are not functions of the same arity`);
      return;
    }
    if (typeof en === 'object' && typeof bg === 'object' && en && bg && !Array.isArray(en)) {
      // Plural forms: same keys, same placeholders.
      const keys = (o) => Object.keys(o).sort().join();
      if (keys(en) !== keys(bg)) problems.push(`${where}: plural forms differ`);
      for (const k of Object.keys(en))
        if (typeof en[k] === 'string' && typeof bg[k] === 'string')
          checkStrings(`${where}.${k}`, en[k], bg[k]);
      return;
    }
    if (Array.isArray(en) && Array.isArray(bg)) {
      if (!en.length !== !bg.length) problems.push(`${where}: one locale is an empty list`);
      bg.forEach((item, i) => walk(item, `${where}.bg[${i}]`));
      return;
    }
    return;
  }
  if (Array.isArray(value)) return value.forEach((v, i) => walk(v, `${where}[${i}]`));
  if (typeof value === 'object' && value !== null)
    for (const [k, v] of Object.entries(value)) walk(v, `${where}.${k}`);
}

const files = (dir, ext) =>
  readdirSync(join(root, dir))
    .filter((f) => f.endsWith(ext))
    .map((f) => join(root, dir, f));

// Dictionaries and data with { en, bg } leaves. diagrams/index.ts imports
// runtime code through the @/ alias, so the diagrams are read one by one.
const modules = [
  ...files('src/i18n/ui', '.ts'),
  ...files('src/data', '.ts'),
  ...files('src/data/diagrams', '.ts').filter((f) => !f.endsWith('index.ts')),
  join(root, 'src/lib/status.ts'),
];
for (const file of modules) {
  const mod = await import(pathToFileURL(file).href);
  for (const [name, value] of Object.entries(mod)) walk(value, `${relative(root, file)}:${name}`);
}
walk(JSON.parse(readFileSync(join(root, 'src/content/lab.json'), 'utf8')), 'src/content/lab.json');

// Bulgarian case studies: no frontmatter value or body paragraph left in English.
for (const file of files('src/content/projects/bg', '.md')) {
  const rel = relative(root, file).replaceAll('\\', '/');
  readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .forEach((line, i) => {
      const text = line
        .replace(/^\s*(-\s+)?([\w]+:\s*)?/, '')
        .replace(/`[^`]*`/g, '')
        .replace(/^['"{]|['"}]$/g, '');
      if (looksEnglish(text))
        problems.push(`${rel}:${i + 1}: Bulgarian reads as English: "${text}"`);
    });
}

// Templates: accessibility attributes take their text from a dictionary.
const ATTR =
  /\s(aria-label|aria-description|alt|title|placeholder)="([^"{}]*[A-Za-z]{2,}[^"{}]*)"/g;
for (const dir of ['src/components', 'src/views', 'src/pages', 'src/layouts']) {
  for (const file of readdirSync(join(root, dir), { recursive: true })) {
    if (!String(file).endsWith('.astro')) continue;
    const path = join(root, dir, String(file));
    const text = readFileSync(path, 'utf8');
    for (const m of text.matchAll(ATTR))
      problems.push(`${relative(root, path)}: hardcoded ${m[1]}="${m[2]}"`);
  }
}

if (problems.length) {
  console.error(`i18n: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(
  `i18n: ${modules.length + 1} dictionaries and the Bulgarian case studies OK (no empty or English Bulgarian, placeholders match, no hardcoded attributes)`,
);
