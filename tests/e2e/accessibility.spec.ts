import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createTable, openApp, startPractice } from './fixtures';

// Known findings tracked as M-08 in docs/technical-plan.md; any other serious issue fails.
const KNOWN = new Set(['color-contrast', 'scrollable-region-focusable']);

async function seriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .filter((v) => !KNOWN.has(v.id))
    .map((v) => `${v.id}: ${v.help} (${v.nodes.length})`);
}

test.describe('accessibility', () => {
  test('landing page', async ({ page }) => {
    await openApp(page);
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('rules dialog', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: /Learn how to play/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('lobby', async ({ page }) => {
    await openApp(page);
    await createTable(page, { nickname: 'Dana', table: 'Axe lobby' });
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('game table', async ({ page }) => {
    await openApp(page);
    await startPractice(page);
    expect(await seriousViolations(page)).toEqual([]);
  });
});
