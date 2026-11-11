import { expect, test } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import pg from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = '/workspace/contracts';
const axePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../node_modules/axe-core/axe.min.js',
);
const axeSrc = fs.existsSync(axePath) ? fs.readFileSync(axePath, 'utf8') : null;

async function auditA11y(page, name) {
  if (!axeSrc) return;
  await page.evaluate(axeSrc);
  const results = await page.evaluate(async () => {
    return await window.axe.run(document, {
      resultTypes: ['violations'],
    });
  });
  const serious = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  if (serious.length > 0) {
    console.error(`A11Y violations on ${name}:`, serious);
  }
  expect(serious).toEqual([]);
}

async function virtualAuthenticator(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}

const shot = (page, name) =>
  process.env.SHOT_DIR
    ? page.screenshot({ path: `${process.env.SHOT_DIR}/${name}.png` })
    : undefined;

const send = async (page, text) => {
  await page.fill('#message', text);
  await page.click('#send');
};

const fill = async (page, fields) => {
  for (const [name, value] of Object.entries(fields))
    await page.fill(`#edit-form [name="${name}"]`, String(value));
};

// The real production portfolio, answered locally: the test checks where the
// browser goes, without depending on the live site.
const HOME = 'https://nikolay-georgiev.dev/';
test.beforeEach(async ({ context }) => {
  await context.route('https://nikolay-georgiev.dev/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Portfolio</title><h1>Nikolay Georgiev</h1>',
    }),
  );
});

// Log out from the header and arrive on the public portfolio, never on sign-in.
async function logOut(page) {
  await page.locator('.header-actions').getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(HOME);
  await expect(page.getByRole('heading', { name: 'Nikolay Georgiev' })).toBeVisible();
}

// Later tests have no passkey: they get a session the way sign-in makes one.
const sql = async (text, values = []) => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return (await client.query(text, values)).rows;
  } finally {
    await client.end();
  }
};
async function signIn(context) {
  const token = randomBytes(32).toString('base64url');
  await sql(
    "insert into sessions (token_hash, expires_at) values (sha256($1::bytea), now() + interval '2 hours')",
    [Buffer.from(token)],
  );
  await context.addCookies([
    {
      name: 'studio',
      value: token,
      url: 'http://localhost:18787',
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
  return token;
}
const expire = (token) =>
  sql(
    "update sessions set last_seen_at = now() - interval '2 hours' where token_hash = sha256($1::bytea)",
    [Buffer.from(token)],
  );
const overflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test('the whole contract journey', async ({ page, context }) => {
  const violations = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /Content Security Policy/.test(message.text()))
      violations.push(message.text());
  });
  page.on('pageerror', (error) => violations.push(error.message));
  await virtualAuthenticator(page);

  // 1-2: refused without a session.
  await page.goto(BASE);
  await expect(page).toHaveURL(`${BASE}/login`);
  await expect(page.getByRole('button', { name: 'Sign in with passkey' })).toBeVisible();
  await auditA11y(page, 'login');
  const anonymous = await page.request.get(`${BASE}/clients`, { maxRedirects: 0 });
  expect(anonymous.status()).toBe(303);

  // First passkey through the one-time token; a wrong token gets nowhere.
  await page.goto(`${BASE}/setup`);
  await page.fill('[name=token]', 'wrong');
  await page.click('form#setup button');
  await expect(page.locator('#auth-message')).toBeVisible();
  await page.fill('[name=token]', 'e2e-setup-token');
  await page.click('form#setup button');
  await expect(page).toHaveURL(`${BASE}/settings`);

  await page.fill('[name=legal_name]', 'Тест Тестов');
  await page.fill('form.form [name=address]', 'гр. Варна, ул. Тестова 1');
  await page.click('text=Save settings');
  await expect(page.getByText('Settings saved')).toBeVisible();

  // 3: Log out lands on the public portfolio, then a real sign-in with the passkey.
  await logOut(page);
  await page.goto(`${BASE}/login`);
  await page.click('#login');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await auditA11y(page, 'dashboard');
  const cookies = await context.cookies();
  const session = cookies.find((cookie) => cookie.name === 'studio');
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe('Strict');

  // 4: a fictional client.
  await page.goto(`${BASE}/clients/new`);
  await page.fill('[name=name]', 'Учебен Център Пример ЕООД');
  await page.fill('[name=contact_person]', 'Мария Примерова');
  await page.fill('[name=address]', 'гр. София, бул. Примерен 10');
  await page.fill('[name=eik]', '123456789');
  await page.click('text=Save client');
  await expect(page.getByRole('heading', { name: 'Учебен Център Пример ЕООД' })).toBeVisible();

  // 5: a software project.
  await page.click('text=Add a project');
  await page.fill('[name=title]', 'Платформа за онлайн курсове');
  await page.fill('[name=price]', '2500');
  await page.click('text=Save project');
  await expect(page.getByRole('heading', { name: 'Платформа за онлайн курсове' })).toBeVisible();

  // 6: a contract in Bulgarian.
  await page.click('text=Start a contract');
  await page.click('text=Create draft');
  await expect(page.locator('#preview h1')).toContainText('ДОГОВОР ЗА ИЗРАБОТКА НА СОФТУЕР');
  await expect(page.locator('#preview')).toContainText('Учебен Център Пример ЕООД');
  await expect(page.locator('[data-testid=missing]')).toBeVisible();
  const contractUrl = page.url().split('?')[0];
  await auditA11y(page, 'contract');

  // 7-9: Claude asks, the proposal is reviewed and applied.
  await send(
    page,
    'I am developing a course platform for a Bulgarian company for €2,500. They pay in milestones. I want additional features to be priced separately.',
  );
  await expect(page.locator('[data-testid=proposal]')).toBeVisible();
  await expect(page.locator('.msg.assistant .md').last()).toContainText('Кои са етапите');
  await expect(page.locator('[data-testid=proposal]')).toContainText('Payment milestones');
  await page.click('text=Apply as new draft version');
  await expect(page.getByText('Applied as draft v2')).toBeVisible();
  await expect(page.locator('#preview')).toContainText('2500,00 EUR');

  await send(page, 'The milestones are 1000 EUR on signing and 1500 EUR on acceptance');
  await expect(page.locator('[data-testid=proposal]')).toBeVisible();
  await page.click('text=Apply as new draft version');
  await expect(page.getByText('Applied as draft v3')).toBeVisible();
  await expect(page.locator('#preview')).toContainText('Аванс');

  // 10-11: a milestone changes and the preview follows without saving.
  await page.fill(
    '#edit-form [name=payment_schedule]',
    'Аванс | 1100 | при подписване\nФинално плащане | 1400 | при приемане',
  );
  await expect(page.locator('#preview')).toContainText('1100,00 EUR');

  // 12: saved as a version.
  await fill(page, {
    contract_date: '2026-12-01',
    place: 'Варна',
    project_description: 'Уеб платформа за онлайн обучение',
    scope_summary: 'Платформа за онлайн обучение',
    start_date: '2026-12-01',
    price_basis: 'бруто',
    payment_days: 10,
    acceptance_days: 7,
    revision_rounds: 2,
    warranty_days: 30,
    notice_days: 14,
    exclusions: 'Мобилно приложение',
    acceptance_criteria: 'Платформата работи',
    additional_work_rate: '40 EUR на час',
    liability_cap: 'договореното възнаграждение',
    dispute_forum: 'компетентния български съд',
    ip_terms: 'прехвърляне след пълно плащане',
    support_terms: 'Не е включена',
    hosting_terms: 'За сметка на Възложителя',
  });
  await page.click('#save-version');
  await expect(page.getByText('Saved as v4')).toBeVisible();
  await expect(page.locator('[data-testid=missing]')).toHaveCount(0);

  // 13-14: exports.
  for (const [label, extension] of [
    ['Download PDF', 'pdf'],
    ['Download DOCX', 'docx'],
  ]) {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click(`text=${label}`),
    ]);
    expect(download.suggestedFilename()).toMatch(
      new RegExp(`^software-development-CS-\\d{4}-\\d{4}-v4-draft\\.${extension}$`),
    );
    if (process.env.SHOT_DIR) await download.saveAs(`${process.env.SHOT_DIR}/sample.${extension}`);
  }

  // 15: history.
  await page.click('#history summary');
  await expect(page.locator('#history tbody tr')).toHaveCount(4);

  // Approve so the original is a frozen, agreed contract.
  await page.getByRole('button', { name: 'ready for review' }).click();
  await page.getByRole('button', { name: 'Approve v4' }).click();
  await expect(page.getByText('Version approved and frozen')).toBeVisible();
  const approvedText = await page.locator('#preview').innerText();

  // 16-17: scope change becomes an additional agreement.
  await send(
    page,
    'The client wants to add another AI feature that was not included in the original technical specification.',
  );
  await expect(page.locator('[data-testid=change-request]')).toContainText('Additional AI feature');
  await expect(page.locator('[data-testid=change-request]')).toContainText('excluded');
  await page.fill('[data-testid=change-request] [name=price]', '800');
  await page.click('text=Prepare additional agreement');
  await expect(page.getByText('The original contract was not changed')).toBeVisible();
  await expect(page.locator('#preview')).toContainText('800,00 EUR');
  await expect(page.locator('#preview')).toContainText('AI асистент за курсовете');

  // 18: the original stands.
  await page.goto(contractUrl);
  expect(await page.locator('#preview').innerText()).toBe(approvedText);
  await shot(page, 'workspace-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(0);
  await shot(page, 'workspace-phone');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE);
  await shot(page, 'dashboard');
  await page.goto(contractUrl);
  await page.click('#history summary');
  await expect(page.locator('#history tbody tr')).toHaveCount(4);
  await expect(page.locator('#history tbody tr').first()).toContainText('approved');

  // Stop-generation leaves a partial answer in the UI.
  await page.goto(`${BASE}/assistant`);
  await page.click('text=New conversation');
  await send(page, 'a slow reply please');
  await expect(page.locator('#stop')).toBeVisible();
  await expect(page.locator('.msg.assistant .md').last()).toContainText('дума1');
  await page.click('#stop');
  await expect(page.locator('.msg.assistant .md').last()).toContainText('Stopped');

  // Styles and scripts load under the strict CSP.
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe(
    'rgba(0, 0, 0, 0)',
  );
  expect(violations).toEqual([]);

  // 19-20: logout closes everything, and Back shows nothing private.
  await page.goto(contractUrl);
  await expect(page.locator('#preview')).toContainText('ДОГОВОР');
  await logOut(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('body')).not.toContainText('Учебен Център');
  await expect(page.locator('#preview')).toHaveCount(0);
  await page.goto(contractUrl);
  await expect(page).toHaveURL(`${BASE}/login`);
  const download = await page.request.get(`${contractUrl}/export/4/pdf`);
  expect(download.status()).toBe(401);
  await context.clearCookies();
});

test('phone layout stacks the chat and the document', async ({ page, context }) => {
  await virtualAuthenticator(page);
  await context.clearCookies();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/login`);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('Back to Portfolio navigates home and keeps the session', async ({ page, context }) => {
  await signIn(context);
  await page.goto(`${BASE}/clients`);
  await page.locator('.header-actions').getByRole('link', { name: 'Back to Portfolio' }).click();
  await expect(page).toHaveURL(HOME);
  await page.goto(BASE);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});

test('an expired session protects the page and asks to sign in again', async ({
  page,
  context,
}) => {
  // A plain form post after the session idled out.
  let token = await signIn(context);
  await page.goto(`${BASE}/clients/new`);
  await page.fill('[name=name]', 'Expiry Test ЕООД');
  await expire(token);
  await page.click('text=Save client');
  await expect(page).toHaveURL(`${BASE}/login?expired=1`);
  await expect(page.getByText('Your session has ended')).toBeVisible();
  expect(await sql("select 1 from clients where name = 'Expiry Test ЕООД'")).toHaveLength(0);

  // A background request (the live preview) after the session idled out.
  token = await signIn(context);
  const [contract] = await sql('select id from contracts order by created_at limit 1');
  await page.goto(`${BASE}/documents/${contract.id}`);
  await expect(page.locator('#preview')).toBeVisible();
  await expire(token);
  await page.fill('#edit-form [name=place]', 'София');
  await expect(page).toHaveURL(`${BASE}/login?expired=1`);
  await expect(page.locator('#preview')).toHaveCount(0);
});

test('the rendered page wears the portfolio tokens and faces', async ({ page, context }) => {
  await signIn(context);
  const [contract] = await sql('select id from contracts order by created_at limit 1');
  await page.goto(`${BASE}/documents/${contract.id}`);
  await page.evaluate(() => document.fonts.ready);
  const styles = await page.evaluate(() => {
    const probe = document.createElement('i');
    document.body.append(probe);
    const token = (name, prop = 'color') => {
      probe.style[prop] = `var(${name})`;
      return getComputedStyle(probe)[prop];
    };
    const css = (selector, prop) => getComputedStyle(document.querySelector(selector))[prop];
    return {
      bg: css('body', 'backgroundColor'),
      ink0: token('--ink-0'),
      fg: css('body', 'color'),
      fgToken: token('--fg'),
      body: css('body', 'fontFamily'),
      heading: css('main h1', 'fontFamily'),
      label: css('.eyebrow', 'fontFamily'),
      header: css('.site-header', 'height'),
      paper: css('.paper', 'backgroundColor'),
      paperInk: css('.paper', 'color'),
      scheme: css('html', 'colorScheme'),
      mona: document.fonts.check('16px "Mona Sans"'),
      hubot: document.fonts.check('16px "Hubot Sans"'),
      martian: document.fonts.check('12px "Martian Mono"'),
    };
  });
  expect(styles.bg).toBe(styles.ink0);
  expect(styles.fg).toBe(styles.fgToken);
  expect(styles.body).toMatch(/^"?TikTok Sans"?, "?Mona Sans"?/);
  expect(styles.heading).toMatch(/"?Hubot Sans"?/);
  expect(styles.label).toMatch(/"?Martian Mono"?/);
  expect(styles.header).toBe('68px');
  expect(styles.paper).toBe('rgb(251, 250, 247)');
  expect(styles.paperInk).toBe('rgb(23, 24, 28)');
  expect(styles.scheme).toBe('dark');
  expect(styles.mona && styles.hubot && styles.martian).toBe(true);
});

test('desktop, tablet and phone layouts hold together', async ({ page, context }) => {
  await signIn(context);
  const [contract] = await sql('select id from contracts order by created_at limit 1');
  const pages = [
    '',
    '/clients',
    '/projects',
    '/documents',
    `/documents/${contract.id}`,
    '/assistant',
    '/templates',
    '/settings',
  ];
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
    [768, 1024],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    for (const path of pages) {
      await page.goto(`${BASE}${path}`);
      expect(await overflow(page), `${width}px ${path}`).toBeLessThanOrEqual(0);
      await expect(page.locator('.nav-desktop')).toBeVisible({ visible: width >= 1240 });
      await expect(page.locator('.menu-button')).toBeVisible({ visible: width < 1240 });
    }
    await page.goto(`${BASE}/documents/${contract.id}`);
    await shot(page, `contract-${width}`);
    await page.goto(BASE);
    await shot(page, `dashboard-${width}`);
    for (const name of ['clients', 'settings']) {
      await page.goto(`${BASE}/${name}`);
      await shot(page, `${name}-${width}`);
    }
  }

  // Phone: everything lives in the menu, which traps focus and closes on Escape.
  await page.goto(`${BASE}/clients`);
  await page.getByRole('button', { name: 'Menu' }).click();
  const menu = page.getByRole('dialog', { name: 'Workspace menu' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Dashboard' })).toBeFocused();
  await expect(menu.getByRole('link', { name: 'Back to Portfolio' })).toBeVisible();
  await expect(menu.getByRole('button', { name: 'Log out' })).toBeVisible();
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  await auditA11y(page, 'phone menu');
  await shot(page, 'menu-390');
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await page.getByRole('button', { name: 'Menu' }).click();
  await menu.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(HOME);
});

test('keyboard focus is visible and reduced motion removes movement', async ({ page, context }) => {
  await signIn(context);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${BASE}/clients`);
  await auditA11y(page, 'clients');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  expect(await skip.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  expect(outline).toBe('solid');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Menu' }).click();
  const animation = await page
    .locator('.mobile-list li')
    .first()
    .evaluate((el) => getComputedStyle(el).animationDuration);
  expect(parseFloat(animation)).toBeLessThan(0.001);
});

test('the sign-in page matches the site and links home', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto(`${BASE}/login`);
  await expect(page.getByRole('link', { name: 'Back to Portfolio' })).toHaveAttribute('href', HOME);
  const box = await page.locator('main').boundingBox();
  const width = page.viewportSize().width;
  expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThan(2);
  await auditA11y(page, 'login');
  await shot(page, 'login-1440');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  await shot(page, 'login-390');
});
