import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { localize, locales } from './routes';

// The blueprint is published three ways (rendered page, download, copy) from
// one file; all three must carry exactly that file.
const source = readFileSync(new URL('../../blueprint/CLAUDE.md', import.meta.url), 'utf8');

test('the download is the blueprint file, byte for byte', async ({ request }) => {
  const response = await request.get('/open-source/CLAUDE.md');
  expect(response.status()).toBe(200);
  expect(await response.text()).toBe(source);
});

test('the license is the MIT License', async ({ request }) => {
  const response = await request.get('/open-source/LICENSE.txt');
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain('MIT License');
});

for (const locale of locales) {
  test.describe(`open source (${locale})`, () => {
    test('KObait credits keep their attribution but name no modules', async ({ page }) => {
      await page.goto(localize('/open-source', locale));
      const text = await page.locator('main').innerText();
      expect(text).not.toMatch(/GPS|TinyGPS|gyro|гироскоп|жироскоп/i);
      expect(text).toContain('Mikal Hart');
      await expect(page.locator('main a[href*="TinyGPSPlus"]')).toHaveCount(0);
    });

    test('the KObait case study names no sensor modules', async ({ page }) => {
      await page.goto(localize('/work/kobait', locale));
      // The diagram's text and its text alternative, the credits and the copy.
      const text = await page.locator('main').evaluate((el) => el.textContent ?? '');
      expect(text).not.toMatch(/GPS|TinyGPS|gyro|гироскоп|жироскоп/i);
      await expect(page.getByText(locale === 'en' ? 'Sensors' : 'Сензори').first()).toBeAttached();
    });

    test('offers read, download, copy and source', async ({ page }) => {
      await page.goto(localize('/open-source', locale));
      const blueprint = page.locator('#blueprint');
      await expect(
        blueprint.locator(`a[href="${localize('/open-source/blueprint', locale)}"]`),
      ).toBeVisible();
      await expect(blueprint.locator('a[href="/open-source/CLAUDE.md"][download]')).toBeVisible();
      await expect(blueprint.locator('.doc-side > .actions button[data-copy]')).toHaveAttribute(
        'data-copy',
        source,
      );
      await expect(
        blueprint.locator('a[href="https://github.com/macmma322/engineering-blueprint"]'),
      ).toBeVisible();
    });

    test('credits link to their upstream projects', async ({ page }) => {
      await page.goto(localize('/open-source', locale));
      const links = page.locator('#credits .credits a[href^="https://"]');
      expect(await links.count()).toBeGreaterThan(20);
    });

    test('the reader renders the English document as the page heading', async ({ page }) => {
      await page.goto(localize('/open-source/blueprint', locale));
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('article[lang="en"] h1')).toContainText('CLAUDE.md');
    });
  });
}

test('quick start shows the command for the chosen system', async ({ page }) => {
  await page.goto('/open-source');
  const quick = page.locator('fieldset.os');
  const sh = quick.locator('.os-panel[data-os="sh"]');
  const ps = quick.locator('.os-panel[data-os="ps"]');
  await expect(sh).toBeVisible();
  await expect(ps).toBeHidden();
  await quick.getByRole('radio', { name: 'Windows PowerShell' }).check();
  await expect(ps).toBeVisible();
  await expect(sh).toBeHidden();
  // The same commands the public README documents, and neither overwrites a file.
  const readme = readFileSync(new URL('../../blueprint/README.md', import.meta.url), 'utf8');
  for (const panel of [sh, ps]) {
    const command = (await panel.locator('code').textContent()) ?? '';
    expect(readme).toContain(command);
    await expect(panel.locator('button[data-copy]')).toHaveAttribute('data-copy', command);
  }
});

test('the setup guide link follows the page language', async ({ page }) => {
  await page.goto('/bg/open-source');
  await expect(page.locator('a[href$="/SETUP.bg.md"]').first()).toBeVisible();
  await page.goto('/open-source');
  await expect(page.locator('a[href$="/SETUP.md"]').first()).toBeVisible();
});

test('a case study shows its own credits', async ({ page }) => {
  await page.goto('/work/caelora');
  await expect(page.locator('#stack .credits a[href="https://unity.com"]')).toBeVisible();
});
