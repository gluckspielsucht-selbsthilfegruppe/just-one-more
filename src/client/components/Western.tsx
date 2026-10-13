import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { GameEvent } from '../../shared/types';
import { useReducedMotion } from '../motion';

const DUST = Array.from({ length: 18 }, (_, i) => ({
  '--x': `${(i * 53) % 100}%`,
  '--y': `${35 + ((i * 31) % 60)}%`,
  '--size': `${2 + (i % 4)}px`,
  '--delay': `${-((i * 1.7) % 14)}s`,
  '--speed': `${11 + (i % 5) * 3}s`,
}));

/** Ambient desert scenery behind the whole app: sun, mesas, dust, buzzards and tumbleweeds. */
export function WesternScenery() {
  return (
    <div className="western-scenery" aria-hidden="true">
      <div className="western-sun" />
      <svg className="western-buzzards" viewBox="0 0 120 40">
        <path d="M10 20q6-8 12 0q6-8 12 0" />
        <path d="M70 12q4-6 9 0q4-6 9 0" />
      </svg>
      <svg className="western-mesas" viewBox="0 0 1440 220" preserveAspectRatio="none">
        <path
          className="far"
          d="M0 220V150h90l20-34h120l18 34h210l26-60h150l24 60h260l18-26h96l16 26h220l20-44h112l18 44h62v70z"
        />
        <path
          className="near"
          d="M0 220v-36h180l30-52h170l26 52h330l40-80h190l34 80h190l22-30h104l20 30h104v36z"
        />
        <g className="cactus">
          <path d="M1180 190v-74a10 10 0 0 1 20 0v74z" />
          <path d="M1180 160h-18a8 8 0 0 1-8-8v-22a7 7 0 0 1 14 0v16h12z" />
          <path d="M1200 148h16v-26a7 7 0 0 1 14 0v32a8 8 0 0 1-8 8h-22z" />
          <path d="M210 196v-48a7 7 0 0 1 14 0v48z" />
          <path d="M210 176h-11a6 6 0 0 1-6-6v-14a5 5 0 0 1 10 0v10h7z" />
        </g>
      </svg>
      <div className="western-dust">
        {DUST.map((style, i) => (
          <i key={i} style={style as CSSProperties} />
        ))}
      </div>
      <Tumbleweed className="first" />
      <Tumbleweed className="second" />
    </div>
  );
}

function Tumbleweed({ className }: { className: string }) {
  return (
    <div className={`tumbleweed ${className}`}>
      <svg viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="24" />
        <path d="M8 26q22-14 44 6M10 38q20 8 42-12M18 10q10 22 2 44M40 8q-12 20 2 46M6 32h48M30 6v48" />
      </svg>
    </div>
  );
}

type Shot = { id: number; x: number; y: number; tilt: number };

/** Every button press fires a quick shot: muzzle flash, a bullet hole and a curl of smoke. */
export function GunslingerClicks() {
  const reduced = useReducedMotion();
  const [shots, setShots] = useState<Shot[]>([]);
  const next = useRef(0);
  useEffect(() => {
    if (reduced) return;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const fire = (event: PointerEvent) => {
      const target = event.target as Element | null;
      const button = target?.closest?.('button, [role="button"]');
      if (!button || button.matches(':disabled, [aria-disabled="true"]')) return;
      const shot = {
        id: next.current++,
        x: event.clientX,
        y: event.clientY,
        tilt: (next.current * 67) % 360,
      };
      setShots((current) => [...current.slice(-5), shot]);
      const timer = setTimeout(() => {
        timers.delete(timer);
        setShots((current) => current.filter((s) => s.id !== shot.id));
      }, 1700);
      timers.add(timer);
    };
    document.addEventListener('pointerdown', fire, true);
    return () => {
      document.removeEventListener('pointerdown', fire, true);
      timers.forEach(clearTimeout);
    };
  }, [reduced]);
  return (
    <div className="gunslinger-layer" aria-hidden="true">
      {shots.map((shot) => (
        <span
          key={shot.id}
          className="gun-shot"
          style={{ left: shot.x, top: shot.y, '--tilt': `${shot.tilt}deg` } as CSSProperties}
        >
          <i className="shot-flash" />
          <i className="shot-hole" />
          <i className="shot-smoke" />
        </span>
      ))}
    </div>
  );
}

const HOLES = [
  { '--x': '22%', '--y': '28%', '--delay': '0.12s', '--tilt': '12deg' },
  { '--x': '74%', '--y': '22%', '--delay': '0.42s', '--tilt': '-40deg' },
  { '--x': '64%', '--y': '74%', '--delay': '0.72s', '--tilt': '80deg' },
];

/** The western take on a round moment: a gunfight for busts, a gold strike for wins. */
export function WesternMoment({ event, name }: { event: GameEvent; name: string }) {
  const lost = event.moment === 'bust' || event.moment === 'roulette-loss';
  if (lost)
    return (
      <div className="western-moment bang" role="status" aria-live="polite">
        <div className="bang-flash" aria-hidden="true" />
        {HOLES.map((style, i) => (
          <span key={i} className="screen-hole" style={style as CSSProperties} aria-hidden="true">
            <i />
          </span>
        ))}
        <div className="bang-smoke" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className="western-moment-copy">
          <span className="bang-word" aria-hidden="true">
            BANG!
          </span>
          <span className="moment-eyebrow">★ SHOWDOWN AT HIGH NOON ★</span>
          <strong>BUSTED</strong>
          <span className="moment-player">{name} bit the dust</span>
        </div>
      </div>
    );
  return (
    <div className="western-moment strike" role="status" aria-live="polite">
      <div className="strike-rays" aria-hidden="true" />
      <div className="gold-rain" aria-hidden="true">
        {Array.from({ length: 26 }, (_, i) => (
          <i
            key={i}
            style={
              {
                '--x': `${(i * 37) % 100}%`,
                '--delay': `${(i % 7) * 0.08}s`,
                '--drift': `${((i * 29) % 120) - 60}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="western-moment-copy">
        <span className="sheriff-star" aria-hidden="true">
          <svg viewBox="0 0 100 100">
            <path d="M50 4l11 27 29-6-18 23 18 23-29-6-11 27-11-27-29 6 18-23-18-23 29 6z" />
            <circle cx="50" cy="50" r="17" />
          </svg>
        </span>
        <span className="moment-eyebrow">★ STRUCK GOLD ★</span>
        <strong>
          {event.moment === 'prediction-reverse-hit'
            ? 'WRONG WINS!'
            : event.moment === 'prediction-hit'
              ? 'BULLSEYE!'
              : 'YEEHAW!'}
        </strong>
        <span className="moment-player">
          {name}{' '}
          {event.moment === 'prediction-reverse-hit'
            ? 'missed it perfectly'
            : event.moment === 'prediction-hit'
              ? 'called it dead center'
              : 'beats the wheel'}
        </span>
      </div>
    </div>
  );
}
