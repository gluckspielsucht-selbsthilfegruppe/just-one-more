import { expect, test } from '@playwright/test';
import { bankUntilRoundEnds, openApp, startPractice } from './fixtures';

test('mobile: the table fits the viewport and a round can be played', async ({ page }) => {
  await openApp(page);
  await startPractice(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await bankUntilRoundEnds(page);
  await expect(page.locator('.round-score-list > div')).toHaveCount(4);
});
