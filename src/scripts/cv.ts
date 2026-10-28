import type { CvDoc } from '@/lib/cv/doc';
import type { FontBytes } from '@/lib/cv/pdf';

/**
 * Generate CV: writes the chosen language's PDF in the browser with pdf-lib
 * (loaded on first click) and downloads it. On any failure the page says so
 * and shows the ready-made PDF, which is always linked anyway.
 */
const root = document.querySelector<HTMLElement>('[data-cv]');
const data = document.getElementById('cv-data');

if (root && data) {
  const docs = JSON.parse(data.textContent ?? '{}') as Record<string, CvDoc>;
  const button = root.querySelector<HTMLButtonElement>('[data-cv-generate]')!;
  const status = root.querySelector<HTMLElement>('[data-cv-status]')!;
  const failed = root.querySelector<HTMLElement>('[data-cv-failed]')!;
  const fonts = JSON.parse(root.dataset.fonts ?? '{}') as Record<keyof FontBytes, string>;
  let busy = false;

  const bytes = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
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

  // Start loading pdf-lib when the visitor reaches for the button.
  const warm = () => void import('@/lib/cv/pdf').catch(() => {});
  button.addEventListener('pointerenter', warm, { once: true });
  button.addEventListener('focus', warm, { once: true });
  button.hidden = false;
  button.addEventListener('click', async () => {
    if (busy) return;
    const locale =
      root.querySelector<HTMLInputElement>('input[name="cv-lang"]:checked')?.value ?? 'en';
    const doc = docs[locale];
    if (!doc) return;
    busy = true;
    button.setAttribute('aria-disabled', 'true');
    failed.hidden = true;
    status.textContent = root.dataset.busy ?? '';
    try {
      const [{ cvPdf }, regular, semibold, bold, photo] = await Promise.all([
        import('@/lib/cv/pdf'),
        bytes(fonts.regular),
        bytes(fonts.semibold),
        bytes(fonts.bold),
        bytes(root.dataset.photo ?? ''),
      ]);
      const pdf = await cvPdf(doc, { fonts: { regular, semibold, bold }, photo });
      save(pdf, doc.file);
      status.textContent = (root.dataset.done ?? '').replace('{file}', doc.file);
    } catch (error) {
      console.warn('CV generation failed', error);
      status.textContent = '';
      failed.hidden = false;
    } finally {
      busy = false;
      button.removeAttribute('aria-disabled');
    }
  });
}
