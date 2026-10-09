import { Eye } from 'lucide-react';
import type { Player } from '../../shared/types';
import { PlayingCard } from './ui';

export function HandCards({ player, small = false }: { player: Player; small?: boolean }) {
  const special = player.hand.filter((card) => card.kind !== 'number');
  const numbers = player.hand.filter((card) => card.kind === 'number');
  return (
    <div
      className={`${small ? 'opponent-cards' : 'hand-cards'} card-hand ${player.status !== 'active' ? 'is-out' : ''}`}
    >
      <div className="card-row-group">
        <span className="card-row-label">Special cards</span>
        <div className="card-row" role="group" aria-label="Special cards" tabIndex={0}>
          {special.map((card) => (
            <PlayingCard key={card.id} card={card} small={small} />
          ))}
          {player.predictionMultiplier > 1 && (
            <div className="multiplier-token">
              <Eye size={small ? 14 : 22} />
              <strong>×{player.predictionMultiplier}</strong>
              <span>Prediction</span>
            </div>
          )}
          {!special.length && player.predictionMultiplier === 1 && (
            <span className="card-row-empty">No special cards</span>
          )}
        </div>
      </div>
      <div className="card-row-group">
        <span className="card-row-label">Number cards</span>
        <div className="card-row" role="group" aria-label="Number cards" tabIndex={0}>
          {numbers.map((card) => (
            <PlayingCard key={card.id} card={card} small={small} />
          ))}
          {!numbers.length && <span className="card-row-empty">Waiting for a number…</span>}
        </div>
      </div>
    </div>
  );
}
