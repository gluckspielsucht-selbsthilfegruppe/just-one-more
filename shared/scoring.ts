import type { Player, ScoreBreakdown } from './types';
export function scoreHand(player: Player): ScoreBreakdown {
  const numbers = player.hand.filter((c) => c.kind === 'number' && !c.frozen);
  const values = new Set(numbers.map((c) => c.value));
  const numberSum = numbers.reduce((sum, c) => sum + c.value, 0);
  const multiplier = player.hand
    .filter((c) => c.kind === 'double' && !c.disabled)
    .reduce((n) => n * 2, player.predictionMultiplier);
  const flatBonus = player.hand
    .filter((c) => c.kind === 'bonus' && !c.disabled)
    .reduce((sum, c) => sum + c.value, 0);
  const combos: string[] = [];
  let comboBonus = 0;
  if (values.has(6) && values.has(7)) {
    comboBonus += 10;
    combos.push('6 + 7');
  }
  if (values.has(4) && values.has(2) && values.has(0)) {
    comboBonus += 25;
    combos.push('4 + 2 + 0');
  }
  const count = numbers.length;
  const countBonus = count >= 7 ? 15 * 2 ** (Math.min(count, 10) - 7) : 0;
  const subtotal =
    player.status === 'busted' ? 0 : numberSum * multiplier + flatBonus + comboBonus + countBonus;
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
