import type { PublicRoom } from '../shared/types';

export type RouletteBet = { gameId: string; round: number; points: number; qualified: boolean };
export type RouletteResult = { multiplier: 0 | 2; points: number };
export const SPIN_DURATION = 4200;

export function rouletteResult(
  room: PublicRoom,
  playerId: string,
  bet: RouletteBet,
): RouletteResult | null {
  if (room.gameId !== bet.gameId) return null;
  const player =
    room.round === bet.round
      ? room.players.find((p) => p.id === playerId)
      : room.history.find((r) => r.round === bet.round)?.scores.find((p) => p.id === playerId);
  if (!player || player.status !== 'banked' || (player.roulette !== 0 && player.roulette !== 2))
    return null;
  return {
    multiplier: player.roulette,
    points: 'roundScore' in player ? player.roundScore : player.score,
  };
}

// Twelve equal pockets alternate ×2 / ×0. The pointer rests at twelve o'clock.
export function rouletteRotation(multiplier: 0 | 2) {
  const pocket = multiplier === 2 ? 8 : 9;
  return 360 * 6 - (pocket + 0.5) * 30;
}
