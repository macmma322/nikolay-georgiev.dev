import { expect, test, type Locator } from '@playwright/test';
import { canonical, locales, localize } from './routes';

test.describe('search and recruiter paths without JavaScript', () => {
  test.use({ javaScriptEnabled: false, contextOptions: { reducedMotion: 'reduce' } });

  for (const locale of locales) {
    test(`${locale} can reach work, technical evidence and contact`, async ({ page }) => {
      const path = (route: string) => localize(route, locale);
      const main = page.locator('main');
      const heading = main.getByRole('heading', { level: 1 });
      const link = (route: string) => main.locator(`a[href="${path(route)}"]`);
      // Follow the href the static document exposes, as a crawler would.
      const follow = async (anchor: Locator) => {
        await expect(anchor).toBeVisible();
        const href = await anchor.getAttribute('href');
        if (!href) throw new Error('Missing href on the recruiter path');
        const response = await page.goto(href);
        expect(response?.status()).toBe(200);
      };

      await page.goto(path('/'));
      await expect(heading).toHaveText('Nikolay Georgiev');
      await expect(page).toHaveTitle(
        locale === 'en'
          ? 'Nikolay Georgiev · Software Engineer in Varna, Bulgaria'
          : 'Николай Георгиев · Софтуерен инженер във Варна, България',
      );
      await expect(main.locator('.hero-focus')).toContainText('TypeScript, Node.js');
      await follow(link('/work'));

      await expect(page).toHaveURL(path('/work'));
      await follow(link('/work/uss-x-academy'));
      await expect(heading).toHaveText('USS X Academy');
      await expect(main.locator('.case-summary')).toBeVisible();
      await expect(main.locator('#overview')).toContainText('PostgreSQL');
      await expect(main.locator('#status')).toBeVisible();
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        canonical(path('/work/uss-x-academy')),
      );

      await follow(main.locator(`#overview a[href="${path('/work/stemini')}"]`));
      await expect(heading).toHaveText('Stemini');
      await expect(main.locator('#overview a')).toHaveAttribute(
        'href',
        path('/work/uss-x-academy'),
      );
      await follow(main.locator(`#stack a[href="${path('/about')}#capabilities"]`));

      await expect(page).toHaveURL(`${path('/about')}#capabilities`);
      await expect(main.locator('#capabilities')).toBeVisible();
      await expect(
        main.locator(`#capabilities a[href="${path('/work/uss-x-academy')}"]`),
      ).not.toHaveCount(0);
      await follow(link('/contact'));
      await expect(page).toHaveURL(path('/contact'));
      await expect(heading).toHaveText(locale === 'en' ? 'Contact' : 'Контакт');
      await expect(main.locator('.finale-support')).toContainText(
        locale === 'en' ? 'remote work from Bulgaria' : 'дистанционна работа от България',
      );
      await expect(main.locator('a[href^="mailto:"]').first()).toBeVisible();
    });
  }
});
