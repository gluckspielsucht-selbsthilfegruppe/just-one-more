import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  DoorOpen,
  Gamepad2,
  Hash,
  Headphones,
  LoaderCircle,
  LockKeyhole,
  Palette,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  WifiOff,
  X,
} from 'lucide-react';
import type { Profile, PublicRoom, RoomSettings } from '../shared/types';
import { DEFAULT_SETTINGS, COLORS } from '../shared/engine';
import { api, useGame } from './useGame';
import { Avatar, HeroCards, Mark, Modal, Sunburst } from './components/ui';
import { Rules } from './components/Rules';
import { Lobby, Table } from './components/Table';
import { AppearanceDialog, AppearancePicker } from './components/Appearance';
import { APPEARANCES, readCachedAppearance } from './appearance';
import { useGameAudio } from './useGameAudio';
import { AudioControls } from './components/AudioControls';

type ModalName =
  'create' | 'join' | 'rules' | 'profile' | 'settings' | 'leave' | 'appearance' | 'audio' | null;
export type Command = (type: string, payload?: Record<string, unknown>) => Promise<void>;
export default function App() {
  const game = useGame();
  const [modal, setModal] = useState<ModalName>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [appearanceError, setAppearanceError] = useState('');
  const [roomFilter, setRoomFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('play');
  const inviteHandled = useRef(false);
  const lastEvent = useRef('');
  const room = game.room;
  const [initialAppearance] = useState(readCachedAppearance);
  const appearance = game.profile?.appearance ?? initialAppearance;
  const hackathonMode = Boolean(room?.reversed);
  const appearanceName = hackathonMode
    ? 'AI Hackathon'
    : APPEARANCES.find((a) => a.id === appearance)!.name;
  const audio = useGameAudio(appearance);
  const sound = audio.settings.effects;
  useEffect(() => {
    document.documentElement.dataset.appearance = hackathonMode ? 'hackathon' : appearance;
    try {
      localStorage.setItem('jom-appearance', appearance);
    } catch {
      /* The server still saves the choice. */
    }
  }, [appearance, hackathonMode]);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [room?.code, room?.round, room?.phase, tab]);
  const notify = (message: string) => setToast(message);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (game.connection !== 'connected' || !game.profile || inviteHandled.current) return;
    inviteHandled.current = true;
    const code = new URLSearchParams(location.search).get('room');
    if (code && !game.room)
      void game.command('join', { code }).catch((e) => {
        notify(e.message);
        history.replaceState(null, '', location.pathname);
      });
  }, [game.connection, game.profile]);
  useEffect(() => {
    if (room) history.replaceState(null, '', `?room=${room.code}`);
    else if (inviteHandled.current) history.replaceState(null, '', location.pathname);
    document.title = room
      ? `${room.name} — Just One More`
      : 'Just One More — A little luck. A lot of nerve.';
  }, [room?.code]);
  useEffect(() => {
    if (!room) {
      lastEvent.current = '';
      return;
    }
    const key = `${room.gameId}:${room.code}`;
    const [previousKey, previousSequence] = lastEvent.current.split('|');
    lastEvent.current = `${key}|${room.eventSequence}`;
    if (previousKey !== key) return;
    const fresh = room.events.filter((e) => e.id > Number(previousSequence));
    // The wheel reveals its own outcome after the spin, including a game-ending bank.
    if (fresh.some((e) => e.text.includes('took roulette'))) return;
    if (fresh.some((e) => e.moment === 'hackathon')) {
      audio.play('hackathon');
      return;
    }
    const event =
      fresh.find((e) => e.type === 'win') ?? fresh.find((e) => e.type === 'bust') ?? fresh.at(-1);
    if (event && event.type !== 'info') audio.play(event.type);
  }, [room?.gameId, room?.code, room?.eventSequence, audio.play]);
  async function perform(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  const send: Command = (type, payload) => perform(() => game.command(type, payload));
  async function saveAppearance(next: Profile['appearance']) {
    if (busy || !game.profile) return;
    setBusy(true);
    setAppearanceError('');
    try {
      await api('profile', {
        name: game.profile.name,
        color: game.profile.color,
        theme: game.profile.theme,
        appearance: next,
      });
      notify(`${APPEARANCES.find((a) => a.id === next)!.name} saved. Make yourself at home.`);
    } catch (error) {
      setAppearanceError(
        error instanceof Error ? error.message : 'Could not save your theme. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function practice() {
    await game.command('create', {
      name: 'A little practice',
      settings: { ...DEFAULT_SETTINGS, isPublic: false },
    });
    for (let i = 0; i < 3; i++) await game.command('add-bot');
    await game.command('start');
  }
  function toggleSound() {
    audio.update({ effects: !sound });
  }
  const online = game.connection === 'connected';
  const filteredRooms = game.rooms.filter(
    (r) =>
      (roomFilter === 'all' ||
        (roomFilter === 'waiting' ? r.phase === 'lobby' : r.phase !== 'lobby')) &&
      `${r.name} ${r.code} ${r.hostName}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div
      className={`app appearance-${hackathonMode ? 'hackathon' : appearance} theme-${hackathonMode ? 'hackathon' : (game.profile?.theme ?? 'classic')}`}
    >
      <aside className="rail">
        <a
          href="/"
          className="rail-logo"
          aria-label="Just One More home"
          onClick={(e) => {
            e.preventDefault();
            if (room) setModal('leave');
            else setTab('play');
          }}
        >
          <Mark />
        </a>
        <div className="rail-nav">
          <button
            className={`rail-button ${tab === 'play' ? 'selected' : ''}`}
            title="Play"
            aria-label="Play"
            onClick={() => setTab('play')}
          >
            <Gamepad2 size={23} />
          </button>
          <button
            className={`rail-button ${tab === 'stats' ? 'selected' : ''}`}
            title="Your stats"
            aria-label="Your stats"
            onClick={() => setTab('stats')}
          >
            <Trophy size={21} />
          </button>
          <button
            className="rail-button"
            title="How to play"
            aria-label="How to play"
            onClick={() => setModal('rules')}
          >
            <BookOpen size={21} />
          </button>
        </div>
        <div className="rail-bottom">
          <button
            className="rail-button"
            title="Choose app theme"
            aria-label="Choose app theme"
            disabled={!game.profile}
            onClick={() => setModal('appearance')}
          >
            <Palette size={21} />
          </button>
          <button
            className="rail-button"
            title={sound ? 'Mute game effects' : 'Enable game effects'}
            aria-label={sound ? 'Mute game effects' : 'Enable game effects'}
            onClick={toggleSound}
          >
            {sound ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button
            className="rail-button"
            aria-label="Help and rules"
            title="Help and rules"
            onClick={() => setModal('rules')}
          >
            <CircleHelp size={21} />
          </button>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <a
            className="wordmark"
            href="/"
            onClick={(e) => {
              e.preventDefault();
              if (room) setModal('leave');
              else setTab('play');
            }}
          >
            just one more<span>®</span>
          </a>
          <nav aria-label="Main navigation">
            <button className={tab === 'play' ? 'active' : ''} onClick={() => setTab('play')}>
              Let’s play
            </button>
            <button onClick={() => setModal('rules')}>
              How to play <ArrowUpRight size={13} />
            </button>
            <button className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}>
              Your stats
            </button>
          </nav>
          <button
            className="appearance-trigger"
            onClick={() => setModal('appearance')}
            aria-label={`Choose app theme, current theme: ${appearanceName}`}
            disabled={!game.profile}
          >
            <Palette size={17} />
            <span>{appearanceName}</span>
          </button>
          <button
            className={`audio-trigger ${audio.settings.music && audio.unlocked ? 'playing' : ''}`}
            aria-label="Music and sound settings"
            title="Music and sound"
            onClick={() => setModal('audio')}
          >
            <Headphones size={18} />
            <span className="mini-equalizer" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </button>
          <button className="profile-button" onClick={() => setModal('profile')}>
            <Avatar player={game.profile ?? { name: '?', color: 'sage' }} />
            <span>{game.profile?.name ?? 'Getting ready…'}</span>
            <ChevronDown size={14} />
          </button>
        </header>
        {!online && (
          <div className="connection-banner" role="status">
            {game.connection === 'offline' ? (
              <WifiOff size={16} />
            ) : (
              <LoaderCircle size={16} className="spin" />
            )}
            {game.connection === 'offline'
              ? 'Reconnecting… Your seat and game are saved.'
              : 'Pulling up a chair…'}
            {game.error && <span>{game.error}</span>}
          </div>
        )}
        <main className={room && tab === 'play' ? 'main-content in-room' : 'main-content'}>
          {tab === 'stats' ? (
            <Stats
              profile={game.profile}
              onPlay={() => setTab('play')}
              onProfile={() => setModal('profile')}
            />
          ) : room && game.profile ? (
            <>
              <div className="room-topline">
                <button className="text-button muted" onClick={() => setModal('leave')}>
                  <DoorOpen size={16} /> Leave table
                </button>
                <div className="room-tools">
                  <span className="live-label">
                    <i /> Live table
                  </span>
                  <button className="text-button" onClick={() => setModal('rules')}>
                    <BookOpen size={15} /> Rules
                  </button>
                  {room.phase === 'lobby' && room.hostId === game.profile.id && (
                    <button
                      className="icon-button"
                      aria-label="Table settings"
                      onClick={() => setModal('settings')}
                    >
                      <Settings2 size={17} />
                    </button>
                  )}
                </div>
              </div>
              {room.phase === 'lobby' ? (
                <Lobby
                  room={room}
                  profile={game.profile}
                  send={send}
                  busy={busy || !online}
                  notify={notify}
                />
              ) : (
                <Table
                  room={room}
                  profile={game.profile}
                  send={send}
                  busy={busy || !online}
                  onRules={() => setModal('rules')}
                  onSpin={() =>
                    game.command('action', { action: { type: 'bank', roulette: true } })
                  }
                  playSound={audio.play}
                />
              )}
            </>
          ) : (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <div className="eyebrow">
                    <span className="tiny-line" /> GOOD CARDS. GREAT COMPANY.
                  </div>
                  <h1>
                    {appearance === 'neon' ? (
                      <>
                        Feeling
                        <br />
                        <span>lucky?</span>
                      </>
                    ) : appearance === 'pop' ? (
                      <>
                        One more?
                        <br />
                        <span>Oh, go on.</span>
                      </>
                    ) : (
                      <>
                        A little luck.
                        <br />A lot of <span>nerve.</span>
                      </>
                    )}
                  </h1>
                  <p>
                    Draw a card. Push your luck. Know when to stop.
                    <br className="desktop-break" /> Your next favorite game night starts here.
                  </p>
                  <div className="hero-actions">
                    <button
                      className="button primary"
                      disabled={!online || busy}
                      onClick={() => setModal('create')}
                    >
                      <Plus size={19} /> Create a table <ArrowUpRight size={18} />
                    </button>
                    <button
                      className="button secondary"
                      disabled={!online || busy}
                      onClick={() => setModal('join')}
                    >
                      <Hash size={18} /> Join with a code
                    </button>
                  </div>
                  <div className="hero-footnote">
                    <span>
                      <Users size={14} /> 2–8 players
                    </span>
                    <i />
                    <span>
                      <Clock3 size={14} /> 15–30 min
                    </span>
                    <i />
                    <span>No account needed</span>
                  </div>
                </div>
                <HeroCards />
              </section>
              <section className="tables-section" id="tables">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">THERE’S ROOM FOR ONE MORE</span>
                    <h2>
                      Find your table <span className="count-badge">{game.rooms.length}</span>
                    </h2>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setModal('create')}
                    disabled={!online}
                  >
                    <Plus size={16} /> Create a table
                  </button>
                </div>
                <div className="table-filters">
                  <div className="segmented" role="group" aria-label="Filter tables">
                    {[
                      ['all', 'All tables'],
                      ['waiting', 'Waiting for players'],
                      ['playing', 'In progress'],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        className={roomFilter === key ? 'active' : ''}
                        onClick={() => setRoomFilter(key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <label className="search-input">
                    <Search size={16} />
                    <input
                      aria-label="Search tables"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Find a table…"
                    />
                  </label>
                </div>
                {filteredRooms.length ? (
                  <div className="room-grid">
                    {filteredRooms.map((r, i) => (
                      <article className="room-card" key={r.code}>
                        <div className="room-card-top">
                          <div className={`table-icon ${['sage', 'lavender', 'butter'][i % 3]}`}>
                            <Gamepad2 size={22} />
                          </div>
                          <span className={`pill ${r.phase === 'lobby' ? 'green' : 'neutral'}`}>
                            <i />
                            {r.phase === 'lobby' ? 'Waiting for players' : `Round ${r.round}`}
                          </span>
                        </div>
                        <h3>{r.name}</h3>
                        <p>Hosted by {r.hostName}</p>
                        <div className="room-meta">
                          <span>
                            <Users size={14} /> {r.players}/{r.maxPlayers} players
                          </span>
                          <span>0–{r.settings.maxNumber}</span>
                          <span>
                            {r.settings.endMode === 'seven' ? '200 + seven' : '200 points'}
                          </span>
                        </div>
                        <button
                          className="button room-join"
                          disabled={
                            !online || busy || r.phase !== 'lobby' || r.players >= r.maxPlayers
                          }
                          onClick={() => void send('join', { code: r.code })}
                        >
                          {r.phase !== 'lobby'
                            ? 'Game in progress'
                            : r.players >= r.maxPlayers
                              ? 'Table is full'
                              : 'Pull up a chair'}
                          <ArrowUpRight size={17} />
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-tables">
                    <div className="empty-illustration">
                      <span />
                      <span />
                      <Users size={25} />
                    </div>
                    <div>
                      <h3>
                        {search
                          ? 'No tables match that search.'
                          : roomFilter === 'playing'
                            ? 'No games in progress. Yet.'
                            : 'The best tables start with you.'}
                      </h3>
                      <p>
                        {search
                          ? 'Try another name or join with an invite code.'
                          : 'Open a table, invite your people, and deal them in.'}
                      </p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setModal(search ? 'join' : 'create')}
                    >
                      {search ? 'Join with a code' : 'Make the first move'}
                      <ArrowRight size={17} />
                    </button>
                  </div>
                )}
              </section>
              <section className="bottom-panels">
                <article className="learn-panel">
                  <div className="panel-icon">
                    <BookOpen size={23} />
                  </div>
                  <div>
                    <span className="eyebrow">SMALL RULEBOOK. BIG DECISIONS.</span>
                    <h3>
                      A minute to learn.
                      <br />
                      “One more” to master.
                    </h3>
                    <p>
                      Bank your points or risk the next card.
                      <br />
                      We’ll show you the rest.
                    </p>
                    <button className="text-button" onClick={() => setModal('rules')}>
                      Learn how to play <ArrowUpRight size={17} />
                    </button>
                  </div>
                  <Sunburst className="learn-sun" />
                </article>
                <article className="practice-panel">
                  <div className="panel-icon">
                    <Sparkles size={23} />
                  </div>
                  <div>
                    <span className="eyebrow">NO NEED TO WAIT FOR THE GROUP CHAT</span>
                    <h3>Meet your practice crew.</h3>
                    <p>
                      Take a seat with three friendly bots.
                      <br />
                      Same game. Zero pressure.
                    </p>
                    <button
                      className="button secondary"
                      disabled={!online || busy}
                      onClick={() => void perform(practice)}
                    >
                      {busy ? <LoaderCircle className="spin" size={16} /> : <Gamepad2 size={17} />}{' '}
                      Play a practice game <ArrowUpRight size={16} />
                    </button>
                  </div>
                  <div className="practice-avatars">
                    <Avatar player={{ name: 'Cleo', color: 'sage', bot: true }} />
                    <Avatar player={{ name: 'Felix', color: 'lavender', bot: true }} />
                    <Avatar player={{ name: 'Milo', color: 'gold', bot: true }} />
                  </div>
                </article>
              </section>
            </>
          )}
        </main>
        <footer className="footer">
          <span>Made for the “okay, last one” kind of people.</span>
          <span>
            <span className={`connection-dot ${online ? '' : 'offline'}`} />
            {online ? 'All systems ready to play' : 'Connecting to the table'}
            <span className="footer-dot">·</span> Just One More © 2026
          </span>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="alert">
          <span>{toast}</span>
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            <X size={17} />
          </button>
        </div>
      )}
      {modal === 'rules' && <Rules onClose={() => setModal(null)} />}
      {modal === 'audio' && <AudioControls audio={audio} onClose={() => setModal(null)} />}
      {modal === 'appearance' && game.profile && (
        <AppearanceDialog
          value={appearance}
          hackathonMode={hackathonMode}
          busy={busy}
          error={appearanceError}
          onClose={() => {
            setAppearanceError('');
            setModal(null);
          }}
          onChange={(next) => void saveAppearance(next)}
        />
      )}
      {modal === 'create' && game.profile && (
        <CreateTable
          profile={game.profile}
          busy={busy}
          onClose={() => setModal(null)}
          onCreate={(name, nickname, settings) =>
            void perform(async () => {
              await api('profile', {
                name: nickname,
                color: game.profile!.color,
                theme: game.profile!.theme,
              });
              await game.command('create', { name, settings });
              setModal(null);
            })
          }
        />
      )}
      {modal === 'join' && game.profile && (
        <JoinTable
          profile={game.profile}
          busy={busy}
          onClose={() => setModal(null)}
          onJoin={(code, name) =>
            void perform(async () => {
              await api('profile', {
                name,
                color: game.profile!.color,
                theme: game.profile!.theme,
              });
              await game.command('join', { code });
              setModal(null);
            })
          }
        />
      )}
      {modal === 'profile' && game.profile && (
        <ProfileDialog
          profile={game.profile}
          inRoom={!!room}
          hackathonMode={hackathonMode}
          onClose={() => setModal(null)}
          notify={notify}
          reload={game.reload}
          sound={sound}
          toggleSound={toggleSound}
          onStats={() => {
            setModal(null);
            setTab('stats');
          }}
        />
      )}
      {modal === 'settings' && room && (
        <SettingsDialog
          room={room}
          busy={busy}
          onClose={() => setModal(null)}
          onSave={(settings) =>
            void perform(async () => {
              await game.command('settings', { settings });
              setModal(null);
            })
          }
        />
      )}
      {modal === 'leave' && room && (
        <Modal
          title="Heading out?"
          subtitle={
            room.phase === 'playing' || room.phase === 'round-end'
              ? 'The table keeps playing. Your unfinished turns will be handled automatically.'
              : 'You can always pull up another chair.'
          }
          onClose={() => setModal(null)}
        >
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setModal(null)}>
              Stay a little longer
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={() =>
                void perform(async () => {
                  await game.command('leave');
                  setModal(null);
                })
              }
            >
              Leave table <DoorOpen size={17} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SettingsFields({
  settings,
  setSettings,
}: {
  settings: RoomSettings;
  setSettings: (s: RoomSettings) => void;
}) {
  return (
    <>
      <div className="form-field">
        <label>
          Number range <span>Higher numbers, bigger possibilities.</span>
        </label>
        <div className="option-grid">
          {[12, 13, 14, 15].map((n) => (
            <button
              type="button"
              key={n}
              className={`option ${settings.maxNumber === n ? 'chosen' : ''}`}
              onClick={() =>
                setSettings({ ...settings, maxNumber: n as RoomSettings['maxNumber'] })
              }
            >
              0–{n}
              {settings.maxNumber === n && <Check size={14} />}
            </button>
          ))}
        </div>
      </div>
      <div className="form-field">
        <label>How do we win?</label>
        <div className="mode-options">
          <button
            type="button"
            className={`mode-option ${settings.endMode === 'points' ? 'chosen' : ''}`}
            onClick={() => setSettings({ ...settings, endMode: 'points' })}
          >
            <Trophy size={21} />
            <strong>Race to 200</strong>
            <span>Reach 200 points. Highest score wins.</span>
          </button>
          <button
            type="button"
            className={`mode-option ${settings.endMode === 'seven' ? 'chosen' : ''}`}
            onClick={() => setSettings({ ...settings, endMode: 'seven' })}
          >
            <Sparkles size={21} />
            <strong>200 + seven</strong>
            <span>Also bank seven numbers in the final round.</span>
          </button>
        </div>
      </div>
      <div className="form-row">
        <label className="form-field">
          Seats at the table
          <select
            value={settings.maxPlayers}
            onChange={(e) => setSettings({ ...settings, maxPlayers: Number(e.target.value) })}
          >
            {[2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n} players
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          Who can find it?
          <select
            value={settings.isPublic ? 'public' : 'private'}
            onChange={(e) => setSettings({ ...settings, isPublic: e.target.value === 'public' })}
          >
            <option value="public">Public table</option>
            <option value="private">Invite only</option>
          </select>
        </label>
      </div>
    </>
  );
}
function CreateTable({
  profile,
  busy,
  onClose,
  onCreate,
}: {
  profile: Profile;
  busy: boolean;
  onClose: () => void;
  onCreate: (name: string, nickname: string, settings: RoomSettings) => void;
}) {
  const [name, setName] = useState('The good company club');
  const [nickname, setNickname] = useState(profile.name.startsWith('Guest ') ? '' : profile.name);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  return (
    <Modal
      title="Make room for good company."
      subtitle="Your table, your rules. Invite friends once you’re in."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onCreate(name.trim(), nickname.trim(), settings);
        }}
      >
        <div className="form-row">
          <label className="form-field">
            Your nickname
            <input
              autoFocus
              required
              minLength={2}
              maxLength={18}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. Alex"
            />
          </label>
          <label className="form-field">
            Table name
            <input
              required
              minLength={2}
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        </div>
        <SettingsFields settings={settings} setSettings={setSettings} />
        <div className="form-note">
          <LockKeyhole size={14} />{' '}
          {settings.isPublic
            ? 'Anyone on this server can find and join your table.'
            : 'Only people with your room code can join.'}
        </div>
        <button className="button primary full" disabled={busy}>
          {busy ? <LoaderCircle className="spin" size={18} /> : <Plus size={18} />} Create your
          table <ArrowUpRight size={18} />
        </button>
      </form>
    </Modal>
  );
}
function JoinTable({
  profile,
  busy,
  onClose,
  onJoin,
}: {
  profile: Profile;
  busy: boolean;
  onClose: () => void;
  onJoin: (code: string, name: string) => void;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState(profile.name.startsWith('Guest ') ? '' : profile.name);
  return (
    <Modal
      title="Your seat is waiting."
      subtitle="Ask your host for the five-character table code."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onJoin(code.trim().toUpperCase(), name.trim());
        }}
      >
        <label className="form-field">
          Your nickname
          <input
            required
            minLength={2}
            maxLength={18}
            value={name}
            placeholder="e.g. Alex"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="form-field">
          Table code
          <input
            autoFocus
            required
            className="code-input"
            autoCapitalize="characters"
            autoComplete="off"
            pattern="[A-Za-z2-9]{5}"
            maxLength={5}
            placeholder="ABCDE"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
        </label>
        <button className="button primary full" disabled={busy}>
          Pull up a chair <ArrowRight size={18} />
        </button>
      </form>
    </Modal>
  );
}
function SettingsDialog({
  room,
  busy,
  onClose,
  onSave,
}: {
  room: PublicRoom;
  busy: boolean;
  onClose: () => void;
  onSave: (s: RoomSettings) => void;
}) {
  const [settings, setSettings] = useState(room.settings);
  return (
    <Modal
      title="A table your way."
      subtitle="Changing the rules resets everyone’s ready status."
      onClose={onClose}
    >
      <SettingsFields settings={settings} setSettings={setSettings} />
      <button className="button primary full" disabled={busy} onClick={() => onSave(settings)}>
        Save table settings <Check size={17} />
      </button>
    </Modal>
  );
}
function ProfileDialog({
  profile,
  inRoom,
  hackathonMode,
  onClose,
  notify,
  reload,
  sound,
  toggleSound,
  onStats,
}: {
  profile: Profile;
  inRoom: boolean;
  hackathonMode: boolean;
  onClose: () => void;
  notify: (s: string) => void;
  reload: () => void;
  sound: boolean;
  toggleSound: () => void;
  onStats: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [color, setColor] = useState(profile.color);
  const [theme, setTheme] = useState(profile.theme);
  const [appearance, setAppearance] = useState(profile.appearance);
  const [busy, setBusy] = useState(false);
  const [auth, setAuth] = useState<'register' | 'login' | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        auth === 'register'
          ? 'Keep your lucky streak.'
          : auth === 'login'
            ? 'Welcome back.'
            : 'Make yourself at home.'
      }
      subtitle={
        auth
          ? 'Your account works on this Just One More server.'
          : profile.account
            ? 'Your account keeps your stats and style across devices.'
            : 'Play as a guest. Create an account whenever you like.'
      }
      onClose={onClose}
    >
      {auth ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await api(`auth/${auth}`, { username, password });
              reload();
              onClose();
              notify(
                auth === 'register'
                  ? 'Your account is ready. Deal yourself in.'
                  : 'Welcome back to the table.',
              );
            });
          }}
        >
          <label className="form-field">
            Username
            <input
              required
              minLength={3}
              maxLength={24}
              pattern="[a-zA-Z0-9_-]+"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label className="form-field">
            Password
            <input
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete={auth === 'register' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary full" disabled={busy}>
            {auth === 'register' ? 'Create account' : 'Sign in'}
            <ArrowRight size={16} />
          </button>
          <button type="button" className="text-button form-back" onClick={() => setAuth(null)}>
            Back to your profile
          </button>
        </form>
      ) : (
        <>
          <div className="profile-preview">
            <Avatar player={{ name, color }} size="large" />
            <div>
              <strong>{name || 'Your name'}</strong>
              <span>
                {profile.account ? 'Account player' : 'Guest player'} · {profile.stats.wins} wins
              </span>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await api('profile', { name, color, theme, appearance });
                notify('Looking good. Your profile is saved.');
                onClose();
              });
            }}
          >
            <label className="form-field">
              Your nickname
              <input
                required
                minLength={2}
                maxLength={18}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <div className="form-field">
              <label>Your color</label>
              <div className="color-picker">
                {COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    className={`color-swatch ${c} ${color === c ? 'chosen' : ''}`}
                    aria-label={`${c} avatar`}
                    aria-pressed={color === c}
                    onClick={() => setColor(c)}
                  >
                    {color === c && <Check size={18} />}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-field">
              <label>App theme</label>
              <AppearancePicker value={appearance} onChange={setAppearance} disabled={busy} />
            </div>
            <div className="form-field">
              <label>Card design</label>
              <div className="option-grid three">
                {(['classic', 'midnight', 'mint'] as const).map((t) => (
                  <button
                    type="button"
                    key={t}
                    className={`theme-option ${t} ${theme === t ? 'chosen' : ''}`}
                    onClick={() => setTheme(t)}
                    aria-pressed={theme === t}
                  >
                    <span>7</span>
                    {t === 'classic' ? 'Daydream' : t === 'midnight' ? 'After hours' : 'Fresh mint'}
                  </button>
                ))}
              </div>
            </div>
            {hackathonMode && (
              <p className="appearance-note">
                AI Hackathon sets the table’s look for this round. Your saved style returns next
                round.
              </p>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary full" disabled={busy}>
              Save your style <Check size={17} />
            </button>
          </form>
          <div className="auth-options">
            <button className="text-button" onClick={onStats}>
              <Trophy size={15} /> View your stats
            </button>
            <button className="text-button" onClick={toggleSound}>
              {sound ? <Volume2 size={15} /> : <VolumeX size={15} />} Game effects{' '}
              {sound ? 'on' : 'off'}
            </button>
          </div>
          {!inRoom && (
            <div className="auth-options">
              {profile.account ? (
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await api('logout', {});
                      reload();
                      onClose();
                    })
                  }
                >
                  Sign out <DoorOpen size={16} />
                </button>
              ) : (
                <>
                  <button className="text-button" onClick={() => setAuth('register')}>
                    Create an account <ArrowUpRight size={15} />
                  </button>
                  <button className="text-button muted" onClick={() => setAuth('login')}>
                    Already a regular? Sign in
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
function Stats({
  profile,
  onPlay,
  onProfile,
}: {
  profile: Profile | null;
  onPlay: () => void;
  onProfile: () => void;
}) {
  const stats = profile?.stats;
  return (
    <section className="stats-page">
      <span className="eyebrow">EVERY ROUND TELLS A STORY</span>
      <h1>Your time at the table.</h1>
      <p>Round stats update after every round. Games and wins count when a game finishes.</p>
      <div className="stats-grid">
        {[
          ['Games played', stats?.games ?? 0],
          ['Games won', stats?.wins ?? 0],
          ['Best total', stats?.bestScore ?? 0],
          ['Best round', stats?.bestRound ?? 0],
        ].map(([label, value]) => (
          <article key={label}>
            <Trophy size={19} />
            <strong>{value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </div>
      <div className="stats-note">
        <Sunburst />
        <h2>
          {stats?.rounds ? 'There’s always room for one more.' : 'Every streak starts somewhere.'}
        </h2>
        <p>
          {stats?.rounds
            ? `${stats.rounds} rounds played. Your next favorite hand is waiting.`
            : 'Finish a round and your stats will show up here.'}
        </p>
        <button className="button primary" onClick={onPlay}>
          Back to the tables <ArrowRight size={17} />
        </button>
        {!profile?.account && (
          <button className="text-button" onClick={onProfile}>
            Save your stats across devices <ArrowUpRight size={15} />
          </button>
        )}
      </div>
    </section>
  );
}
