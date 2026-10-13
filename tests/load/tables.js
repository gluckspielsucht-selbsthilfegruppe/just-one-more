// k6 load test: TABLES tables with four human players each, plus idle lobby clients.
// Start the server with TRUST_PROXY=loopback so each virtual player gets its own client IP
// (otherwise the per-IP rate limits stop the test). See docs/deployment.md#load-testing.
import { check, sleep } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';
import { Counter, Trend } from 'k6/metrics';
import { clearInterval, setInterval, setTimeout } from 'k6/timers';
import { WebSocket } from 'k6/websockets';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TABLES = Number(__ENV.TABLES || 10);
const LOBBY_CLIENTS = Number(__ENV.LOBBY_CLIENTS || 10);
const SECONDS = Number(__ENV.DURATION_SECONDS || 60);
const THINK_MS = Number(__ENV.THINK_MS || 400);
const RAMP_MS = Number(__ENV.RAMP_MS || 20);
const SEATS = 4;

export const options = {
  scenarios: {
    players: {
      executor: 'per-vu-iterations',
      exec: 'player',
      vus: TABLES * SEATS,
      iterations: 1,
      maxDuration: `${SECONDS + 60}s`,
    },
    lobby: {
      executor: 'per-vu-iterations',
      exec: 'lobby',
      vus: Math.max(1, LOBBY_CLIENTS),
      iterations: 1,
      maxDuration: `${SECONDS + 60}s`,
    },
  },
  thresholds: {
    command_latency: ['p(95)<250'],
    command_errors: ['count<10'],
    checks: ['rate>0.99'],
  },
};

const commandLatency = new Trend('command_latency', true);
const commandErrors = new Counter('command_errors');
const stateMessages = new Counter('state_messages');
const roomListMessages = new Counter('room_list_messages');
const commandsSent = new Counter('commands_sent');

function forwardedFor() {
  const id = exec.vu.idInTest;
  return `10.${(id >> 16) & 255}.${(id >> 8) & 255}.${id & 255}`;
}
function connect(name) {
  const headers = { 'Content-Type': 'application/json', 'X-Forwarded-For': forwardedFor() };
  const res = http.post(`${BASE_URL}/api/session`, JSON.stringify({ name }), { headers });
  if (!check(res, { 'guest created': (r) => r.status === 200 })) return null;
  const cookie = res.cookies.jom_session?.[0]?.value;
  const profile = res.json('profile');
  const ws = new WebSocket(`${BASE_URL.replace('http', 'ws')}/ws`, null, {
    headers: { Cookie: `jom_session=${cookie}`, Origin: BASE_URL, ...headers },
  });
  return { ws, userId: profile.id };
}

export function lobby() {
  if (!LOBBY_CLIENTS) return;
  sleep((exec.scenario.iterationInTest * RAMP_MS) / 1000);
  const client = connect(`Lobby ${exec.vu.idInTest % 1000}`);
  if (!client) return;
  const { ws } = client;
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'rooms') roomListMessages.add(1);
    if (msg.type === 'state') stateMessages.add(1);
  };
  setTimeout(() => ws.close(), SECONDS * 1000);
}

export function player() {
  // One iteration per VU, so the iteration number is a stable 0-based seat index.
  const vu = exec.scenario.iterationInTest;
  const table = Math.floor(vu / SEATS);
  const isHost = vu % SEATS === 0;
  const tableName = `Load ${table} ${exec.scenario.startTime % 100000}`;
  // Arrive gradually like real players; a burst also overflows macOS's small listen backlog.
  sleep((vu * RAMP_MS) / 1000);
  const client = connect(`Player ${vu}`);
  if (!client) return;
  const { ws, userId } = client;
  const pending = new Map();
  let room = null;
  let actedOn = -1;
  let thinking = false;
  let joining = false;

  function send(type, payload = {}) {
    // 1 = OPEN; k6's WebSocket class has no OPEN constant.
    if (ws.readyState !== 1) return;
    const id = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    pending.set(id, Date.now());
    commandsSent.add(1);
    ws.send(JSON.stringify({ id, type, payload, version: room?.version }));
  }
  function decide() {
    const me = room.players.find((p) => p.id === userId);
    if (room.phase === 'lobby') {
      if (!isHost) return me.ready ? null : ['ready'];
      const everyone = room.players.length === SEATS;
      return everyone && room.players.every((p) => p.id === userId || p.ready) ? ['start'] : null;
    }
    if (room.phase === 'round-end') return isHost ? ['next-round'] : null;
    if (room.phase === 'finished') return isHost ? ['rematch'] : null;
    const prompt = room.prompt;
    if ((prompt ? prompt.actorId : room.turnId) !== userId) return null;
    if (prompt?.kind === 'target') {
      const target = room.players.find((p) => p.id !== userId && p.status === 'active') ?? me;
      return ['action', { action: { type: 'target', targetId: target.id } }];
    }
    if (prompt?.kind === 'guess')
      return ['action', { action: { type: 'guess', value: room.settings.maxNumber } }];
    const bank = prompt?.kind === 'bank' || me.hand.length >= 3;
    return ['action', { action: bank ? { type: 'bank', roulette: false } : { type: 'draw' } }];
  }
  function act() {
    if (!room || thinking || room.version === actedOn || !decide()) return;
    thinking = true;
    setTimeout(
      () => {
        thinking = false;
        // Decide again: the table may have changed while "thinking".
        const next = room && room.version !== actedOn ? decide() : null;
        if (!next) return;
        actedOn = room.version;
        send(...next);
      },
      THINK_MS * (0.5 + Math.random()),
    );
  }
  function findTable(rooms) {
    if (room || joining || isHost) return;
    const target = rooms.find((r) => r.name === tableName && r.phase === 'lobby');
    if (!target || target.players >= SEATS) return;
    joining = true;
    send('join', { code: target.code });
  }

  ws.onopen = () => {
    if (isHost)
      send('create', {
        name: tableName,
        settings: { maxNumber: 12, endMode: 'points', isPublic: true, maxPlayers: SEATS },
      });
  };
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'state') {
      stateMessages.add(1);
      room = msg.room;
      if (room) joining = false;
      findTable(msg.rooms);
      act();
    } else if (msg.type === 'rooms') {
      roomListMessages.add(1);
      findTable(msg.rooms);
    } else if (msg.type === 'ack' || msg.type === 'error') {
      const sent = pending.get(msg.id);
      if (sent === undefined) return;
      pending.delete(msg.id);
      commandLatency.add(Date.now() - sent);
      if (msg.type === 'error') {
        commandErrors.add(1);
        joining = false;
        actedOn = -1;
      }
    }
  };
  const chatter = setInterval(() => {
    if (room) send('chat', { message: 'Just one more!' });
  }, 10000);
  setTimeout(() => {
    clearInterval(chatter);
    ws.close();
  }, SECONDS * 1000);
}
