import type { CvDoc, Mode } from '@/lib/cv/doc';
import { analyze, suggestTarget, tailor, type Found, type Status, type Term } from '@/lib/cv/match';
import type { FontBytes } from '@/lib/cv/pdf';

/**
 * The CV page in the browser:
 * - Generate CV writes the chosen language, version and role as a PDF with
 *   pdf-lib (loaded on first use) and downloads it.
 * - Tailor CV to a job matches a pasted job description against the site's
 *   evidence (src/lib/cv/match.ts) without sending it anywhere, shows what
 *   matches and what is missing, and orders the CV around the matches.
 * - Any CV other than the general one is previewed by drawing the same
 *   layout in the browser.
 * On any failure the page says so and the ready-made PDFs stay linked.
 */
const root = document.querySelector<HTMLElement>('[data-cv]');
const data = document.getElementById('cv-data');

interface Strings {
  busy: string;
  done: string;
  updating: string;
  page: string;
  empty: string;
  suggest: string;
  use: string;
  applied: string;
  quote: string;
  groups: Record<Status, string>;
  targets: Record<string, string>;
  /** Target id → the part it adds to the file name (cv.ts). */
  files: Record<string, string>;
}

if (root && data) {
  const { docs, terms } = JSON.parse(data.textContent ?? '{}') as {
    docs: Record<string, Record<string, CvDoc>>;
    terms: Record<string, Term[]>;
  };
  const s = JSON.parse(root.dataset.strings ?? '{}') as Strings;
  const fonts = JSON.parse(root.dataset.fonts ?? '{}') as Record<keyof FontBytes, string>;
  const pageLocale = document.documentElement.lang === 'bg' ? 'bg' : 'en';
  const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
  const button = $<HTMLButtonElement>('[data-cv-generate]');
  const status = $<HTMLElement>('[data-cv-status]');
  const failed = $<HTMLElement>('[data-cv-failed]');
  const target = $<HTMLSelectElement>('#cv-target');
  const job = $<HTMLTextAreaElement>('#cv-job');
  const results = $<HTMLElement>('[data-cv-results]');
  const live = $<HTMLElement>('[data-cv-live]');
  let found: Found[] | null = null;
  /** The text that was analysed: later edits count only after Analyse. */
  let analysed = '';
  let busy = false;
  let drawn = 0;

  const value = (name: string) =>
    root.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value ?? '';
  const locale = () => (value('cv-lang') === 'bg' ? 'bg' : 'en');
  const mode = (): Mode => (value('cv-mode') === 'ats' ? 'ats' : 'portfolio');

  /** The CV as chosen: language, role, and the job's matches when there are any. */
  const current = (): CvDoc => {
    const doc = docs[locale()]![target.value] ?? docs[locale()]!['general']!;
    if (!found) return doc;
    // The same matches, named as the CV's own language names them.
    return tailor(doc, analyze(analysed, terms[locale()]!));
  };
  const custom = () => target.value !== 'general' || found !== null;
  const fileName = () => {
    const parts = [locale().toUpperCase(), s.files[target.value], mode() === 'ats' ? 'ATS' : ''];
    return `Nikolay-Georgiev-CV-${parts.filter(Boolean).join('-')}.pdf`;
  };

  const bytes = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  };
  let engine: Promise<{ pdf: typeof import('@/lib/cv/pdf'); fonts: FontBytes }> | undefined;
  const load = () =>
    (engine ??= Promise.all([
      import('@/lib/cv/pdf'),
      bytes(fonts.regular),
      bytes(fonts.semibold),
      bytes(fonts.bold),
    ])
      .then(([pdf, regular, semibold, bold]) => ({ pdf, fonts: { regular, semibold, bold } }))
      // A failed load may work on the next try (back online), so it is not kept.
      .catch((error: unknown) => {
        engine = undefined;
        throw error;
      }));

  /** Draws the chosen CV into the live preview, or hands back to the built ones. */
  const render = async () => {
    const turn = ++drawn;
    if (!custom()) {
      delete root.dataset.custom;
      live.replaceChildren();
      if (!busy) status.textContent = '';
      return;
    }
    if (!busy) status.textContent = s.updating;
    try {
      const [{ pdf, fonts: f }, { layout }, { sheetSvg }] = await Promise.all([
        load(),
        import('@/lib/cv/layout'),
        import('@/lib/cv/svg'),
      ]);
      if (turn !== drawn) return;
      const doc = current();
      const pages = layout(doc, pdf.measurer(f), mode());
      live.lang = doc.lang;
      live.innerHTML = pages
        .map((p, i) =>
          sheetSvg(
            p,
            root.dataset.photo ?? '',
            s.page.replace('{n}', String(i + 1)).replace('{total}', String(pages.length)),
          ),
        )
        .join('');
      root.dataset.custom = '';
      if (!busy) status.textContent = '';
    } catch (error) {
      if (turn !== drawn) return;
      console.warn('CV preview failed', error);
      if (!busy) status.textContent = '';
      delete root.dataset.custom;
    }
  };

  const save = (pdf: Uint8Array, file: string) => {
    const url = URL.createObjectURL(new Blob([pdf as BlobPart], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = file;
    document.body.append(a);
    a.click();
    a.remove();
    // Some browsers read the blob after click() returns.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  // ---------- the job description ----------
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const report = (list: Found[]) => {
    if (!list.length) return `<p class="note">${esc(s.empty)}</p>`;
    const role = suggestTarget(list);
    const use =
      role !== target.value
        ? `<button type="button" data-cv-use="${role}">${esc(s.use)}</button>`
        : '';
    const groups = (['verified', 'related', 'learning', 'missing'] as Status[])
      .map((st) => {
        const items = list.filter((f) => f.term.status === st);
        if (!items.length) return '';
        const li = items
          .map(
            (f) =>
              `<li><b>${esc(f.term.name)}</b>${f.term.evidence ? ` – ${esc(f.term.evidence)}` : ''}` +
              `<span class="q">${esc(s.quote.replace('{quote}', f.quote))}</span></li>`,
          )
          .join('');
        return `<h3 data-status="${st}">${esc(s.groups[st])} (${items.length})</h3><ul role="list">${li}</ul>`;
      })
      .join('');
    return (
      `<p class="suggest">${esc(s.suggest.replace('{role}', s.targets[role] ?? role))}${use}</p>` +
      `<p class="note">${esc(s.applied)}</p>${groups}`
    );
  };

  $('[data-cv-analyse]').addEventListener('click', () => {
    if (!job.value.trim()) return;
    analysed = job.value;
    const list = analyze(analysed, terms[pageLocale]!);
    results.innerHTML = report(list);
    found = list.length ? list : null;
    void render();
  });
  $('[data-cv-clear]').addEventListener('click', () => {
    job.value = '';
    analysed = '';
    found = null;
    results.replaceChildren();
    void render();
  });
  results.addEventListener('click', (event) => {
    const use = (event.target as HTMLElement).closest<HTMLElement>('[data-cv-use]');
    if (!use) return;
    target.value = use.dataset['cvUse'] ?? 'general';
    use.remove();
    void render();
  });

  for (const input of root.querySelectorAll('input[name="cv-lang"], input[name="cv-mode"]')) {
    input.addEventListener('change', () => void render());
  }
  target.addEventListener('change', () => void render());

  // ---------- generate ----------
  const warm = () => void load().catch(() => {});
  button.addEventListener('pointerenter', warm, { once: true });
  button.addEventListener('focus', warm, { once: true });
  button.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    button.setAttribute('aria-disabled', 'true');
    failed.hidden = true;
    status.textContent = s.busy;
    const file = fileName();
    try {
      const [{ pdf, fonts: f }, photo] = await Promise.all([
        load(),
        mode() === 'portfolio' ? bytes(root.dataset.photo ?? '') : Promise.resolve(undefined),
      ]);
      save(await pdf.cvPdf(current(), { fonts: f, photo }, mode()), file);
      status.textContent = s.done.replace('{file}', file);
    } catch (error) {
      console.warn('CV generation failed', error);
      status.textContent = '';
      failed.hidden = false;
    } finally {
      busy = false;
      button.removeAttribute('aria-disabled');
    }
  });

  for (const el of root.querySelectorAll<HTMLElement>('[data-cv-js]')) el.hidden = false;
  button.hidden = false;
}
