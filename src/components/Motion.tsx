import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Skull, Sparkles } from 'lucide-react';
import type { GameEvent, Player } from '../../shared/types';
import { useReducedMotion } from '../motion';

export function useHandFeedback({
  scope,
  sequence,
  value,
  count,
  status,
  roulette,
}: {
  scope: string;
  sequence: number;
  value: number;
  count: number;
  status: Player['status'];
  roulette: Player['roulette'];
}) {
  const previous = useRef({ scope, value, count, status });
  const [scoreCue, setScoreCue] = useState<{ id: number; delta: number } | null>(null);
  const [milestoneCue, setMilestoneCue] = useState<number | null>(null);
  const [bankCue, setBankCue] = useState<number | null>(null);
  useEffect(() => {
    const before = previous.current;
    previous.current = { scope, value, count, status };
    if (before.scope !== scope) {
      setScoreCue(null);
      setMilestoneCue(null);
      setBankCue(null);
      return;
    }
    if (before.status === 'active' && status === 'active') {
      if (before.value !== value) setScoreCue({ id: sequence, delta: value - before.value });
      if (before.count < 7 && count >= 7) setMilestoneCue(sequence);
    }
    if (before.status === 'active' && status === 'banked' && roulette === 1) {
      setBankCue(sequence);
    }
  }, [scope, sequence, value, count, status, roulette]);
  useEffect(() => {
    if (!scoreCue) return;
    const timer = setTimeout(() => setScoreCue(null), 1400);
    return () => clearTimeout(timer);
  }, [scoreCue]);
  useEffect(() => {
    if (milestoneCue === null) return;
    const timer = setTimeout(() => setMilestoneCue(null), 1500);
    return () => clearTimeout(timer);
  }, [milestoneCue]);
  useEffect(() => {
    if (bankCue === null) return;
    const timer = setTimeout(() => setBankCue(null), 1500);
    return () => clearTimeout(timer);
  }, [bankCue]);
  return { scoreCue, milestoneCue, bankCue };
}

export function AnimatedNumber({ value, from }: { value: number; from?: number }) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(from ?? value);
  const current = useRef(from ?? value);
  useEffect(() => {
    if (reduced) {
      current.current = value;
      setDisplay(value);
      return;
    }
    const from = current.current;
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 560);
      current.current = Math.round(from + (value - from) * (1 - (1 - progress) ** 3));
      setDisplay(current.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);
  return (
    <span className="animated-number" aria-label={String(value)}>
      <span aria-hidden="true">{reduced ? value : display}</span>
    </span>
  );
}

export function Celebration() {
  return (
    <div className="celebration" aria-hidden="true">
      {Array.from({ length: 24 }, (_, i) => (
        <i
          key={i}
          style={
            {
              '--x': `${(i * 37) % 100}%`,
              '--drift': `${((i * 29) % 150) - 75}px`,
              '--delay': `${(i % 6) * 0.07}s`,
              '--twist': `${i % 2 ? 420 : -360}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function RoundMoment({ event, name }: { event: GameEvent; name: string }) {
  const lost = event.moment === 'bust' || event.moment === 'roulette-loss';
  return (
    <div className={`round-moment ${lost ? 'loss' : 'hit'}`} role="status" aria-live="polite">
      {!lost && <Celebration />}
      <div className="round-moment-copy">
        <span className="moment-icon">{lost ? <Skull size={38} /> : <Sparkles size={38} />}</span>
        <span className="moment-eyebrow">{lost ? 'THE ROUND CLAIMS ANOTHER' : 'WHAT A CALL'}</span>
        <strong>
          {lost ? 'BUSTED' : event.moment === 'prediction-hit' ? 'NAILED IT!' : 'DOUBLE UP!'}
        </strong>
        <span className="moment-player">
          {name}{' '}
          {lost
            ? 'is out this round'
            : event.moment === 'prediction-hit'
              ? 'called it perfectly'
              : 'beats the wheel'}
        </span>
      </div>
    </div>
  );
}
