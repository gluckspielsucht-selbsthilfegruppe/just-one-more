import type { Card, CardKind, GameAction, Player, PublicRoom, Room, RoomSettings } from './types';
import { scoreHand } from './scoring';

export type Random = () => number;
export const COLORS = ['coral', 'sage', 'lavender', 'gold', 'blue', 'pink', 'teal', 'slate'];
export const DEFAULT_SETTINGS: RoomSettings = {
  maxNumber: 12,
  endMode: 'points',
  isPublic: true,
  maxPlayers: 8,
};
export function makePlayer(id: string, name: string, color = 'coral', bot = false): Player {
  return {
    id,
    name,
    color,
    bot,
    connected: true,
    ready: bot,
    total: 0,
    hand: [],
    status: 'active',
    predictionMultiplier: 1,
    roulette: 1,
    roundScore: 0,
    qualified: false,
  };
}
export function createRoom(code: string, name: string, host: Player, settings: RoomSettings): Room {
  return {
    code,
    name,
    hostId: host.id,
    settings,
    players: [host],
    phase: 'lobby',
    round: 0,
    version: 0,
    turnId: null,
    prompt: null,
    winnerId: null,
    tied: false,
    deck: [],
    discards: [],
    used: [],
    opening: [],
    effects: [],
    forced: null,
    advanceTurn: false,
    ending: false,
    events: [],
    history: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    eventSequence: 0,
    gameId: `${code}-${Date.now()}`,
    departedIds: [],
  };
}
export function buildDeck(max: number): Card[] {
  const cards: Card[] = [];
  const add = (kind: CardKind, value: number) =>
    cards.push({ id: `c${cards.length}`, kind, value });
  for (let value = 0; value <= max; value++)
    for (let i = 0; i < Math.max(1, value); i++) add('number', value);
  for (const kind of ['prediction', 'flip3', 'chance'] as const)
    for (let i = 0; i < 3; i++) add(kind, 0);
  for (const value of [2, 4, 6, 8, 10]) add('bonus', value);
  add('double', 2);
  return cards;
}
export function shuffle<T>(items: T[], random: Random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function log(room: Room, text: string, type: Room['events'][number]['type'] = 'info') {
  room.events.push({ id: ++room.eventSequence, text, type });
  room.events = room.events.slice(-80);
}
function active(room: Room) {
  return room.players.filter((p) => p.status === 'active');
}
function playerById(room: Room, id: string) {
  const p = room.players.find((p) => p.id === id);
  if (!p) throw new Error('Player not found.');
  return p;
}
export function toPublicRoom(room: Room): PublicRoom {
  const {
    deck,
    discards,
    used: _used,
    opening: _opening,
    effects: _effects,
    forced: _forced,
    advanceTurn: _advance,
    ...visible
  } = room;
  return { ...visible, deckCount: deck.length, discardCount: discards.length };
}
export function startRound(room: Room, random: Random = Math.random): Room {
  if (room.phase !== 'lobby' && room.phase !== 'round-end')
    throw new Error('A round is already in progress.');
  if (room.players.length < 2) throw new Error('Invite a friend or add a bot to start.');
  room.round++;
  room.phase = 'playing';
  room.tied = false;
  room.ending = false;
  room.prompt = null;
  room.forced = null;
  room.effects = [];
  room.advanceTurn = false;
  if (room.round === 1) room.deck = shuffle(buildDeck(room.settings.maxNumber), random);
  room.discards.push(...room.used.map(({ id, kind, value }) => ({ id, kind, value })));
  room.used = [];
  for (const p of room.players) {
    p.hand = [];
    p.status = 'active';
    p.predictionMultiplier = 1;
    p.roulette = 1;
    p.roundScore = 0;
    p.qualified = false;
  }
  const start = (room.round - 1) % room.players.length;
  room.opening = [...room.players.slice(start), ...room.players.slice(0, start)].map((p) => p.id);
  room.turnId = room.players[start].id;
  log(room, `Round ${room.round}. ${room.players[start].name} starts.`, 'info');
  pump(room, random);
  return room;
}
function forceEnding(room: Room, reason: string) {
  room.ending = true;
  room.forced = null;
  room.effects = [];
  room.opening = [];
  room.prompt = null;
  log(room, reason, 'special');
}
function takeCard(room: Room, random: Random): Card | undefined {
  if (!room.deck.length && room.discards.length) {
    room.deck = shuffle(room.discards, random);
    room.discards = [];
    log(room, 'The previous rounds’ discards were shuffled into a fresh deck.');
  }
  const card = room.deck.shift();
  if (!card) {
    forceEnding(room, 'The deck is empty. Everyone banks or takes roulette.');
    return;
  }
  room.used.push(card);
  return card;
}
function receive(room: Room, player: Player, card: Card, guess?: number) {
  if (card.kind === 'number') {
    log(room, `${player.name} drew ${card.value}.`, 'draw');
    const duplicate = player.hand.some((c) => c.kind === 'number' && c.value === card.value);
    if (guess !== undefined) {
      if (guess === card.value) {
        player.predictionMultiplier *= 3;
        log(
          room,
          `Right on! ${player.name} predicted ${card.value} and now has ×${player.predictionMultiplier}.`,
          'special',
        );
      } else {
        for (const held of player.hand) {
          if (held.kind === 'number') held.frozen = true;
          if (held.kind === 'bonus' || held.kind === 'double') held.disabled = true;
        }
        card.frozen = true;
        player.predictionMultiplier = 1;
        log(
          room,
          `${player.name} predicted ${guess}, but drew ${card.value}. All held numbers freeze and score modifiers reset.`,
          'special',
        );
      }
    }
    if (duplicate) {
      const protection = player.hand.findIndex((c) => c.kind === 'chance');
      if (protection >= 0) {
        player.hand.splice(protection, 1);
        log(room, `Second Chance saved ${player.name} from a duplicate ${card.value}.`, 'special');
      } else {
        player.hand.push(card);
        player.status = 'busted';
        player.roundScore = 0;
        log(room, `${player.name} busted on a duplicate ${card.value}.`, 'bust');
      }
    } else player.hand.push(card);
    if (player.status === 'active' && scoreHand(player).count >= 10)
      forceEnding(
        room,
        `${player.name} reached ten! Everyone gets a final Bank or Roulette choice.`,
      );
    return;
  }
  if (card.kind === 'prediction' || card.kind === 'flip3') {
    room.effects.push({ kind: card.kind, ownerId: player.id });
    log(
      room,
      `${player.name} drew ${card.kind === 'prediction' ? 'Prediction' : 'Flip Three'}.`,
      'special',
    );
    return;
  }
  if (card.kind === 'chance' && player.hand.some((c) => c.kind === 'chance')) {
    const seat = room.players.indexOf(player);
    const ordered = [...room.players.slice(seat + 1), ...room.players.slice(0, seat)];
    const recipient = ordered.find(
      (p) => p.status === 'active' && !p.hand.some((c) => c.kind === 'chance'),
    );
    if (recipient) {
      recipient.hand.push(card);
      log(room, `${player.name} passed an extra Second Chance to ${recipient.name}.`, 'special');
    } else log(room, 'An extra Second Chance was discarded: everyone active is protected.');
    return;
  }
  player.hand.push(card);
  log(
    room,
    `${player.name} drew ${card.kind === 'chance' ? 'Second Chance' : card.kind === 'double' ? '×2' : `+${card.value}`}.`,
    'special',
  );
}
function settle(room: Room) {
  room.prompt = null;
  room.turnId = null;
  room.forced = null;
  room.effects = [];
  room.opening = [];
  for (const p of room.players) {
    p.roundScore = scoreHand(p).total;
    p.qualified = p.status === 'banked' && scoreHand(p).count >= 7 && p.roulette !== 0;
    p.total += p.roundScore;
  }
  room.history.push({
    round: room.round,
    scores: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.roundScore,
      total: p.total,
      status: p.status,
      roulette: p.roulette,
      qualified: p.qualified,
    })),
  });
  const eligible = room.players
    .filter((p) => p.total >= 200 && (room.settings.endMode === 'points' || p.qualified))
    .sort((a, b) => b.total - a.total);
  if (eligible.length && (eligible.length === 1 || eligible[0].total > eligible[1].total)) {
    room.winnerId = eligible[0].id;
    room.phase = 'finished';
    log(room, `${eligible[0].name} wins with ${eligible[0].total} points!`, 'win');
  } else {
    room.phase = 'round-end';
    room.tied = eligible.length > 1;
    log(
      room,
      room.tied
        ? 'A tie at the top! Everyone plays another round.'
        : `Round ${room.round} complete. Scores are banked.`,
      'info',
    );
  }
}
// Resolve physical draws before queued action cards. Prompts are the only points
// where this authoritative state machine yields to a player's decision.
function pump(room: Room, random: Random) {
  for (let steps = 0; steps < 1000; steps++) {
    if (room.phase !== 'playing' || room.prompt) return;
    if (!active(room).length) {
      settle(room);
      return;
    }
    if (room.ending) {
      room.prompt = { kind: 'bank', actorId: active(room)[0].id };
      return;
    }
    if (room.forced) {
      const forced = room.forced;
      const p = playerById(room, forced.targetId);
      if (p.status !== 'active' || forced.remaining === 0) {
        room.forced = null;
        continue;
      }
      const card = takeCard(room, random);
      if (!card) continue;
      if (forced.remaining > 0) forced.remaining--;
      receive(room, p, card, forced.guess);
      if (forced.guess !== undefined && card.kind === 'number') room.forced = null;
      continue;
    }
    if (room.effects.length) {
      const effect = room.effects.shift()!;
      if (playerById(room, effect.ownerId).status !== 'active') continue;
      room.prompt = { kind: 'target', actorId: effect.ownerId, effect: effect.kind };
      return;
    }
    if (room.opening.length) {
      const p = playerById(room, room.opening.shift()!);
      if (p.status !== 'active') continue;
      const card = takeCard(room, random);
      if (card) receive(room, p, card);
      continue;
    }
    const current = room.players.findIndex((p) => p.id === room.turnId);
    if (room.advanceTurn || room.players[current]?.status !== 'active') {
      for (let offset = 1; offset <= room.players.length; offset++) {
        const next = room.players[(Math.max(current, 0) + offset) % room.players.length];
        if (next.status === 'active') {
          room.turnId = next.id;
          break;
        }
      }
    }
    room.advanceTurn = false;
    return;
  }
  throw new Error('The effect chain exceeded its safety limit.');
}
function bank(room: Room, player: Player, roulette: boolean, random: Random) {
  player.roulette = roulette ? (random() < 0.5 ? 0 : 2) : 1;
  player.status = 'banked';
  player.roundScore = scoreHand(player).total;
  log(
    room,
    roulette
      ? `${player.name} took roulette: ×${player.roulette}! ${player.roundScore} points banked.`
      : `${player.name} banked ${player.roundScore} points.`,
    'bank',
  );
}
export function applyAction(
  input: Room,
  actorId: string,
  action: GameAction,
  random: Random = Math.random,
): Room {
  const room = structuredClone(input);
  if (room.phase !== 'playing') throw new Error('Wait for the next round to play.');
  const player = playerById(room, actorId);
  if (player.status !== 'active') throw new Error('You have already finished this round.');
  const prompt = room.prompt;
  if (prompt) {
    if (prompt.actorId !== actorId) throw new Error('Another player is making a choice.');
    if (prompt.kind === 'target' && action.type === 'target') {
      const target = playerById(room, action.targetId);
      if (target.status !== 'active') throw new Error('Choose a player still in this round.');
      log(
        room,
        `${player.name} chose ${target.name} for ${prompt.effect === 'prediction' ? 'Prediction' : 'Flip Three'}.`,
        'special',
      );
      room.prompt = prompt.effect === 'prediction' ? { kind: 'guess', actorId: target.id } : null;
      if (prompt.effect === 'flip3') room.forced = { targetId: target.id, remaining: 3 };
    } else if (prompt.kind === 'guess' && action.type === 'guess') {
      if (
        !Number.isInteger(action.value) ||
        action.value < 0 ||
        action.value > room.settings.maxNumber
      )
        throw new Error('Choose a number in this game’s range.');
      log(room, `${player.name} predicts ${action.value}.`, 'special');
      room.prompt = null;
      room.forced = { targetId: actorId, remaining: -1, guess: action.value };
    } else if (prompt.kind === 'bank' && action.type === 'bank') {
      room.prompt = null;
      bank(room, player, action.roulette, random);
    } else throw new Error('Resolve the current card effect first.');
  } else {
    if (room.turnId !== actorId) throw new Error('It is not your turn.');
    room.advanceTurn = true;
    if (action.type === 'draw') {
      const card = takeCard(room, random);
      if (card) receive(room, player, card);
    } else if (action.type === 'bank') bank(room, player, action.roulette, random);
    else throw new Error('Choose Draw, Bank, or Roulette.');
  }
  pump(room, random);
  return room;
}
export function botAction(room: Room, actorId: string, random: Random = Math.random): GameAction {
  const p = playerById(room, actorId);
  if (room.prompt?.kind === 'target') {
    const targets = active(room);
    const self =
      room.prompt.effect === 'flip3' && scoreHand(p).count < 3 && !p.hand.some((c) => c.frozen);
    return {
      type: 'target',
      targetId: self
        ? actorId
        : (
            targets
              .filter((t) => t.id !== actorId)
              .sort((a, b) => scoreHand(b).subtotal - scoreHand(a).subtotal)[0] ?? p
          ).id,
    };
  }
  if (room.prompt?.kind === 'guess')
    return { type: 'guess', value: room.settings.maxNumber - Math.floor(random() * 3) };
  const score = scoreHand(p);
  const bankNow =
    room.prompt?.kind === 'bank' ||
    score.subtotal >= 42 ||
    score.count >= (room.settings.endMode === 'seven' ? 7 : 5);
  return bankNow
    ? { type: 'bank', roulette: score.subtotal > 0 && random() < 0.2 }
    : { type: 'draw' };
}
