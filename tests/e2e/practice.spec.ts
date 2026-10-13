import { expect, test } from '@playwright/test';
import { bankUntilRoundEnds, openApp, startPractice } from './fixtures';

test('practice game: play a full round against three bots', async ({ page }) => {
  await openApp(page);
  await startPractice(page);
  await expect(page).toHaveTitle(/A little practice/);
  for (const bot of ['Cleo', 'Felix', 'Milo'])
    await expect(page.locator('.opponents')).toContainText(bot);

  await bankUntilRoundEnds(page);
  await expect(page.locator('.round-score-list > div')).toHaveCount(4);

  await page.getByRole('button', { name: /Deal round 2|Play again/ }).click();
  await expect(page.locator('.round-result')).toBeHidden();
});

test('reconnect: reloading mid-game keeps the seat and table', async ({ page }) => {
  await openApp(page);
  await startPractice(page);
  const round = await page.getByRole('heading', { level: 1 }).textContent();
  await page.reload();
  await expect(page.getByText('All systems ready to play')).toBeVisible();
  await expect(page).toHaveTitle(/A little practice/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(round!);
  await expect(page.getByRole('heading', { name: /Your hand/ })).toBeVisible();
});

test('full screen focus mode toggles and Escape exits', async ({ page }) => {
  await openApp(page);
  await startPractice(page);
  const toggle = page.getByRole('button', { name: /Full screen|Exit full screen/ });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});
