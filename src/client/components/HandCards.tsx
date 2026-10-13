import { useEffect, useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import type { Player } from '../../shared/types';
import { PlayingCard } from './ui';

export function HandCards({ player, small = false }: { player: Player; small?: boolean }) {
  const seen = useRef(new Set(player.hand.map((card) => card.id)));
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const freshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const next = new Set(player.hand.map((card) => card.id));
    const added = new Set([...next].filter((id) => !seen.current.has(id)));
    seen.current = next;
    if (!added.size) return;
    setFreshIds(added);
    if (freshTimer.current) clearTimeout(freshTimer.current);
    freshTimer.current = setTimeout(() => setFreshIds(new Set()), 1100);
  }, [player.hand]);
  useEffect(
    () => () => {
      if (freshTimer.current) clearTimeout(freshTimer.current);
    },
    [],
  );
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
            <PlayingCard
              key={card.id}
              card={card}
              small={small}
              fresh={player.status === 'active' && freshIds.has(card.id)}
            />
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
            <PlayingCard
              key={card.id}
              card={card}
              small={small}
              fresh={player.status === 'active' && freshIds.has(card.id)}
            />
          ))}
          {!numbers.length && <span className="card-row-empty">Waiting for a number…</span>}
        </div>
      </div>
    </div>
  );
}
