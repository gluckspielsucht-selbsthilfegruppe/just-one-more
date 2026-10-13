import { expect, test } from '@playwright/test';
import { bankUntilRoundEnds, createTable, newPlayer } from './fixtures';

test('two players: invitation link, ready check, and a shared round result', async ({
  browser,
}) => {
  const host = await newPlayer(browser);
  const code = await createTable(host, { nickname: 'Alice', table: 'E2E Friday' });

  const guest = await newPlayer(browser, `/?room=${code}`);
  await expect(guest.getByRole('heading', { name: /E2E Friday/ })).toBeVisible();
  await expect(host.getByText(/Guest \d+/).first()).toBeVisible();

  await expect(host.getByRole('button', { name: /Deal us in/ })).toBeDisabled();
  await guest.getByRole('button', { name: /I’m ready/ }).click();
  await host.getByRole('button', { name: /Deal us in/ }).click();

  await Promise.all([bankUntilRoundEnds(host), bankUntilRoundEnds(guest)]);
  const scores = (page: typeof host) =>
    page
      .locator('.round-score-list > div')
      .evaluateAll((rows) =>
        rows.map((row) => (row.textContent ?? '').replace(/\s+/g, ' ').trim()),
      );
  await expect.poll(() => scores(guest)).toEqual(await scores(host));
  await expect(guest.getByText(/Waiting for the host to deal the next round/)).toBeVisible();

  await host.context().close();
  await guest.context().close();
});

test('a private table code works from the join dialog', async ({ browser }) => {
  const host = await newPlayer(browser);
  const code = await createTable(host, { nickname: 'Bea', table: 'Secret table' });
  const guest = await newPlayer(browser);
  await expect(guest.getByText('Secret table')).toBeHidden();
  await guest.getByRole('button', { name: /Join with a code/ }).click();
  const dialog = guest.getByRole('dialog', { name: /Your seat is waiting/ });
  await dialog.getByLabel('Your nickname').fill('Charlie');
  await dialog.getByLabel('Table code').fill(code);
  await dialog.getByRole('button', { name: /Pull up a chair/ }).click();
  await expect(host.getByText('Charlie').first()).toBeVisible();

  await host.context().close();
  await guest.context().close();
});
