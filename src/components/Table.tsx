import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Check,
  CheckCheck,
  Copy,
  Crown,
  Dices,
  Eye,
  Flag,
  Layers3,
  Link2,
  LoaderCircle,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { scoreHand } from '../../shared/scoring';
import type { Player, Profile, PublicRoom } from '../../shared/types';
import type { Command } from '../App';
import { Avatar, Modal, PlayingCard, PlayerStatus, Sunburst } from './ui';

async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
  const input = document.createElement('textarea');
  input.value = text;
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.append(input);
  input.select();
  const success = document.execCommand('copy');
  input.remove();
  if (!success) throw new Error('Select and copy the invitation link below.');
}
export function Lobby({
  room,
  profile,
  send,
  busy,
  notify,
}: {
  room: PublicRoom;
  profile: Profile;
  send: Command;
  busy: boolean;
  notify: (message: string) => void;
}) {
  const isHost = room.hostId === profile.id;
  const me = room.players.find((p) => p.id === profile.id)!;
  const canStart =
    room.players.length >= 2 && room.players.every((p) => p.ready || p.id === room.hostId);
  const invitation = `${location.origin}/?room=${room.code}`;
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await copyText(invitation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <div className="lobby">
      <div className="lobby-heading">
        <span className="eyebrow">GOOD COMPANY, INCOMING</span>
        <h1>{room.name}</h1>
        <p>The cards are ready. We’re just waiting for the characters.</p>
      </div>
      <div className="lobby-grid">
        <section className="lobby-seats">
          <div className="section-heading">
            <h2>
              Pull up a chair{' '}
              <span className="count-badge">
                {room.players.length}/{room.settings.maxPlayers}
              </span>
            </h2>
            <span className="pill green">
              <i /> Waiting room
            </span>
          </div>
          <div className="seat-grid">
            {room.players.map((p) => (
              <div className={`seat ${p.id === profile.id ? 'you' : ''}`} key={p.id}>
                <Avatar player={p} size="large" host={p.id === room.hostId} />
                <strong>
                  {p.name}
                  {p.id === profile.id && <span> (you)</span>}
                </strong>
                <span className={`seat-state ${p.ready || p.id === room.hostId ? 'ready' : ''}`}>
                  {!p.connected && !p.bot ? (
                    'Reconnecting…'
                  ) : p.id === room.hostId ? (
                    <>
                      <Crown size={12} /> The host
                    </>
                  ) : p.ready ? (
                    <>
                      <CheckCheck size={14} /> Ready to play
                    </>
                  ) : (
                    'Getting comfortable'
                  )}
                </span>
                {isHost && p.id !== profile.id && (
                  <button
                    className="seat-remove"
                    aria-label={`Remove ${p.name}`}
                    title={`Remove ${p.name}`}
                    disabled={busy}
                    onClick={() => void send('remove-player', { playerId: p.id })}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            {Array.from(
              { length: Math.max(0, Math.min(room.settings.maxPlayers, 4) - room.players.length) },
              (_, i) => (
                <div className="seat empty-seat" key={`empty-${i}`}>
                  <span className="empty-avatar">
                    <Plus size={22} />
                  </span>
                  <strong>An open seat</strong>
                  <span>Someone fun, hopefully.</span>
                </div>
              ),
            )}
          </div>
          <div className="lobby-bottom">
            {isHost ? (
              <button
                className="text-button"
                disabled={busy || room.players.length >= room.settings.maxPlayers}
                onClick={() => void send('add-bot')}
              >
                <Bot size={18} /> Add a practice bot
              </button>
            ) : (
              <span className="muted-text">Say you’re ready to let your host know.</span>
            )}
            <span className="muted-text">
              <Users size={14} /> Up to {room.settings.maxPlayers} players
            </span>
          </div>
          <div className="start-bar">
            {isHost ? (
              <>
                <p>
                  {room.players.length < 2
                    ? 'Invite a friend or add a bot to get started.'
                    : canStart
                      ? 'Everyone’s here. Time to test your luck.'
                      : 'Waiting for everyone to say they’re ready.'}
                </p>
                <button
                  className="button primary"
                  disabled={busy || !canStart}
                  onClick={() => void send('start')}
                >
                  Deal us in <ArrowRight size={18} />
                </button>
              </>
            ) : (
              <>
                <p>
                  {me.ready
                    ? 'You’re in. The host will start the game.'
                    : 'Comfortable? Let’s get this table going.'}
                </p>
                <button
                  className={`button ${me.ready ? 'secondary' : 'primary'}`}
                  disabled={busy}
                  onClick={() => void send('ready')}
                >
                  {me.ready ? (
                    <>
                      <Check size={18} /> Ready — click to undo
                    </>
                  ) : (
                    <>
                      I’m ready <Check size={18} />
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </section>
        <aside className="lobby-sidebar">
          <div className="invite-panel">
            <div className="panel-icon">
              <Link2 size={22} />
            </div>
            <h3>Good games are better shared.</h3>
            <p>Send the link or share your table code.</p>
            <div className="invite-code">
              <span>{room.code}</span>
              <button
                className="icon-button"
                aria-label="Copy table code"
                onClick={() =>
                  void copyText(room.code)
                    .then(() => notify('Table code copied.'))
                    .catch((e) => notify(e.message))
                }
              >
                <Copy size={17} />
              </button>
            </div>
            <button className="button dark full" onClick={() => void copy()}>
              {copied ? <Check size={17} /> : <Copy size={17} />}
              {copied ? 'Link copied!' : 'Copy invite link'}
            </button>
            <input
              className="invite-url"
              value={invitation}
              readOnly
              aria-label="Invitation link"
              onFocus={(e) => e.target.select()}
            />
            {location.hostname === 'localhost' && (
              <p className="local-hint">
                Playing on other devices? Open the network URL shown in the server terminal first,
                then copy your invite.
              </p>
            )}
          </div>
          <div className="table-rules">
            <h4>This table’s flavor</h4>
            <div>
              <span>Number range</span>
              <strong>0–{room.settings.maxNumber}</strong>
            </div>
            <div>
              <span>Playing for</span>
              <strong>{room.settings.endMode === 'seven' ? '200 + seven' : '200 points'}</strong>
            </div>
            <div>
              <span>The guest list</span>
              <strong>{room.settings.isPublic ? 'Open to everyone' : 'Invite only'}</strong>
            </div>
            <div>
              <span>Special cards</span>
              <strong>All the good stuff</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function Table({
  room,
  profile,
  send,
  busy,
  onRules,
}: {
  room: PublicRoom;
  profile: Profile;
  send: Command;
  busy: boolean;
  onRules: () => void;
}) {
  const me = room.players.find((p) => p.id === profile.id)!;
  const score = scoreHand(me);
  const actorId = room.prompt?.actorId ?? room.turnId;
  const actor = room.players.find((p) => p.id === actorId);
  const mine = actorId === profile.id && room.phase === 'playing';
  const host = room.hostId === profile.id;
  const [roulette, setRoulette] = useState(false);
  const [guess, setGuess] = useState<number | null>(null);
  const [chat, setChat] = useState('');
  const [activityTab, setActivityTab] = useState<'activity' | 'rounds'>('activity');
  const activity = useRef<HTMLDivElement>(null);
  const roundOver = room.phase === 'round-end' || room.phase === 'finished';
  const winner = room.players.find((p) => p.id === room.winnerId);
  useEffect(() => {
    if (activity.current) activity.current.scrollTop = activity.current.scrollHeight;
  }, [room.eventSequence, activityTab]);
  useEffect(() => {
    setGuess(null);
    setRoulette(false);
  }, [room.round, room.phase, room.prompt?.kind]);
  const action = (value: Record<string, unknown>) => send('action', { action: value });
  return (
    <>
      <div className="game-heading">
        <div>
          <span className="eyebrow">
            {room.name} <span className="heading-code">/ {room.code}</span>
          </span>
          <h1>
            {room.phase === 'finished' ? (
              'What a game.'
            ) : (
              <>
                Round {String(room.round).padStart(2, '0')}
                <span className="round-slash"> / </span>
                <span className="round-tag">
                  {room.settings.endMode === 'seven' ? '200 + seven' : 'Race to 200'}
                </span>
              </>
            )}
          </h1>
        </div>
        <div className="game-meta">
          <span>
            <Layers3 size={16} /> {room.deckCount} in the deck
          </span>
          <span>Numbers 0–{room.settings.maxNumber}</span>
        </div>
      </div>
      <div className="game-layout">
        <aside className="scoreboard">
          <div className="sidebar-title">
            <Trophy size={17} />
            <h3>The standings</h3>
          </div>
          {[...room.players]
            .sort((a, b) => b.total - a.total)
            .map((p, i) => (
              <div
                className={`standing ${p.id === profile.id ? 'self' : ''} ${p.id === actorId && !roundOver ? 'current' : ''}`}
                key={p.id}
              >
                <div className="standing-main">
                  <span className="rank">{i + 1}</span>
                  <Avatar player={p} host={p.id === room.hostId} />
                  <div>
                    <strong>
                      {p.name}
                      {p.id === profile.id && <small> You</small>}
                    </strong>
                    <span>
                      {p.bot
                        ? 'Practice crew'
                        : !p.connected
                          ? 'Reconnecting'
                          : p.id === actorId && !roundOver
                            ? 'Thinking…'
                            : p.status === 'busted'
                              ? 'Busted this round'
                              : p.status === 'banked'
                                ? 'Points banked'
                                : 'At the table'}
                    </span>
                  </div>
                  <b>{p.total}</b>
                </div>
                <div className="score-progress">
                  <i style={{ width: `${Math.min(100, p.total / 2)}%` }} />
                </div>
              </div>
            ))}
          <div className="scoreboard-note">
            <Flag size={15} />
            <p>
              {room.settings.endMode === 'seven'
                ? '200 points and seven unfrozen numbers in the finishing round.'
                : 'Highest total of 200 or more wins at the end of a round.'}
            </p>
          </div>
          <button className="text-button" onClick={onRules}>
            Need a rule refresher? <ArrowUpRight size={14} />
          </button>
        </aside>
        <section className="table-center">
          {roundOver ? (
            <div className={`round-result ${room.phase === 'finished' ? 'finished' : ''}`}>
              <div className="result-symbol">
                {room.phase === 'finished' ? <Trophy size={30} /> : <Flag size={26} />}
                <Sunburst />
              </div>
              <span className="eyebrow">
                {room.phase === 'finished'
                  ? 'TAKE A BOW'
                  : room.tied
                    ? 'TOO CLOSE TO CALL'
                    : 'THAT’S A ROUND'}
              </span>
              <h2>
                {room.phase === 'finished'
                  ? `${winner?.name} takes the table.`
                  : room.tied
                    ? 'A tie. Of course we play again.'
                    : 'Some luck. Some good decisions.'}
              </h2>
              <p>
                {room.phase === 'finished'
                  ? `${winner?.total} points. Bragging rights included.`
                  : 'The points are safe. The next hand is a fresh start.'}
              </p>
              <div className="round-score-list">
                {[...room.players]
                  .sort((a, b) => b.roundScore - a.roundScore)
                  .map((p) => (
                    <div key={p.id}>
                      <Avatar player={p} />
                      <strong>{p.name}</strong>
                      <span>
                        {p.status === 'busted'
                          ? 'Busted'
                          : p.roulette === 0
                            ? 'Roulette ×0'
                            : p.roulette === 2
                              ? 'Roulette ×2'
                              : p.qualified
                                ? 'Seven qualified'
                                : 'Banked'}
                      </span>
                      <b>+{p.roundScore}</b>
                      <small>{p.total} total</small>
                    </div>
                  ))}
              </div>
              {host ? (
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => void send(room.phase === 'finished' ? 'rematch' : 'next-round')}
                >
                  {room.phase === 'finished'
                    ? 'Just one more? Play again'
                    : `Deal round ${room.round + 1}`}
                  <ArrowRight size={18} />
                </button>
              ) : (
                <p className="waiting-note">
                  <LoaderCircle size={15} className="spin" /> Waiting for the host to{' '}
                  {room.phase === 'finished' ? 'set up a rematch' : 'deal the next round'}.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className={`turn-banner ${mine ? 'your-turn' : ''}`} role="status">
                <span className="turn-orb">
                  {mine ? <Sparkles size={17} /> : <LoaderCircle size={17} className="spin-slow" />}
                </span>
                <div>
                  <strong>
                    {mine
                      ? room.prompt?.kind === 'guess'
                        ? 'Call your shot.'
                        : room.prompt?.kind === 'target'
                          ? 'Who gets the surprise?'
                          : room.prompt?.kind === 'bank'
                            ? 'Last call. Bank or take a chance.'
                            : 'Your move. Feeling lucky?'
                      : `${actor?.name ?? 'The table'} is ${room.prompt?.kind === 'guess' ? 'making a prediction' : room.prompt?.kind === 'target' ? 'choosing a player' : 'up next'}…`}
                  </strong>
                  <span>
                    {mine
                      ? room.prompt?.kind === 'guess'
                        ? 'Guess the exact value of your next numbered card.'
                        : room.prompt?.kind === 'target'
                          ? `Choose any active player for ${room.prompt.effect === 'prediction' ? 'Prediction' : 'Flip Three'}.`
                          : room.ending
                            ? 'The round is ending. Make your final choice.'
                            : 'Draw another card, or keep what you’ve earned.'
                      : actor?.bot
                        ? 'Your practice crew is thinking it over.'
                        : !actor?.connected
                          ? 'Disconnected players make an automatic choice after 30 seconds.'
                          : 'Good things come to those who wait.'}
                  </span>
                </div>
              </div>
              <div className="opponents">
                {room.players
                  .filter((p) => p.id !== profile.id)
                  .map((p) => (
                    <Opponent key={p.id} player={p} current={p.id === actorId} />
                  ))}
              </div>
            </>
          )}
          <div className="your-hand">
            <div className="hand-heading">
              <div className="hand-player">
                <Avatar player={me} />
                <div>
                  <h3>
                    Your hand <span>{me.name}</span>
                  </h3>
                  <PlayerStatus player={me} />
                </div>
              </div>
              <div className="hand-score">
                <strong>{me.status === 'banked' ? me.roundScore : score.subtotal}</strong>
                <span>{me.status === 'banked' ? 'banked' : 'round points'}</span>
              </div>
            </div>
            <div className="hand-cards">
              {me.hand.length ? (
                me.hand.map((c) => <PlayingCard key={c.id} card={c} />)
              ) : (
                <div className="empty-hand">Your first card is on its way.</div>
              )}
              {me.predictionMultiplier > 1 && (
                <div className="multiplier-token">
                  <Eye size={22} />
                  <strong>×{me.predictionMultiplier}</strong>
                  <span>Prediction</span>
                </div>
              )}
            </div>
            <div className="hand-bottom">
              <div className="count-milestone">
                <span>
                  {score.count} unfrozen number{score.count !== 1 ? 's' : ''}
                </span>
                <div className="count-dots" aria-label={`${score.count} of 10 unfrozen numbers`}>
                  {Array.from({ length: 10 }, (_, i) => (
                    <i
                      key={i}
                      className={`${i < score.count ? 'filled' : ''} ${i >= 6 ? 'bonus-dot' : ''}`}
                    />
                  ))}
                </div>
              </div>
              <span className="bonus-hint">
                {score.count < 7
                  ? `${7 - score.count} more to your +15 bonus`
                  : `+${score.countBonus} hand bonus`}
              </span>
            </div>
            {mine && (
              <div className="action-area">
                {room.prompt?.kind === 'target' ? (
                  <div className="target-options">
                    {room.players
                      .filter((p) => p.status === 'active')
                      .map((p) => (
                        <button
                          className="button secondary"
                          key={p.id}
                          disabled={busy}
                          onClick={() => void action({ type: 'target', targetId: p.id })}
                        >
                          <Avatar player={p} />
                          {p.id === profile.id ? 'Myself' : p.name}
                          <ArrowRight size={15} />
                        </button>
                      ))}
                  </div>
                ) : room.prompt?.kind === 'guess' ? (
                  <div className="guess-area">
                    <div className="guess-grid">
                      {Array.from({ length: room.settings.maxNumber + 1 }, (_, n) => (
                        <button
                          key={n}
                          className={guess === n ? 'chosen' : ''}
                          aria-pressed={guess === n}
                          disabled={busy}
                          onClick={() => setGuess(n)}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <button
                      className="button primary full"
                      disabled={busy || guess === null}
                      onClick={() => void action({ type: 'guess', value: guess })}
                    >
                      <Eye size={17} /> Predict {guess ?? 'a number'} & reveal
                    </button>
                  </div>
                ) : (
                  <div className="game-actions">
                    {!room.ending && (
                      <button
                        className="button primary draw-button"
                        disabled={busy}
                        onClick={() => void action({ type: 'draw' })}
                      >
                        <Plus size={19} /> Just one more <span>Draw a card</span>
                      </button>
                    )}
                    <button
                      className="button secondary bank-button"
                      disabled={busy}
                      onClick={() => void action({ type: 'bank', roulette: false })}
                    >
                      <Check size={19} /> Bank {score.subtotal}
                      <span>Play it safe</span>
                    </button>
                    <button
                      className="button roulette-button"
                      disabled={busy}
                      onClick={() => setRoulette(true)}
                    >
                      <Dices size={20} /> Roulette<span>Double or nothing</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="score-explainer">
            <span>
              <strong>{score.numberSum}</strong> numbers
            </span>
            <b>×</b>
            <span>
              <strong>{score.multiplier}</strong> multiplier
            </span>
            <b>+</b>
            <span>
              <strong>{score.flatBonus}</strong> point cards
            </span>
            <b>+</b>
            <span>
              <strong>{score.comboBonus}</strong> combos
            </span>
            <b>+</b>
            <span>
              <strong>{score.countBonus}</strong> hand bonus
            </span>
          </div>
          {score.combos.length > 0 && (
            <div className="combo-message">
              <Sparkles size={14} /> {score.combos.join(' and ')} — a very good combination.
            </div>
          )}
        </section>
        <aside className="activity-panel">
          <div className="activity-tabs">
            <button
              className={activityTab === 'activity' ? 'active' : ''}
              onClick={() => setActivityTab('activity')}
            >
              Table talk
            </button>
            <button
              className={activityTab === 'rounds' ? 'active' : ''}
              onClick={() => setActivityTab('rounds')}
            >
              Rounds
            </button>
          </div>
          {activityTab === 'activity' ? (
            <>
              <div
                className="event-feed"
                ref={activity}
                role="log"
                aria-label="Table activity"
                aria-live="polite"
                aria-relevant="additions"
              >
                {room.events.map((event) => (
                  <div key={event.id} className={`game-event ${event.type}`}>
                    <span className="event-dot">
                      {event.type === 'bust' ? (
                        <X size={12} />
                      ) : event.type === 'bank' ? (
                        <Check size={12} />
                      ) : event.type === 'special' ? (
                        <Sparkles size={12} />
                      ) : event.type === 'win' ? (
                        <Trophy size={12} />
                      ) : (
                        <i />
                      )}
                    </span>
                    <p>{event.text}</p>
                  </div>
                ))}
              </div>
              <form
                className="chat-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (chat.trim()) {
                    void send('chat', { message: chat.trim() });
                    setChat('');
                  }
                }}
              >
                <input
                  value={chat}
                  maxLength={140}
                  aria-label="Message your table"
                  onChange={(e) => setChat(e.target.value)}
                  placeholder="A little table talk…"
                />
                <button aria-label="Send message" disabled={busy || !chat.trim()}>
                  <Send size={16} />
                </button>
              </form>
            </>
          ) : (
            <div className="round-history">
              {room.history.length ? (
                [...room.history].reverse().map((r) => (
                  <details key={r.round} open={r.round === room.history.at(-1)?.round}>
                    <summary>Round {r.round}</summary>
                    {r.scores.map((s) => (
                      <div key={s.id}>
                        <span>{s.name}</span>
                        <b>+{s.score}</b>
                      </div>
                    ))}
                  </details>
                ))
              ) : (
                <div className="history-empty">
                  <Layers3 size={26} />
                  <p>
                    The story starts here.
                    <br />
                    Finished rounds appear here.
                  </p>
                </div>
              )}
            </div>
          )}
          <div className="activity-footer">
            <ShieldCheck size={13} /> Every card, same for everyone.
          </div>
        </aside>
      </div>
      {roulette && mine && (
        <Modal
          title="Feeling twice as lucky?"
          subtitle="One spin. Your whole round on the line."
          onClose={() => setRoulette(false)}
        >
          <div className="roulette-visual">
            <div className="roulette-half zero">
              <span>50%</span>
              <strong>×0</strong>
              <span>0 points</span>
            </div>
            <div className="roulette-half twice">
              <span>50%</span>
              <strong>×2</strong>
              <span>{score.subtotal * 2} points</span>
            </div>
            <span className="roulette-center">
              <Dices size={26} />
            </span>
          </div>
          <p className="roulette-note">
            Bank safely for <strong>{score.subtotal} points</strong>, or take an equal chance at
            double or nothing.
            {score.count >= 7 &&
              room.settings.endMode === 'seven' &&
              ' A loss also removes your seven-card qualification.'}
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => {
                setRoulette(false);
                void action({ type: 'bank', roulette: false });
              }}
            >
              Bank {score.subtotal}
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={() => {
                setRoulette(false);
                void action({ type: 'bank', roulette: true });
              }}
            >
              Spin & bank <Dices size={18} />
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function Opponent({ player, current }: { player: Player; current: boolean }) {
  const score = scoreHand(player);
  return (
    <article
      className={`opponent ${current ? 'current' : ''} ${player.status === 'busted' ? 'busted' : ''}`}
    >
      <div className="opponent-heading">
        <Avatar player={player} />
        <div>
          <strong>
            {player.name}
            {player.bot && <Bot size={11} />}
          </strong>
          <PlayerStatus player={player} />
        </div>
        <b>
          {player.status === 'banked' ? player.roundScore : score.subtotal}
          <small>pts</small>
        </b>
      </div>
      <div className="opponent-cards">
        {player.hand.map((c) => (
          <PlayingCard card={c} small key={c.id} />
        ))}
        {!player.hand.length && <span className="muted-text">Waiting for a card…</span>}
      </div>
      {player.predictionMultiplier > 1 && (
        <span className="mini-multiplier">×{player.predictionMultiplier} prediction</span>
      )}
    </article>
  );
}
