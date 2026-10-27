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
    test('offers read, download, copy and source', async ({ page }) => {
      await page.goto(localize('/open-source', locale));
      const blueprint = page.locator('#blueprint');
      await expect(
        blueprint.locator(`a[href="${localize('/open-source/blueprint', locale)}"]`),
      ).toBeVisible();
      await expect(blueprint.locator('a[href="/open-source/CLAUDE.md"][download]')).toBeVisible();
      await expect(blueprint.locator('button[data-copy]')).toHaveAttribute('data-copy', source);
      await expect(blueprint.locator('a[href^="https://github.com/macmma322/"]')).toBeVisible();
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

test('a case study shows its own credits', async ({ page }) => {
  await page.goto('/work/caelora');
  await expect(page.locator('#stack .credits a[href="https://unity.com"]')).toBeVisible();
});
