import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';

// The enquiry form on /contact. The mail agent's /contact endpoint is mocked:
// no test ever sends an email. Each test records what the form posted.

type Posted = Record<string, unknown>;

async function open(page: Page, path = '/contact', reply?: (route: Route, n: number) => unknown) {
  const posted: Posted[] = [];
  await page.goto(path);
  const endpoint = await page.locator('#enquiry-form').getAttribute('data-endpoint');
  expect(endpoint).toMatch(/^https:\/\//);
  await page.route(endpoint!, async (route) => {
    posted.push(JSON.parse(route.request().postData() ?? '{}'));
    if (reply) return reply(route, posted.length);
    return route.fulfill({ status: 200, json: { ok: true, reference: 'NG-TEST42' } });
  });
  return posted;
}

const choose = (page: Page, type: string) =>
  page.locator(`input[name="category"][value="${type}"]`).check();

async function fillPerson(page: Page) {
  await page.locator('#enq-name').fill('Ana Petrova');
  await page.locator('#enq-email').fill('ana@studio.bg');
}

async function fillProject(page: Page, meeting: string) {
  await page
    .locator('#enq-objective')
    .fill('An online booking site for our three hair salons in Varna.');
  await page.locator('input[name="help"][value="build"]').check();
  await page.locator('input[name="stage"][value="requirements"]').check();
  await page.locator('#enq-meeting').fill(meeting);
  await fillPerson(page);
}

const QUALIFIED = 'Agree the pages, the booking integration and a realistic first release.';

test('E01 a general question is sent without any booking step', async ({ page }) => {
  const posted = await open(page);
  await choose(page, 'general');
  await page.locator('#enq-message').fill('Is the Caelora code open source?');
  await fillPerson(page);
  await expect(page.locator('[data-book]')).toBeHidden();
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('heading', { name: 'Message sent' })).toBeFocused();
  await expect(page.getByText('Your reference is NG-TEST42.')).toBeVisible();
  await expect(page.locator('[data-result="booking"]')).toBeHidden();
  expect(posted).toHaveLength(1);
  expect(posted[0]).toMatchObject({ category: 'general', name: 'Ana Petrova' });
  expect(posted[0]).not.toHaveProperty('objective', expect.stringMatching(/.+/));
});

test('E02/E07/E10 a qualified project reaches the booking step, truthfully', async ({ page }) => {
  const posted = await open(page);
  await choose(page, 'project');
  await fillProject(page, QUALIFIED);
  await expect(page.getByText('Ready to discuss the details?')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send enquiry instead' })).toBeVisible();
  await page.getByRole('button', { name: 'Send brief and schedule a consultation' }).click();

  await expect(page.getByRole('heading', { name: 'Your project brief is sent' })).toBeFocused();
  const link = page.getByRole('link', { name: /Continue to Google Calendar/ });
  await expect(link).toHaveAttribute('href', 'https://calendar.app.google/go5PwUs8EBNbsSWQ7');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  // Nothing third-party loads until the visitor asks for it.
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show available times here' }).click();
  await expect(page.locator('iframe.booking-frame')).toHaveAttribute(
    'src',
    /^https:\/\/calendar\.google\.com\/calendar\/appointments\/schedules\/.+\?gv=true$/,
  );
  // Opening Google's page is never reported as a booking.
  const panel = await page.locator('[data-result="booking"]').innerText();
  expect(panel).toContain('booked only when Google Calendar confirms it');
  expect(panel.replace('booked only when Google Calendar confirms it', '')).not.toMatch(
    /confirmed|is booked|you're booked/i,
  );
  expect(posted[0]).toMatchObject({
    category: 'project',
    intent: 'consultation',
    stage: 'requirements',
  });
});

test('E03 an unclear project gets guidance and can still be sent', async ({ page }) => {
  const posted = await open(page);
  await choose(page, 'project');
  await fillProject(page, "Let's talk");
  await expect(page.getByText('A few details would make a call worthwhile')).toBeVisible();
  await expect(page.getByText('What the consultation should achieve')).toBeVisible();
  await expect(page.locator('[data-book]')).toBeHidden();
  await page.getByRole('button', { name: 'Send project enquiry' }).click();
  await expect(page.getByRole('heading', { name: 'Message sent' })).toBeVisible();
  expect(posted[0]).toMatchObject({ category: 'project', intent: 'message' });
});

test('E04 a recruiter sends an opportunity without being offered a call', async ({ page }) => {
  const posted = await open(page);
  await choose(page, 'opportunity');
  await expect(page.locator('#enq-company')).toBeVisible();
  await expect(page.locator('#enq-objective')).toBeHidden();
  await page.locator('#enq-company').fill('Acme');
  await page.locator('#enq-role').fill('Backend engineer');
  await page.locator('#enq-opportunity').fill('A Node.js and PostgreSQL role, hybrid in Sofia.');
  await page.locator('#enq-url').fill('https://acme.example/jobs/1');
  await page.locator('input[name="followUp"][value="email"]').check();
  await fillPerson(page);
  await expect(page.locator('[data-book]')).toBeHidden();
  await page.getByRole('button', { name: 'Send opportunity' }).click();
  await expect(page.getByRole('heading', { name: 'Message sent' })).toBeVisible();
  expect(posted[0]).toMatchObject({ category: 'opportunity', company: 'Acme', followUp: 'email' });
});

test('E05 the whole project flow works in Bulgarian', async ({ page }) => {
  const posted = await open(page, '/bg/contact');
  await choose(page, 'project');
  await page.locator('#enq-objective').fill('Онлайн магазин за ръчно изработени бижута.');
  await page.locator('input[name="help"][value="build"]').check();
  await page.locator('input[name="stage"][value="ready"]').check();
  await page.locator('#enq-meeting').fill('Да изберем платформата и да планираме първата версия.');
  await page.locator('#enq-name').fill('Иван Петров');
  await page.locator('#enq-email').fill('ivan@example.bg');
  await page.getByRole('button', { name: 'Изпратете описанието и запазете консултация' }).click();
  await expect(
    page.getByRole('heading', { name: 'Описанието на проекта е изпратено' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /Продължете към Google Calendar/ })).toBeVisible();
  expect(posted[0]).toMatchObject({ locale: 'bg', intent: 'consultation' });
});

test('E06 the form fits a phone and switching type keeps what was typed', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await open(page);
  await choose(page, 'general');
  await page.locator('#enq-message').fill('Kept while I look at other types.');
  await choose(page, 'project');
  await choose(page, 'general');
  await expect(page.locator('#enq-message')).toHaveValue('Kept while I look at other types.');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});

test('E08 a failed send keeps the text and retries with the same key', async ({ page }) => {
  const posted = await open(page, '/contact', (route, n) =>
    n === 1
      ? route.fulfill({ status: 502, json: { ok: false, error: 'send' } })
      : route.fulfill({ status: 200, json: { ok: true, reference: 'NG-RETRY1' } }),
  );
  await choose(page, 'general');
  await page.locator('#enq-message').fill('Is the Caelora code open source?');
  await fillPerson(page);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('alert')).toContainText('Everything you wrote is still here');
  await expect(page.locator('#enq-message')).toHaveValue('Is the Caelora code open source?');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('Your reference is NG-RETRY1.')).toBeVisible();
  expect(posted).toHaveLength(2);
  expect(posted[1]!['idempotencyKey']).toBe(posted[0]!['idempotencyKey']);
});

test('E09 invalid input is explained per field, and a rate limit is said plainly', async ({
  page,
}) => {
  const posted = await open(page, '/contact', (route) =>
    route.fulfill({ status: 429, json: { ok: false, error: 'rate' } }),
  );
  await choose(page, 'general');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.locator('#enq-message')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#enq-email-error')).toHaveText('This field is required.');
  await expect(page.locator('#enq-message')).toBeFocused();
  expect(posted).toHaveLength(0); // nothing leaves the page until it is valid
  await page.locator('#enq-message').fill('Is the Caelora code open source?');
  await page.locator('#enq-name').fill('Ana Petrova');
  await page.locator('#enq-email').fill('not-an-address');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.locator('#enq-email-error')).toContainText('complete email address');
  await page.locator('#enq-email').fill('ana@studio.bg');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('alert')).toContainText('Too many messages');
});

test('E11 the expanded form passes axe and works from the keyboard', async ({ page }) => {
  await open(page);
  // Keyboard only: reach the type options, pick "Discuss a project" with the arrows.
  await page.locator('input[name="category"][value="general"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('input[name="category"][value="project"]')).toBeChecked();
  await expect(page.locator('#enq-objective')).toBeVisible();
  await page.getByRole('button', { name: 'Send project enquiry' }).click();
  await expect(page.locator('#enq-objective')).toBeFocused();
  const results = await new AxeBuilder({ page })
    .include('.enquiry')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
});
