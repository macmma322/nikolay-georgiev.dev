import { expect, test } from '@playwright/test';

const BASE = '/workspace/contracts';

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

  // 3: real sign-in with the passkey.
  await page.click('text=Log out');
  await expect(page).toHaveURL(`${BASE}/login`);
  await page.click('#login');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
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

  // 19-20: logout closes everything.
  await page.click('text=Log out');
  await expect(page).toHaveURL(`${BASE}/login`);
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
