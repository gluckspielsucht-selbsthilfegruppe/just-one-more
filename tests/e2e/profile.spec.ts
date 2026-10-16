import { expect, test } from '@playwright/test';
import { newPlayer, openApp } from './fixtures';

test('register an account, then sign in from a fresh browser', async ({ browser }, testInfo) => {
  const username = `e2e-${testInfo.project.name.slice(0, 6)}-${Date.now().toString(36)}`;
  const password = 'correct horse battery';

  const first = await newPlayer(browser);
  await first.locator('.profile-button').click();
  await first.getByRole('button', { name: /Create an account/ }).click();
  await first.getByLabel('Username').fill(username);
  await first.getByLabel('Password').fill(password);
  await first.getByRole('button', { name: /^Create account/ }).click();
  await expect(first.getByText('Your account is ready. Deal yourself in.')).toBeVisible();

  const second = await newPlayer(browser);
  await second.locator('.profile-button').click();
  await second.getByRole('button', { name: /Already a regular\? Sign in/ }).click();
  await second.getByLabel('Username').fill(username);
  await second.getByLabel('Password').fill(password);
  await second.getByRole('button', { name: /^Sign in/ }).click();
  await expect(second.getByText('Welcome back to the table.')).toBeVisible();
  await second.locator('.profile-button').click();
  await expect(second.getByText(/Account player/)).toBeVisible();

  await first.context().close();
  await second.context().close();
});

test('a wrong password is rejected with a clear message', async ({ page }, testInfo) => {
  // The server allows 10 auth attempts per minute and IP; one browser is enough here.
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(testInfo.project.name !== 'chromium');
  await openApp(page);
  await page.locator('.profile-button').click();
  await page.getByRole('button', { name: /Already a regular\? Sign in/ }).click();
  await page.getByLabel('Username').fill('nobody-here');
  await page.getByLabel('Password').fill('not the password');
  await page.getByRole('button', { name: /^Sign in/ }).click();
  await expect(page.getByRole('alert')).toContainText('do not match');
});

test('the chosen app theme is saved and survives a reload', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Choose app theme' }).click();
  await page.getByRole('button', { name: /Velvet Club/ }).click();
  await expect(page.locator('.app')).toHaveClass(/appearance-velvet/);
  await page.reload();
  await expect(page.getByText('All systems ready to play')).toBeVisible();
  await expect(page.locator('.app')).toHaveClass(/appearance-velvet/);
});

test('Haunted Hollow raises its moonlit graveyard and keeps it after a reload', async ({
  page,
}) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Choose app theme' }).click();
  await page.getByRole('button', { name: /Haunted Hollow/ }).click();
  await expect(page.locator('.app')).toHaveClass(/appearance-halloween/);
  await expect(page.locator('.halloween-scenery')).toBeAttached();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Dare to draw');
  await page.reload();
  await expect(page.getByText('All systems ready to play')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'halloween');
  await expect(page.locator('.halloween-scenery')).toBeAttached();
});
