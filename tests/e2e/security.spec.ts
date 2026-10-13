import { expect, test } from '@playwright/test';
import { bankUntilRoundEnds, openApp, startPractice } from './fixtures';

test('the app runs under the Content-Security-Policy without violations', async ({ page }) => {
  await page.addInitScript(() => {
    const violations: string[] = [];
    (window as unknown as { cspViolations: string[] }).cspViolations = violations;
    document.addEventListener('securitypolicyviolation', (event) =>
      violations.push(`${event.violatedDirective}: ${event.blockedURI}`),
    );
  });
  const response = await page.goto('/');
  expect(response?.headers()['content-security-policy']).toContain("script-src 'self'");
  await openApp(page);
  await page.getByRole('button', { name: /Learn how to play/ }).click();
  await page.getByRole('button', { name: /Got it/ }).click();
  await startPractice(page);
  await bankUntilRoundEnds(page);
  const violations = await page.evaluate(
    () => (window as unknown as { cspViolations: string[] }).cspViolations,
  );
  expect(violations).toEqual([]);
});
