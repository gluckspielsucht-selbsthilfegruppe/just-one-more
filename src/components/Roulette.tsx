import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Dices, Sparkles } from 'lucide-react';
import { Modal } from './ui';
import { AnimatedNumber, Celebration } from './Motion';
import { useReducedMotion } from '../motion';
import {
  rouletteRotation,
  SPIN_DURATION,
  type RouletteBet,
  type RouletteResult,
} from '../roulette';
import type { SoundCue } from '../audio';

export function RouletteDialog({
  bet,
  result,
  canSpin,
  onSpin,
  onBank,
  onClose,
  playSound,
}: {
  bet: RouletteBet;
  result: RouletteResult | null;
  canSpin: boolean;
  onSpin: () => Promise<void>;
  onBank: () => void;
  onClose: () => void;
  playSound: (cue: SoundCue) => void;
}) {
  const [phase, setPhase] = useState<'ready' | 'requesting' | 'spinning' | 'result'>('ready');
  const [settled, setSettled] = useState<RouletteResult | null>(null);
  const [error, setError] = useState('');
  const requested = useRef(false);
  const confirmed = useRef(result);
  confirmed.current = result;
  const cue = useRef(playSound);
  cue.current = playSound;
  const reduced = useReducedMotion();
  useEffect(() => {
    if (phase !== 'requesting' || !result) return;
    setSettled(result);
    setPhase(reduced ? 'result' : 'spinning');
  }, [phase, result, reduced]);
  useEffect(() => {
    if (phase !== 'spinning') return;
    const finish = setTimeout(() => setPhase('result'), reduced ? 0 : SPIN_DURATION);
    // Tick intervals lengthen with the visual deceleration. Nothing selects an outcome here.
    const ticks = [0, 90, 190, 300, 430, 590, 790, 1040, 1360, 1770, 2290, 2910, 3620].map(
      (delay) => setTimeout(() => cue.current('tick'), delay),
    );
    return () => {
      clearTimeout(finish);
      ticks.forEach(clearTimeout);
    };
  }, [phase, reduced]);
  useEffect(() => {
    if (phase === 'result' && settled) cue.current(settled.multiplier === 2 ? 'win' : 'bust');
  }, [phase, settled]);

  async function spin() {
    if (requested.current || !canSpin) return;
    requested.current = true;
    setError('');
    setPhase('requesting');
    try {
      await onSpin();
    } catch (e) {
      if (confirmed.current) return;
      requested.current = false;
      setPhase('ready');
      setError(
        e instanceof Error ? e.message : 'The spin could not be confirmed. Please try again.',
      );
    }
  }
  const revealed = phase === 'result' && settled;
  const turning = phase === 'spinning';
  const rotation = settled ? rouletteRotation(settled.multiplier) : 0;
  return (
    <Modal
      title={
        revealed
          ? settled.multiplier === 2
            ? 'Make that a double.'
            : 'The wheel has spoken.'
          : 'One spin. Two possibilities.'
      }
      subtitle="ROULETTE / DOUBLE OR NOTHING"
      onClose={onClose}
      className="roulette-modal"
    >
      <div
        className={`roulette-show ${phase} ${revealed && settled.multiplier === 2 ? 'won' : ''}`}
      >
        {revealed && settled.multiplier === 2 && <Celebration />}
        <div className="roulette-marquee">
          <i />{' '}
          {turning ? 'IN MOTION' : revealed ? 'POINTS BANKED' : 'A LITTLE LUCK. A LOT OF NERVE.'}{' '}
          <i />
        </div>
        <div className="roulette-stage" aria-hidden="true">
          <div className="wheel-halo" />
          <div className="wheel-pointer" />
          <div className="wheel-rim">
            <svg
              className="roulette-wheel"
              viewBox="0 0 320 320"
              style={{
                transform: `rotate(${rotation}deg)`,
                transitionDuration: reduced ? '0ms' : `${SPIN_DURATION}ms`,
              }}
            >
              {Array.from({ length: 12 }, (_, i) => {
                const start = ((i * 30 - 90) * Math.PI) / 180;
                const end = (((i + 1) * 30 - 90) * Math.PI) / 180;
                const middle = (start + end) / 2;
                return (
                  <g key={i} className={i % 2 ? 'pocket-zero' : 'pocket-double'}>
                    <path
                      d={`M160,160 L${160 + 148 * Math.cos(start)},${160 + 148 * Math.sin(start)} A148,148 0 0,1 ${160 + 148 * Math.cos(end)},${160 + 148 * Math.sin(end)} Z`}
                    />
                    <text
                      x={160 + 111 * Math.cos(middle)}
                      y={160 + 111 * Math.sin(middle)}
                      transform={`rotate(${i * 30 + 15}, ${160 + 111 * Math.cos(middle)}, ${160 + 111 * Math.sin(middle)})`}
                    >
                      {i % 2 ? '×0' : '×2'}
                    </text>
                  </g>
                );
              })}
              <circle cx="160" cy="160" r="82" className="wheel-inner-ring" />
            </svg>
            <div className="wheel-hub">
              <span>JUST</span>
              <strong>ONE</strong>
              <span>MORE</span>
            </div>
            <div
              className="wheel-ball-orbit"
              style={{
                transform: `rotate(${settled ? -1080 : 0}deg)`,
                transitionDuration: reduced ? '0ms' : `${SPIN_DURATION}ms`,
              }}
            >
              <i />
            </div>
          </div>
          {revealed && <div className="wheel-result-seal">×{settled.multiplier}</div>}
        </div>
        <div className="roulette-outcomes">
          <div className={revealed && settled.multiplier === 0 ? 'landed' : ''}>
            <span>50% CHANCE</span>
            <strong>×0</strong>
            <small>0 points</small>
          </div>
          <span className="roulette-or">OR</span>
          <div className={revealed && settled.multiplier === 2 ? 'landed' : ''}>
            <span>50% CHANCE</span>
            <strong>×2</strong>
            <small>{bet.points * 2} points</small>
          </div>
        </div>
      </div>
      <div className="roulette-caption" role="status" aria-live="polite">
        {revealed ? (
          <>
            <strong>
              <AnimatedNumber value={settled.points} from={0} /> points banked
            </strong>
            <p>
              {settled.multiplier === 2
                ? 'A little luck looks good on you.'
                : 'No points this time. Your previous rounds are safe.'}
            </p>
          </>
        ) : phase === 'requesting' ? (
          <>
            <strong>Confirming your spin…</strong>
            <p>You can close this view; your table keeps your result.</p>
          </>
        ) : turning ? (
          <>
            <strong>Round and round…</strong>
            <p>Your {bet.points} round points are on the wheel.</p>
          </>
        ) : (
          <>
            <strong>{bet.points} points on the table.</strong>
            <p>
              Bank them safely, or take an equal chance at double or nothing.
              {bet.qualified && ' A ×0 also removes your seven-card qualification.'}
            </p>
          </>
        )}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {phase === 'ready' ? (
        <div className="modal-actions roulette-controls">
          <button className="button secondary" disabled={!canSpin} onClick={onBank}>
            <Check size={17} /> Bank {bet.points}
          </button>
          <button className="button primary" disabled={!canSpin} onClick={() => void spin()}>
            <Dices size={18} /> Spin the wheel
          </button>
        </div>
      ) : revealed ? (
        <button className="button primary full" onClick={onClose} autoFocus>
          {settled.multiplier === 2 ? <Sparkles size={18} /> : <Check size={18} />} Back to the
          table <ArrowRight size={17} />
        </button>
      ) : (
        <button
          className="text-button roulette-skip"
          autoFocus
          onClick={turning ? () => setPhase('result') : onClose}
        >
          {turning ? 'Show result now' : 'Back to the table'}
        </button>
      )}
      {phase === 'ready' && !canSpin && (
        <p className="muted-text">
          The table has moved on. Close this window to see the latest hand.
        </p>
      )}
    </Modal>
  );
}
