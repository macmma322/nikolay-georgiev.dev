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
    'info@nikolay-georgiev.dev',
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
    'info@nikolay-georgiev.dev',
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
    const shown = page.locator(`.preview[data-lang="${site}"][data-mode="portfolio"]`);
    await expect(shown).toBeVisible();
    await expect(
      page.locator(`.preview[data-lang="${site === 'en' ? 'bg' : 'en'}"]`).first(),
    ).toBeHidden();
    await expect(page.locator(`.preview[data-lang="${site}"][data-mode="ats"]`)).toBeHidden();
    expect(await shown.locator('svg.sheet').count()).toBeGreaterThanOrEqual(1);
    await expect(shown).toContainText(
      site === 'en' ? 'Junior Backend Developer' : 'Младши бекенд разработчик',
    );
    await expect(page.locator('[data-cv-generate]')).toBeVisible();
    // The ready-made copy of the chosen language is linked.
    await expect(
      page.locator(`a.ready-link[data-lang="${site}"][data-mode="portfolio"]`),
    ).toHaveAttribute('href', `/${files[site]}`);
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
    expect(pdf.count).toBe(
      await page
        .locator(`.preview[data-lang="${locale}"][data-mode="portfolio"] svg.sheet`)
        .count(),
    );
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
        'mailto:info@nikolay-georgiev.dev',
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
  await expect(page.locator('a.ready-link[data-lang="en"][data-mode="portfolio"]')).toBeVisible();
  // The preview stays.
  await expect(
    page.locator('.preview[data-lang="en"][data-mode="portfolio"] svg.sheet').first(),
  ).toBeVisible();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('the preview and the ready-made PDFs are there; no dead button', async ({ page }) => {
    await page.goto('/cv');
    await expect(
      page.locator('.preview[data-lang="en"][data-mode="portfolio"] svg.sheet').first(),
    ).toBeVisible();
    await expect(page.locator('[data-cv-generate]')).toBeHidden();
    await expect(page.locator('a.ready-link[data-lang="en"][data-mode="portfolio"]')).toBeVisible();
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

// ---------- the application (ATS) version ----------

test('the application version is one column of text in the conventional order', async ({
  request,
}) => {
  for (const [locale, heads] of [
    [
      'en',
      [
        'Professional Summary',
        'Technical Skills',
        'Professional Experience',
        'Projects',
        'Education',
        'Certifications',
        'Languages',
      ],
    ],
    [
      'bg',
      [
        'Професионален профил',
        'Технически умения',
        'Професионален опит',
        'Проекти',
        'Образование',
        'Сертификати',
        'Езици',
      ],
    ],
  ] as const) {
    const res = await request.get(`/Nikolay-Georgiev-CV-${locale.toUpperCase()}-ATS.pdf`);
    expect(res.status()).toBe(200);
    const bytes = new Uint8Array(await res.body());
    const pdf = await inspect(bytes);
    // Sections come out of text extraction in reading order.
    const at = heads.map((h) => pdf.text.indexOf(h));
    expect(
      at.every((i) => i >= 0),
      `${locale}: ${at.join(',')}`,
    ).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    // Employers and dates as words, contact details as text and links.
    expect(pdf.text).toContain('DXC Technology');
    expect(pdf.text).toContain('Genpact');
    expect(pdf.text).toContain('info@nikolay-georgiev.dev');
    expect(pdf.text).toContain('github.com/macmma322');
    expect(pdf.links).toContain('https://github.com/macmma322');
    // No photo: the document holds no image at all.
    const doc = await PDFDocument.load(bytes);
    const images = [...doc.context.enumerateIndirectObjects()].filter(
      ([, o]) =>
        o instanceof PDFStream && o.dict.get(PDFName.of('Subtype'))?.toString() === '/Image',
    );
    expect(images).toHaveLength(0);
  }
});

test('the independent role is not presented as employment', async ({ request }) => {
  const pdf = await inspect(
    new Uint8Array(await (await request.get('/Nikolay-Georgiev-CV-EN-ATS.pdf')).body()),
  );
  expect(pdf.text).toContain('Self-employed');
  expect(pdf.text).not.toMatch(/Zone 32-19 and client work · Varna/);
});

// ---------- Tailor CV to a job ----------

const ad = `Frontend Developer. React and TypeScript are our core. You will build our customer portal with React and
Next.js in TypeScript, consume REST APIs and care about accessibility (WCAG). Nice to have:
GraphQL, Kubernetes, MySQL and .NET Core. Fluent English.`;

test('a job description is matched with evidence, and gaps are named', async ({ page }) => {
  await page.goto('/cv');
  await page.locator('#cv-job').fill(ad);
  await page.getByRole('button', { name: 'Analyse' }).click();
  const results = page.locator('[data-cv-results]');
  const group = (status: string) => results.locator(`h3[data-status="${status}"] + ul`);
  await expect(group('verified')).toContainText('React');
  await expect(group('verified')).toContainText('Next.js');
  await expect(group('verified')).toContainText('REST APIs');
  await expect(group('verified')).toContainText('Accessibility');
  await expect(group('verified')).toContainText('USS X Academy');
  await expect(group('related')).toContainText('MySQL');
  // C# in a Unity game is not .NET server work.
  await expect(group('related')).toContainText('.NET');
  await expect(group('missing')).toContainText('GraphQL');
  await expect(group('missing')).toContainText('Kubernetes');
  await expect(results).toContainText('Frontend / React Developer');
  // No invented score.
  await expect(results).not.toContainText('%');
  // The tailored CV is drawn in the browser.
  await expect(page.locator('[data-cv]')).toHaveAttribute('data-custom', '');
  await expect(page.locator('[data-cv-live] svg.sheet').first()).toBeVisible();
});

test('ordinary words are not mistaken for technologies', async ({ page }) => {
  await page.goto('/cv');
  await page
    .locator('#cv-job')
    .fill(
      'We react quickly to change. Express your ideas freely. Go beyond the brief. Each graph node matters. Resend the form if needed. Job security, end-to-end ownership and being responsive to feedback matter. Report to our Solutions Architect on Go-to-market plans.',
    );
  await page.getByRole('button', { name: 'Analyse' }).click();
  await expect(page.locator('[data-cv-results]')).toContainText('No technologies or practices');
  await expect(page.locator('[data-cv]')).not.toHaveAttribute('data-custom', '');
});

test('a role-aimed CV downloads as its own PDF and states only verified skills', async ({
  page,
}) => {
  test.slow();
  await page.goto('/cv');
  await page.locator('#cv-target').selectOption('backend');
  await page.locator('label:has(input[name="cv-mode"][value="ats"])').click();
  await expect(page.locator('[data-cv-live]')).toContainText('Backend: Node.js');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Generate CV' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('Nikolay-Georgiev-CV-EN-Backend-ATS.pdf');
  const pdf = await inspect(new Uint8Array(await readFile((await file.path())!)));
  expect(pdf.text).toContain('Backend: Node.js, TypeScript, REST APIs, PostgreSQL and Redis');
  // Planned or undemonstrated technologies never enter the CV.
  for (const absent of ['Spring Boot', 'Kubernetes', 'GraphQL', 'MongoDB'])
    expect(pdf.text).not.toContain(absent);
  // The backend projects lead.
  expect(pdf.text.indexOf('Zone 32-19 ')).toBeLessThan(pdf.text.indexOf('Caelora'));
});

// ---------- recruiter search ----------

test('the home page names the role, stack and place for search', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Software Engineer, React and Node\.js/);
  await expect(page.locator('.hero-focus')).toContainText('React, Next.js, TypeScript, Node.js');
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  const person = ld['@graph'].find((n: { '@type': string }) => n['@type'] === 'Person');
  expect(person.knowsAbout).toEqual(expect.arrayContaining(['React', 'Next.js', 'Node.js']));
  expect(person.hasOccupation.occupationLocation.name).toBe('Varna');
  expect(person.address.addressCountry).toBe('BG');
  expect(JSON.stringify(ld)).not.toMatch(/JobPosting|salary|€/);
});
