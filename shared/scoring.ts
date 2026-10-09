import type { Player, ScoreBreakdown } from './types';

export interface RoundRules {
  reversed: boolean;
  settings: { maxNumber: number };
}

export function scoreHand(
  player: Player,
  rules: RoundRules = { reversed: false, settings: { maxNumber: 12 } },
): ScoreBreakdown {
  const numbers = player.hand.filter((c) => c.kind === 'number' && !c.frozen);
  const values = new Set(numbers.map((c) => c.value));
  const numberSum = numbers.reduce(
    (sum, c) => sum + (rules.reversed ? rules.settings.maxNumber - c.value : c.value),
    0,
  );
  const multiplier = player.hand
    .filter((c) => c.kind === 'double' && !c.disabled)
    .reduce((n) => n * (rules.reversed ? 0.5 : 2), player.predictionMultiplier);
  const flatBonus = player.hand
    .filter((c) => c.kind === 'bonus' && !c.disabled)
    .reduce((sum, c) => sum + (rules.reversed ? -c.value : c.value), 0);
  const combos: string[] = [];
  let comboBonus = 0;
  if (values.has(6) && values.has(7)) {
    comboBonus += rules.reversed ? -10 : 10;
    combos.push('6 + 7');
  }
  if (values.has(4) && values.has(2) && values.has(0)) {
    comboBonus += rules.reversed ? -25 : 25;
    combos.push('4 + 2 + 0');
  }
  const count = numbers.length;
  const countBonus =
    count >= 7 ? (rules.reversed ? -1 : 1) * 15 * 2 ** (Math.min(count, 10) - 7) : 0;
  const subtotal =
    player.status === 'busted'
      ? 0
      : Math.max(0, Math.floor(numberSum * multiplier + flatBonus + comboBonus + countBonus));
  return {
    numberSum,
    multiplier,
    flatBonus,
    comboBonus,
    countBonus,
    count,
    subtotal,
    total: subtotal * player.roulette,
    combos,
  };
}
