import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X, Bot, Crown, Snowflake, ShieldCheck, Sparkles, Layers3, Eye } from 'lucide-react';
import type { Card, Player } from '../../shared/types';

export function Mark({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand-mark ${small ? 'small' : ''}`} aria-hidden="true">
      <span>j</span>
      <i />
    </span>
  );
}
export function Avatar({
  player,
  size = '',
  host = false,
}: {
  player: { name: string; color: string; bot?: boolean };
  size?: string;
  host?: boolean;
}) {
  return (
    <span
      className={`avatar ${player.color} ${size}`}
      aria-label={`${player.name}${player.bot ? ', bot' : ''}`}
    >
      <span>
        {player.bot ? (
          <Bot size={size === 'large' ? 28 : 19} />
        ) : (
          player.name.slice(0, 1).toUpperCase()
        )}
      </span>
      {host && (
        <i className="crown">
          <Crown size={11} />
        </i>
      )}
    </span>
  );
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'wide' : ''}`}
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-head">
        <div>
          <h2 id={titleId}>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
          <X size={21} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Sunburst({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
      <path d="m50 0 7 29 22-20-8 29 29-1-25 16 23 19-29-4 5 30-20-23-10 25-5-29-24 18 11-28-26-3 24-14L3 22l29 9L31 2l16 25z" />
    </svg>
  );
}
export function PlayingCard({ card, small = false }: { card: Card; small?: boolean }) {
  const label =
    card.kind === 'number'
      ? String(card.value)
      : card.kind === 'bonus'
        ? `+${card.value}`
        : card.kind === 'double'
          ? '×2'
          : card.kind === 'chance'
            ? '2nd'
            : card.kind === 'prediction'
              ? '×3'
              : '+3';
  const color =
    card.kind === 'number'
      ? ['butter', 'lavender', 'sage', 'peach'][card.value % 4]
      : card.kind === 'chance'
        ? 'sage'
        : card.kind === 'prediction'
          ? 'lavender'
          : 'peach';
  const Icon =
    card.kind === 'chance'
      ? ShieldCheck
      : card.kind === 'prediction'
        ? Eye
        : card.kind === 'flip3'
          ? Layers3
          : Sparkles;
  return (
    <div
      className={`playing-card ${color} ${small ? 'compact' : ''} ${card.frozen || card.disabled ? 'frozen' : ''}`}
      title={`${card.kind === 'number' ? card.value : card.kind}${card.frozen ? ' — frozen, still counts for duplicates' : card.disabled ? ' — disabled' : ''}`}
    >
      <span className="card-corner">{label}</span>
      <div className="card-middle">
        {card.kind === 'number' ? (
          <>
            <Sunburst />
            <strong>{label}</strong>
          </>
        ) : (
          <>
            <Icon size={small ? 22 : 32} />
            <strong>{label}</strong>
          </>
        )}
      </div>
      <span className="card-corner bottom">{label}</span>
      {(card.frozen || card.disabled) && (
        <span className="frozen-badge">
          <Snowflake size={12} />
          {small ? '' : card.frozen ? 'Frozen' : 'Disabled'}
        </span>
      )}
    </div>
  );
}
export function HeroCards() {
  return (
    <div className="hero-art" aria-label="A fan of colorful playing cards">
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <span className="art-spark spark-one">✳</span>
      <span className="art-spark spark-two">✦</span>
      <span className="art-dot" />
      <div className="hero-card first">
        <PlayingCard card={{ id: 'h1', kind: 'number', value: 4 }} />
      </div>
      <div className="hero-card second">
        <PlayingCard card={{ id: 'h2', kind: 'number', value: 7 }} />
      </div>
      <div className="hero-card third">
        <PlayingCard card={{ id: 'h3', kind: 'number', value: 12 }} />
      </div>
      <div className="hero-sticker">
        ONE MORE?
        <svg viewBox="0 0 60 20">
          <path
            d="M3 8q25 18 48-3m-12-1 13 0-2 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  );
}
export function PlayerStatus({ player }: { player: Player }) {
  return (
    <span className={`status-tag ${player.status}`}>
      {player.status === 'busted'
        ? 'Busted'
        : player.status === 'banked'
          ? `Banked ${player.roundScore}`
          : !player.connected && !player.bot
            ? 'Reconnecting'
            : 'In the round'}
    </span>
  );
}
