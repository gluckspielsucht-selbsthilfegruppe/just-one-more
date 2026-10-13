import { expect, type Browser, type Page } from '@playwright/test';

export async function openApp(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.getByText('All systems ready to play')).toBeVisible();
}

export async function newPlayer(browser: Browser, path = '/') {
  const context = await browser.newContext();
  const page = await context.newPage();
  await openApp(page, path);
  return page;
}

export async function startPractice(page: Page) {
  await page.getByRole('button', { name: /Play a practice game/ }).click();
  await expect(page.getByRole('heading', { name: /Your hand/ })).toBeVisible();
}

export async function createTable(
  page: Page,
  { nickname, table, isPublic = false }: { nickname: string; table: string; isPublic?: boolean },
) {
  await page
    .getByRole('button', { name: /Create a table/ })
    .first()
    .click();
  const dialog = page.getByRole('dialog', { name: /Make room for good company/ });
  await dialog.getByLabel('Your nickname').fill(nickname);
  await dialog.getByLabel('Table name').fill(table);
  await dialog.getByLabel('Who can find it?').selectOption(isPublic ? 'public' : 'private');
  await dialog.getByRole('button', { name: /Create your table/ }).click();
  await expect(dialog).toBeHidden();
  const code = (
    await page.getByRole('button', { name: 'Copy table code' }).locator('..').textContent()
  )?.match(/[A-Z2-9]{5}/)?.[0];
  expect(code).toBeTruthy();
  return code!;
}

// Resolve every decision for this player by banking (and making simple choices for
// Prediction / Flip Three prompts) until the round result is shown.
export async function bankUntilRoundEnds(page: Page) {
  const result = page.locator('.round-result');
  const bank = page.getByRole('button', { name: /^Bank \d+/ });
  const target = page.locator('.target-options button').first();
  const guess = page.locator('.guess-grid button').first();
  for (let step = 0; step < 50; step++) {
    await expect(result.or(bank).or(target).or(guess).first()).toBeVisible({ timeout: 30_000 });
    if (await result.isVisible()) return;
    if (await target.isVisible()) {
      await target.click();
      await expect(target).toBeHidden();
    } else if (await guess.isVisible()) {
      await guess.click();
      await page.getByRole('button', { name: /Predict .* reveal/ }).click();
      await expect(guess).toBeHidden();
    } else if (await bank.isVisible()) {
      await bank.click();
      await expect(bank).toBeHidden();
    }
  }
  throw new Error('The round did not end.');
}
