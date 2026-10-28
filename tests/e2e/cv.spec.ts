import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { PDFDict, PDFDocument, PDFName, PDFStream } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

// The CV page in every engine (playwright.config.ts runs this file in
// Chromium, Firefox and WebKit, on desktop and phones): the Generate button
// writes a real PDF in the browser, and that PDF is checked here the way an
// applicant tracking system would read it.

const files = { en: 'Nikolay-Georgiev-CV-EN.pdf', bg: 'Nikolay-Georgiev-CV-BG.pdf' } as const;

/** What any reader must get out of the text layer. */
const expected = {
  en: [
    'Nikolay Georgiev',
    'Software Engineer',
    'Experience',
    'Junior Backend Developer',
    'DXC Technology',
    'Sep 2025 – present',
    'Genpact',
    'Oct 2024 – Sep 2025',
    'Education',
    'BSc Computer Science',
    'Selected projects',
    'USS X Academy',
    'Zone 32-19',
    'J.A.R.V.I.S.',
    'Caelora',
    'KObait',
    'PostgreSQL',
    'nikolay.georgiev00@outlook.com',
  ],
  bg: [
    'Николай Георгиев',
    'Софтуерен инженер',
    'Професионален опит',
    'Младши бекенд разработчик',
    'DXC Technology',
    'септ. 2025 – досега',
    'Образование',
    'Бакалавър по компютърни науки',
    'Избрани проекти',
    'USS X Academy',
    'KObait',
    'Езици',
    'nikolay.georgiev00@outlook.com',
  ],
};

async function inspect(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const sizes = doc.getPages().map((p) => p.getSize());
  // Embedded TrueType programs (FontFile2) and their Unicode maps.
  let fontFiles = 0;
  let unicodeMaps = 0;
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFDict || obj instanceof PDFStream) {
      const dict = obj instanceof PDFStream ? obj.dict : obj;
      if (dict.get(PDFName.of('FontFile2'))) fontFiles++;
      if (dict.get(PDFName.of('ToUnicode'))) unicodeMaps++;
    }
  }
  const pdf = await getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const pages: string[] = [];
  const links: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    pages.push(content.items.map((i) => ('str' in i ? i.str : '')).join(' '));
    for (const a of await page.getAnnotations()) if (a.subtype === 'Link') links.push(a.url);
  }
  const { info } = (await pdf.getMetadata()) as { info: Record<string, string> };
  return {
    sizes,
    fontFiles,
    unicodeMaps,
    text: pages.join('\n'),
    links,
    info,
    count: pdf.numPages,
  };
}

async function generate(page: Page, locale: 'en' | 'bg') {
  await page.locator(`label:has(input[name="cv-lang"][value="${locale}"])`).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Generate CV' }).click();
  const file = await download;
  await expect(page.locator('[data-cv-status]')).toContainText(files[locale]);
  return file;
}

for (const site of ['en', 'bg'] as const) {
  const path = site === 'en' ? '/cv' : '/bg/cv';

  test(`${path} previews the CV in the page's language`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator(`input[name="cv-lang"][value="${site}"]`)).toBeChecked();
    const shown = page.locator(`.preview[data-lang="${site}"]`);
    await expect(shown).toBeVisible();
    await expect(page.locator(`.preview[data-lang="${site === 'en' ? 'bg' : 'en'}"]`)).toBeHidden();
    expect(await shown.locator('svg.sheet').count()).toBeGreaterThanOrEqual(1);
    await expect(shown).toContainText(
      site === 'en' ? 'Junior Backend Developer' : 'Младши бекенд разработчик',
    );
    await expect(page.locator('[data-cv-generate]')).toBeVisible();
    // The ready-made copy of the chosen language is linked.
    await expect(page.locator(`a.ready-link[data-lang="${site}"]`)).toHaveAttribute(
      'href',
      `/${files[site]}`,
    );
  });
}

for (const locale of ['en', 'bg'] as const) {
  test(`Generate CV writes a valid ${locale.toUpperCase()} PDF`, async ({ page }) => {
    test.slow();
    await page.goto('/cv');
    const file = await generate(page, locale);
    expect(file.suggestedFilename()).toBe(files[locale]);
    const bytes = new Uint8Array(await readFile((await file.path())!));
    expect(Buffer.from(bytes.subarray(0, 5)).toString()).toBe('%PDF-');

    const pdf = await inspect(bytes);
    // Same number of pages as the preview shows.
    expect(pdf.count).toBe(await page.locator(`.preview[data-lang="${locale}"] svg.sheet`).count());
    for (const s of pdf.sizes) {
      expect(s.width).toBeCloseTo(595.28, 1);
      expect(s.height).toBeCloseTo(841.89, 1);
    }
    expect(pdf.fontFiles).toBeGreaterThanOrEqual(3);
    expect(pdf.unicodeMaps).toBeGreaterThanOrEqual(3);
    for (const phrase of expected[locale]) expect(pdf.text).toContain(phrase);
    // No phone number, ever, and no box glyphs for missing characters.
    expect(pdf.text).not.toMatch(/\+359|0893/);
    expect(pdf.text).not.toContain('�');
    expect(pdf.links).toEqual(
      expect.arrayContaining([
        'mailto:nikolay.georgiev00@outlook.com',
        'https://github.com/macmma322',
        'https://www.linkedin.com/in/nikolaygeorgiev0049/',
      ]),
    );
    expect(pdf.info['Title']).toContain('CV');
    expect(pdf.info['Author']).toBe(locale === 'en' ? 'Nikolay Georgiev' : 'Николай Георгиев');
    expect(pdf.info['Language']).toBe(locale);

    // The ready-made copy, written at build time by the same code, says the same.
    const ready = await page.request.get(`/${files[locale]}`);
    expect(ready.status()).toBe(200);
    expect((await inspect(new Uint8Array(await ready.body()))).text).toBe(pdf.text);
  });
}

test('a failed generation says so and points to the ready-made PDF', async ({ page }) => {
  await page.route(/TikTokSans_400Regular.*\.ttf$/, (route) => route.fulfill({ status: 500 }));
  await page.goto('/cv');
  await page.locator('[data-cv-generate]').click();
  await expect(page.locator('[data-cv-failed]')).toBeVisible();
  await expect(page.locator('[data-cv-status]')).toHaveText('');
  await expect(page.locator('a.ready-link[data-lang="en"]')).toBeVisible();
  // The preview stays.
  await expect(page.locator('.preview[data-lang="en"] svg.sheet').first()).toBeVisible();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('the preview and the ready-made PDFs are there; no dead button', async ({ page }) => {
    await page.goto('/cv');
    await expect(page.locator('.preview[data-lang="en"] svg.sheet').first()).toBeVisible();
    await expect(page.locator('[data-cv-generate]')).toBeHidden();
    await expect(page.locator('a.ready-link[data-lang="en"]')).toBeVisible();
  });
});

test('the header CV link opens the CV page in each language', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the desktop header');
  await page.goto('/about');
  await page.locator('.site-header .cv-link').click();
  await expect(page).toHaveURL(/\/cv$/);
  await page.goto('/bg/about');
  await page.locator('.site-header .cv-link').click();
  await expect(page).toHaveURL(/\/bg\/cv$/);
});

test('the old CV address still serves the English PDF', async ({ request }) => {
  const res = await request.get('/Nikolay-Georgiev-CV.pdf');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('pdf');
});
