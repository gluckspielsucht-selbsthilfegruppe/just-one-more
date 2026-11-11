import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { GameEvent } from '../../shared/types';
import { useReducedMotion } from '../motion';

const STARS = Array.from({ length: 28 }, (_, i) => ({
  '--x': `${(i * 61) % 100}%`,
  '--y': `${(i * 37) % 58}%`,
  '--size': `${1 + (i % 3)}px`,
  '--delay': `${-((i * 0.9) % 5)}s`,
}));

const WISPS = Array.from({ length: 12 }, (_, i) => ({
  '--x': `${(i * 43 + 7) % 100}%`,
  '--y': `${58 + ((i * 23) % 34)}%`,
  '--delay': `${-((i * 1.3) % 9)}s`,
  '--speed': `${7 + (i % 4) * 2}s`,
}));

const BATS = [
  { '--top': '14%', '--delay': '0s', '--speed': '17s', '--scale': 1 },
  { '--top': '22%', '--delay': '-6s', '--speed': '21s', '--scale': 0.7 },
  { '--top': '9%', '--delay': '-11s', '--speed': '25s', '--scale': 0.55 },
  { '--top': '30%', '--delay': '-3s', '--speed': '29s', '--scale': 0.45 },
];

export function Bat({ className = '' }: { className?: string }) {
  return (
    <svg className={`bat ${className}`} viewBox="0 0 64 32" aria-hidden="true">
      <path
        className="wing left"
        d="M30 14C24 6 14 4 2 8c5 2 7 6 6 10 4-2 8-1 9 3 2-4 6-5 9-3 1-2 2-3 4-4z"
      />
      <path
        className="wing right"
        d="M34 14c6-8 16-10 28-6-5 2-7 6-6 10-4-2-8-1-9 3-2-4-6-5-9-3-1-2-2-3-4-4z"
      />
      <path className="body" d="M32 9l-3-5 1 6c-2 1-3 4-2 7 1 3 3 5 4 5s3-2 4-5c1-3 0-6-2-7l1-6z" />
      <circle className="eye" cx="30.6" cy="12.5" r="0.9" />
      <circle className="eye" cx="33.4" cy="12.5" r="0.9" />
    </svg>
  );
}

export function JackOLantern({ className = '' }: { className?: string }) {
  return (
    <svg className={`jack-o-lantern ${className}`} viewBox="0 0 100 92" aria-hidden="true">
      <path className="stem" d="M46 16c0-7 2-12 8-15l4 3c-4 3-5 7-4 12z" />
      <g className="shell">
        <ellipse cx="30" cy="54" rx="24" ry="34" />
        <ellipse cx="70" cy="54" rx="24" ry="34" />
        <ellipse cx="50" cy="54" rx="24" ry="36" />
      </g>
      <g className="ribs">
        <path d="M50 19c-9 10-9 60 0 71M50 19c9 10 9 60 0 71" />
      </g>
      <g className="face">
        <path d="M27 42l12-9 6 14z" />
        <path d="M73 42l-12-9-6 14z" />
        <path d="M50 50l-6 10h12z" />
        <path d="M22 62c10 10 46 10 56 0l-4 13c-5 4-12 6-24 6s-19-2-24-6zM36 66v6h7v-5M57 67v5h7v-6" />
      </g>
    </svg>
  );
}

/** Ambient night scenery behind the whole app: a full moon, bats, a graveyard, fog and wisps. */
export function HalloweenScenery() {
  return (
    <div className="halloween-scenery" aria-hidden="true">
      <div className="halloween-stars">
        {STARS.map((style, i) => (
          <i key={i} style={style as CSSProperties} />
        ))}
      </div>
      <div className="halloween-moon" />
      <div className="halloween-cloud first" />
      <div className="halloween-cloud second" />
      {BATS.map((style, i) => (
        <div key={i} className="flying-bat" style={style as CSSProperties}>
          <Bat />
        </div>
      ))}
      <div className="halloween-spider">
        <svg viewBox="0 0 40 40">
          <path d="M8 10l8 8M32 10l-8 8M4 20h12M36 20H24M8 32l8-8M32 32l-8-8" />
          <ellipse cx="20" cy="21" rx="6" ry="7" />
          <circle cx="20" cy="13" r="4" />
          <circle className="eye" cx="18.4" cy="12.6" r="1" />
          <circle className="eye" cx="21.6" cy="12.6" r="1" />
        </svg>
      </div>
      <svg className="halloween-graveyard" viewBox="0 0 1440 260" preserveAspectRatio="none">
        <path className="hill far" d="M0 260V170q180-60 380-30t420-20q260-40 420 10t220 10v120z" />
        <g className="manor">
          <path d="M1010 176v-86l-14 0 44-46 44 46h-14v86z" />
          <path d="M1070 176v-58l38-34 38 34v58z" />
          <path d="M1020 64h10v-24h-10zM1112 92h8v-26h-8z" />
          <rect className="window" x="1027" y="100" width="12" height="16" />
          <rect className="window late" x="1047" y="130" width="12" height="16" />
          <rect className="window" x="1101" y="128" width="13" height="18" />
          <circle className="window late" cx="1040" cy="76" r="6" />
        </g>
        <g className="dead-tree">
          <path d="M226 238c4-40 2-80-10-120l8-2c8 22 12 44 13 66 6-24 20-46 40-60l5 6c-22 16-34 40-38 70 2 14 2 28 0 40z" />
          <path d="M218 128c-12-14-30-22-50-22l1-7c18 0 34 6 46 16-4-14-12-26-24-34l5-5c16 12 26 30 28 50z" />
          <path d="M270 128c10-6 22-8 34-6l-1 7c-12-2-22 0-30 5z" />
        </g>
        <path className="hill near" d="M0 260v-46q240-36 520-14t520-6q240-20 400 18v48z" />
        <g className="tombstones">
          <path d="M120 236v-38a18 18 0 0 1 36 0v38z" />
          <path d="M340 230v-30a14 14 0 0 1 28 0v30z" />
          <path d="M574 236v-26h-10v-8h10v-10h8v10h10v8h-10v26z" />
          <path d="M760 234v-34a16 16 0 0 1 32 0v34z" />
          <path d="M1240 236v-28a13 13 0 0 1 26 0v28z" />
          <path d="M1318 238v-22h-9v-7h9v-9h7v9h9v7h-9v22z" />
        </g>
        <g className="fence">
          <path d="M860 240v-46l5-8 5 8v46zM884 240v-46l5-8 5 8v46zM908 240v-46l5-8 5 8v46zM932 240v-46l5-8 5 8v46zM852 206h92v5h-92zM852 226h92v5h-92z" />
        </g>
      </svg>
      <JackOLantern className="ground-lantern first" />
      <JackOLantern className="ground-lantern second" />
      <div className="halloween-wisps">
        {WISPS.map((style, i) => (
          <i key={i} style={style as CSSProperties} />
        ))}
      </div>
      <div className="peeking-ghost">
        <Ghost />
      </div>
      <div className="halloween-fog back" />
      <div className="halloween-fog front" />
    </div>
  );
}

export function Ghost({ className = '' }: { className?: string }) {
  return (
    <svg className={`ghost ${className}`} viewBox="0 0 80 96" aria-hidden="true">
      <path
        className="sheet"
        d="M40 4C18 4 8 22 8 44v46l9-8 8 10 8-10 7 10 7-10 8 10 8-10 9 8V44C72 22 62 4 40 4z"
      />
      <ellipse className="eye" cx="29" cy="38" rx="5" ry="7" />
      <ellipse className="eye" cx="51" cy="38" rx="5" ry="7" />
      <ellipse className="mouth" cx="40" cy="58" rx="7" ry="9" />
      <ellipse className="blush" cx="21" cy="50" rx="5" ry="3" />
      <ellipse className="blush" cx="59" cy="50" rx="5" ry="3" />
    </svg>
  );
}

type Haunt = { id: number; x: number; y: number; kind: 'bats' | 'ghost' | 'candy' };
const HAUNTS: Haunt['kind'][] = ['bats', 'ghost', 'candy'];
const SCATTER = [
  { '--dx': '-70px', '--dy': '-62px', '--turn': '-24deg' },
  { '--dx': '64px', '--dy': '-78px', '--turn': '18deg' },
  { '--dx': '6px', '--dy': '-104px', '--turn': '4deg' },
];
const CANDY = Array.from({ length: 7 }, (_, i) => ({
  '--angle': `${i * (360 / 7) + 12}deg`,
  '--spin': `${i % 2 ? 300 : -260}deg`,
}));

/** Every button press releases a little haunt: a flurry of bats, a shy ghost or a burst of candy. */
export function HauntedClicks() {
  const reduced = useReducedMotion();
  const [haunts, setHaunts] = useState<Haunt[]>([]);
  const next = useRef(0);
  useEffect(() => {
    if (reduced) return;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const haunt = (event: PointerEvent) => {
      const target = event.target as Element | null;
      const button = target?.closest?.('button, [role="button"]');
      if (!button || button.matches(':disabled, [aria-disabled="true"]')) return;
      const id = next.current++;
      const item: Haunt = { id, x: event.clientX, y: event.clientY, kind: HAUNTS[id % 3] };
      setHaunts((current) => [...current.slice(-5), item]);
      const timer = setTimeout(() => {
        timers.delete(timer);
        setHaunts((current) => current.filter((h) => h.id !== id));
      }, 1500);
      timers.add(timer);
    };
    document.addEventListener('pointerdown', haunt, true);
    return () => {
      document.removeEventListener('pointerdown', haunt, true);
      timers.forEach(clearTimeout);
    };
  }, [reduced]);
  return (
    <div className="haunted-layer" aria-hidden="true">
      {haunts.map((haunt) => (
        <span
          key={haunt.id}
          className={`haunt ${haunt.kind}`}
          style={{ left: haunt.x, top: haunt.y }}
        >
          <i className="haunt-puff" />
          {haunt.kind === 'bats' &&
            SCATTER.map((style, i) => (
              <span key={i} className="haunt-bat" style={style as CSSProperties}>
                <Bat />
              </span>
            ))}
          {haunt.kind === 'ghost' && (
            <span className="haunt-ghost">
              <Ghost />
              <b>boo!</b>
            </span>
          )}
          {haunt.kind === 'candy' &&
            CANDY.map((style, i) => (
              <i key={i} className="haunt-candy" style={style as CSSProperties} />
            ))}
        </span>
      ))}
    </div>
  );
}

const DRIPS = Array.from({ length: 14 }, (_, i) => ({
  '--x': `${(i * 7.3 + 2) % 100}%`,
  '--length': `${18 + ((i * 41) % 46)}vh`,
  '--width': `${14 + ((i * 13) % 22)}px`,
  '--delay': `${0.2 + (i % 5) * 0.12}s`,
}));
const TREATS = Array.from({ length: 28 }, (_, i) => ({
  '--x': `${(i * 37) % 100}%`,
  '--delay': `${(i % 7) * 0.09}s`,
  '--drift': `${((i * 29) % 140) - 70}px`,
  '--spin': `${i % 2 ? 540 : -420}deg`,
}));
const SWARM = Array.from({ length: 8 }, (_, i) => ({
  '--angle': `${i * 45 + 20}deg`,
  '--delay': `${0.55 + (i % 4) * 0.06}s`,
}));

/** The Halloween take on a round moment: a ghostly BOO for busts, a treat storm for wins. */
export function HalloweenMoment({ event, name }: { event: GameEvent; name: string }) {
  const lost = event.moment === 'bust' || event.moment === 'roulette-loss';
  if (lost)
    return (
      <div className="halloween-moment boo" role="status" aria-live="polite">
        <div className="boo-lightning" aria-hidden="true">
          <svg viewBox="0 0 60 200" preserveAspectRatio="none">
            <path d="M34 0L12 86h18L8 200 52 70H32L46 0z" />
          </svg>
        </div>
        <div className="slime-drips" aria-hidden="true">
          {DRIPS.map((style, i) => (
            <i key={i} style={style as CSSProperties} />
          ))}
        </div>
        <div className="boo-ghost" aria-hidden="true">
          <Ghost />
        </div>
        <div className="halloween-moment-copy">
          <span className="boo-word" aria-hidden="true">
            BOO!
          </span>
          <span className="moment-eyebrow">☠ THE SPIRITS HAVE SPOKEN ☠</span>
          <strong>BUSTED</strong>
          <span className="moment-player">{name} got spooked</span>
        </div>
      </div>
    );
  return (
    <div className="halloween-moment treat" role="status" aria-live="polite">
      <div className="treat-rays" aria-hidden="true" />
      <div className="treat-rain" aria-hidden="true">
        {TREATS.map((style, i) => (
          <i key={i} style={style as CSSProperties} />
        ))}
      </div>
      <div className="halloween-moment-copy">
        <span className="treat-lantern" aria-hidden="true">
          <JackOLantern />
          {SWARM.map((style, i) => (
            <span key={i} className="swarm-bat" style={style as CSSProperties}>
              <Bat />
            </span>
          ))}
        </span>
        <span className="moment-eyebrow">✦ TRICK OR TREAT ✦</span>
        <strong>
          {event.moment === 'prediction-reverse-hit'
            ? 'WRONG WINS!'
            : event.moment === 'prediction-hit'
              ? 'WITCHCRAFT!'
              : 'SWEET TREAT!'}
        </strong>
        <span className="moment-player">
          {name}{' '}
          {event.moment === 'prediction-reverse-hit'
            ? 'missed it perfectly'
            : event.moment === 'prediction-hit'
              ? 'saw it in the crystal ball'
              : 'beats the wheel'}
        </span>
      </div>
    </div>
  );
}
