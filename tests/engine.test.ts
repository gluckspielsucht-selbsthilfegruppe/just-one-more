import { describe, expect, it } from 'vitest';
import {
  applyAction,
  botAction,
  buildDeck,
  createRoom,
  DEFAULT_SETTINGS,
  makePlayer,
  startRound,
  toPublicRoom,
} from '../shared/engine';
import { scoreHand } from '../shared/scoring';
import type { Card, CardKind, Room } from '../shared/types';

let sequence = 0;
const card = (value: number, kind: CardKind = 'number'): Card => ({
  id: `test-${++sequence}`,
  kind,
  value,
});
const hand = (values: number[]): Card[] => values.map((v) => card(v));
function fixture(values: number[] = [], deck: Card[] = []): Room {
  const r = createRoom('ABCDE', 'Test table', makePlayer('a', 'Alice'), { ...DEFAULT_SETTINGS });
  r.players.push(makePlayer('b', 'Bob'), makePlayer('c', 'Cleo'), makePlayer('d', 'Drew'));
  r.phase = 'playing';
  r.round = 1;
  r.turnId = 'a';
  r.players[0].hand = hand(values);
  r.deck = deck;
  return r;
}
function bankAll(input: Room): Room {
  let r = input;
  for (let i = 0; i < 8 && r.phase === 'playing'; i++)
    r = applyAction(r, r.prompt?.actorId ?? r.turnId!, { type: 'bank', roulette: false });
  return r;
}
function seedRandom(seed: number) {
  return () => {
    seed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    seed ^= seed + Math.imul(seed ^ (seed >>> 7), 61 | seed);
    return ((seed ^ (seed >>> 14)) >>> 0) / 4294967296;
  };
}

describe('documented deck and scoring contract', () => {
  it.each([
    [12, 94],
    [13, 107],
    [14, 121],
    [15, 136],
  ])('builds the 0–%i deck with %i cards', (max, total) => {
    const deck = buildDeck(max);
    expect(deck).toHaveLength(total);
    expect(new Set(deck.map((c) => c.id)).size).toBe(total);
    for (let v = 0; v <= max; v++)
      expect(deck.filter((c) => c.kind === 'number' && c.value === v)).toHaveLength(Math.max(v, 1));
    for (const kind of ['prediction', 'flip3', 'chance'])
      expect(deck.filter((c) => c.kind === kind)).toHaveLength(3);
  });
  it.each([
    [6, 21, 0, 21],
    [7, 30, 15, 45],
    [8, 40, 30, 70],
    [9, 51, 60, 111],
    [10, 63, 120, 183],
  ])('scores %i cards using only its highest bonus', (count, sum, bonus, total) => {
    const p = makePlayer('a', 'Alice');
    p.hand = hand([0, 1, 3, 4, 5, 8, 9, 10, 11, 12].slice(0, count));
    expect(scoreHand(p)).toMatchObject({ numberSum: sum, countBonus: bonus, total });
  });
  it('excludes frozen values from points, both combos, and milestones', () => {
    const p = makePlayer('a', 'Alice');
    p.hand = [
      ...hand([2, 4, 9]).map((c) => ({ ...c, frozen: true })),
      ...hand([0, 1, 3, 5, 6, 7, 8]),
    ];
    expect(scoreHand(p)).toMatchObject({ count: 7, comboBonus: 10, countBonus: 15, total: 55 });
  });
  it('applies stacked multipliers before bonuses, then roulette', () => {
    const p = makePlayer('a', 'Alice');
    p.hand = [...hand([6, 7, 4, 2, 0]), card(2, 'double'), card(4, 'bonus')];
    p.predictionMultiplier = 3;
    p.roulette = 2;
    expect(scoreHand(p)).toMatchObject({
      numberSum: 19,
      multiplier: 6,
      comboBonus: 35,
      total: 306,
    });
    p.status = 'busted';
    expect(scoreHand(p).total).toBe(0);
  });
  it('scores all documented seven-card roulette outcomes', () => {
    const p = makePlayer('a', 'Alice');
    p.hand = hand([0, 2, 4, 6, 7, 8, 9]);
    p.predictionMultiplier = 3;
    p.roulette = 2;
    expect(scoreHand(p).total).toBe(316);
    p.roulette = 0;
    expect(scoreHand(p).total).toBe(0);
    p.hand = hand([8, 12]);
    p.predictionMultiplier = 9;
    p.roulette = 1;
    expect(scoreHand(p).total).toBe(180);
  });
});
describe('authoritative turns and special-card chains', () => {
  it('is immutable and rejects out-of-turn or irrelevant actions', () => {
    const r = fixture([4], [card(8)]);
    const before = structuredClone(r);
    expect(() => applyAction(r, 'b', { type: 'draw' })).toThrow('not your turn');
    expect(() => applyAction(r, 'a', { type: 'guess', value: 5 })).toThrow('Choose Draw');
    const next = applyAction(r, 'a', { type: 'draw' });
    expect(r).toEqual(before);
    expect(next.players[0].hand).toHaveLength(2);
    expect(next.turnId).toBe('b');
  });
  it('freezes a missed prediction including its new card, then busts on a frozen duplicate', () => {
    let r = fixture([4, 9], [card(2), card(4)]);
    r.prompt = { kind: 'guess', actorId: 'a' };
    r = applyAction(r, 'a', { type: 'guess', value: 6 });
    expect(r.players[0].hand.every((c) => c.frozen)).toBe(true);
    expect(scoreHand(r.players[0]).total).toBe(0);
    r = applyAction(r, 'a', { type: 'draw' });
    expect(r.players[0].status).toBe('busted');
  });
  it('resolves a correct prediction before protection on a duplicate', () => {
    let r = fixture([6, 7], [card(7)]);
    r.players[0].hand.push(card(0, 'chance'));
    r.prompt = { kind: 'guess', actorId: 'a' };
    r = applyAction(r, 'a', { type: 'guess', value: 7 });
    expect(r.players[0].status).toBe('active');
    expect(r.players[0].hand).toHaveLength(2);
    expect(scoreHand(r.players[0]).total).toBe(49);
    r = fixture([6, 7], [card(7)]);
    r.prompt = { kind: 'guess', actorId: 'a' };
    r = applyAction(r, 'a', { type: 'guess', value: 7 });
    expect(r.players[0].status).toBe('busted');
  });
  it('disables old and intervening score modifiers on a miss, preserves protection, and resolves queued actions', () => {
    let r = fixture([4, 9], [card(0, 'prediction'), card(8, 'bonus'), card(4), card(5)]);
    r.players[0].hand.push(card(4, 'bonus'), card(2, 'double'), card(0, 'chance'));
    r.players[0].predictionMultiplier = 3;
    r.prompt = { kind: 'guess', actorId: 'a' };
    r = applyAction(r, 'a', { type: 'guess', value: 6 });
    expect(r.prompt).toEqual({ kind: 'target', actorId: 'a', effect: 'prediction' });
    const p = r.players[0];
    expect(p.predictionMultiplier).toBe(1);
    expect(p.hand.filter((c) => c.kind === 'number').every((c) => c.frozen)).toBe(true);
    expect(
      p.hand.filter((c) => c.kind === 'bonus' || c.kind === 'double').every((c) => c.disabled),
    ).toBe(true);
    expect(p.hand.some((c) => c.kind === 'chance')).toBe(false);
    r = applyAction(r, 'a', { type: 'target', targetId: 'a' });
    r = applyAction(r, 'a', { type: 'guess', value: 5 });
    expect(scoreHand(r.players[0]).total).toBe(15);
    expect(r.players[0].hand.filter((c) => c.frozen)).toHaveLength(2);
  });
  it('passes surplus protection to the next eligible seat', () => {
    let r = fixture([4], [card(0, 'chance')]);
    r.players[0].hand.push(card(0, 'chance'));
    r.players[1].status = 'banked';
    r = applyAction(r, 'a', { type: 'draw' });
    expect(r.players[2].hand.some((c) => c.kind === 'chance')).toBe(true);
    expect(r.players[0].hand.filter((c) => c.kind === 'chance')).toHaveLength(1);
  });
  it('counts specials toward Flip Three and defers action cards', () => {
    let r = fixture(
      [4],
      [card(0, 'flip3'), card(0, 'prediction'), card(8, 'bonus'), card(7), card(11)],
    );
    r = applyAction(r, 'a', { type: 'draw' });
    r = applyAction(r, 'a', { type: 'target', targetId: 'b' });
    expect(r.players[1].hand.map((c) => c.value)).toEqual([8, 7]);
    expect(r.deck[0].value).toBe(11);
    expect(r.prompt).toEqual({ kind: 'target', actorId: 'b', effect: 'prediction' });
    r = applyAction(r, 'b', { type: 'target', targetId: 'b' });
    r = applyAction(r, 'b', { type: 'guess', value: 11 });
    expect(r.turnId).toBe('b');
  });
  it('ten unfrozen cards ends the whole round and cancels the remaining forced draw and queued action', () => {
    let r = fixture(
      [0, 1, 2, 3, 4, 5, 6, 8, 9],
      [card(0, 'prediction'), card(7), card(4, 'bonus')],
    );
    r.prompt = { kind: 'target', actorId: 'a', effect: 'flip3' };
    r = applyAction(r, 'a', { type: 'target', targetId: 'a' });
    expect(r.ending).toBe(true);
    expect(r.effects).toEqual([]);
    expect(r.deck[0].kind).toBe('bonus');
    expect(r.prompt?.kind).toBe('bank');
    r = bankAll(r);
    expect(r.players[0].total).toBe(200);
    expect(r.phase).toBe('finished');
    expect(r.winnerId).toBe('a');
  });
  it('does not end at seven, eight, or nine numbers', () => {
    for (const count of [7, 8, 9]) {
      const r = applyAction(
        fixture(
          Array.from({ length: count - 1 }, (_, n) => n),
          [card(12)],
        ),
        'a',
        { type: 'draw' },
      );
      expect(r.ending).toBe(false);
    }
  });
  it('stops forced draws and deletes the busted owner’s queued actions', () => {
    let r = fixture([4], [card(0, 'prediction'), card(4), card(9)]);
    r.prompt = { kind: 'target', actorId: 'a', effect: 'flip3' };
    r = applyAction(r, 'a', { type: 'target', targetId: 'a' });
    expect(r.players[0].status).toBe('busted');
    expect(r.deck[0].value).toBe(9);
    expect(r.prompt).toBeNull();
    expect(r.effects).toHaveLength(0);
  });
  it('handles opening effects before completing the opening deal', () => {
    let r = fixture([], [card(0, 'prediction'), card(9), card(8), card(7), card(6)]);
    r.opening = ['a', 'b', 'c', 'd'];
    r.turnId = 'a';
    // Trigger the same pump through a target prompt while an opening deal remains.
    r.prompt = { kind: 'target', actorId: 'a', effect: 'flip3' };
    r.opening = ['b', 'c', 'd'];
    r = applyAction(r, 'a', { type: 'target', targetId: 'a' });
    expect(r.players[1].hand).toHaveLength(0);
    expect(r.prompt?.kind).toBe('target');
    r = applyAction(r, 'a', { type: 'target', targetId: 'a' });
    r = applyAction(r, 'a', { type: 'guess', value: 7 });
    expect(r.players[1].hand[0]?.value).toBe(6);
  });
  it('reshuffles previous discards only and safely banks on complete exhaustion', () => {
    let r = fixture([4], []);
    r.discards = [card(5)];
    r.used = [card(4)];
    r = applyAction(r, 'a', { type: 'draw' });
    expect(r.players[0].hand.map((c) => c.value)).toEqual([4, 5]);
    expect(r.discards).toHaveLength(0);
    r = applyAction(r, 'b', { type: 'draw' });
    expect(r.ending).toBe(true);
    expect(r.used).toHaveLength(2);
    r = bankAll(r);
    expect(r.phase).toBe('round-end');
  });
  it('cancels an incomplete prediction on exhaustion without freezing or resetting', () => {
    let r = fixture([4, 9], [card(4, 'bonus')]);
    r.players[0].predictionMultiplier = 3;
    r.prompt = { kind: 'guess', actorId: 'a' };
    r = applyAction(r, 'a', { type: 'guess', value: 6 });
    expect(r.ending).toBe(true);
    expect(r.players[0].hand.every((c) => !c.frozen && !c.disabled)).toBe(true);
    expect(scoreHand(r.players[0]).total).toBe(43);
  });
  it('keeps unused deck and rotates starting seats in the next round', () => {
    let r = bankAll(fixture([3], hand([10, 11, 12, 9, 8])));
    r = startRound(r);
    expect(r.round).toBe(2);
    expect(r.turnId).toBe('b');
    expect(r.players[1].hand[0].value).toBe(10);
    expect(r.deck[0].value).toBe(8);
    expect(r.players[0].total).toBe(3);
  });
  it('never exposes the draw pile or internal effect queue', () => {
    const view = toPublicRoom(fixture([], hand([9, 10])));
    expect(view.deckCount).toBe(2);
    for (const key of ['deck', 'discards', 'forced', 'opening', 'effects', 'used'])
      expect(key in view).toBe(false);
  });
});
describe('end conditions and round settlement', () => {
  it.each([
    ['points', 199, false, false],
    ['points', 200, false, true],
    ['seven', 199, true, false],
    ['seven', 200, false, false],
    ['seven', 200, true, true],
  ] as const)('%s mode at %i with seven=%s wins=%s', (mode, total, seven, win) => {
    let r = fixture(seven ? [0, 1, 2, 3, 4, 5, 6] : [5]);
    r.settings.endMode = mode;
    r.players[0].total = total - scoreHand(r.players[0]).total;
    r = bankAll(r);
    expect(r.players[0].total).toBe(total);
    expect(r.phase).toBe(win ? 'finished' : 'round-end');
  });
  it('chooses the highest eligible player, not the highest ineligible player', () => {
    let r = fixture([5]);
    r.settings.endMode = 'seven';
    r.players[0].total = 225;
    r.players[1].hand = hand([0, 1, 2, 3, 4, 5, 6]);
    r.players[1].total = 210 - scoreHand(r.players[1]).total;
    r = bankAll(r);
    expect(r.winnerId).toBe('b');
    expect(r.players[0].total).toBe(230);
  });
  it('ties require another round and seven qualification resets', () => {
    let r = fixture([0, 1, 2, 3, 4, 5, 6]);
    r.settings.endMode = 'seven';
    r.players[1].hand = hand([0, 1, 2, 3, 4, 5, 6]);
    for (const p of r.players.slice(0, 2)) p.total = 220 - scoreHand(p).total;
    r = bankAll(r);
    expect(r.phase).toBe('round-end');
    expect(r.tied).toBe(true);
    r.deck = hand([3, 5, 9, 11]);
    r = startRound(r);
    expect(r.players.every((p) => !p.qualified)).toBe(true);
  });
  it('roulette loss retains past points but removes seven eligibility', () => {
    let r = fixture([0, 1, 2, 3, 4, 5, 6]);
    r.settings.endMode = 'seven';
    r.players[0].total = 250;
    r = applyAction(r, 'a', { type: 'bank', roulette: true }, () => 0.1);
    r = bankAll(r);
    expect(r.players[0]).toMatchObject({ total: 250, roundScore: 0, qualified: false });
    expect(r.phase).toBe('round-end');
  });
  it('replays the full documented four-seat tabletop fixture', () => {
    let r = fixture(
      [],
      [
        card(6),
        card(12),
        card(4),
        card(9),
        card(7),
        card(8),
        card(0, 'prediction'),
        card(4, 'bonus'),
        card(2),
        card(0, 'chance'),
        ...hand([2, 4, 9, 5, 0, 4, 8, 9, 10, 11, 12]),
      ],
    );
    r.settings.endMode = 'seven';
    for (const p of r.players) {
      const opening = r.deck.shift()!;
      p.hand = [opening];
      r.used.push(opening);
    }
    r = applyAction(r, 'a', { type: 'draw' });
    r = applyAction(r, 'b', { type: 'draw' });
    r = applyAction(r, 'c', { type: 'draw' });
    r = applyAction(r, 'c', { type: 'target', targetId: 'd' });
    r = applyAction(r, 'd', { type: 'guess', value: 6 });
    expect(r.turnId).toBe('d');
    r = applyAction(r, 'd', { type: 'draw' });
    r = applyAction(r, 'a', { type: 'bank', roulette: true }, () => 0.75);
    r = applyAction(r, 'b', { type: 'bank', roulette: false });
    for (let i = 0; i < 3; i++) {
      r = applyAction(r, 'c', { type: 'draw' });
      r = applyAction(r, 'd', { type: 'draw' });
    }
    r = applyAction(r, 'c', { type: 'bank', roulette: false });
    r = applyAction(r, 'd', { type: 'draw' });
    r = applyAction(r, 'd', { type: 'draw' });
    expect(r.players.map((p) => p.total)).toEqual([46, 20, 40, 0]);
    expect(r.used).toHaveLength(18);
    expect(r.deck[0].value).toBe(10);
    expect(r.phase).toBe('round-end');
  });
});
describe('complete game simulation', () => {
  it.each([12, 13, 14, 15])(
    'finishes seeded games for range %i without deadlocks or invalid state',
    (max) => {
      for (let seed = 1; seed <= 12; seed++) {
        const random = seedRandom(seed * 7919 + max);
        let r = fixture();
        r.phase = 'lobby';
        r.round = 0;
        r.settings.maxNumber = max as 12 | 13 | 14 | 15;
        r.settings.endMode = seed % 2 ? 'points' : 'seven';
        r = startRound(r, random);
        for (let steps = 0; steps < 25000 && r.phase !== 'finished'; steps++) {
          if (r.phase === 'round-end') {
            r = startRound(r, random);
            continue;
          }
          const actor = r.prompt?.actorId ?? r.turnId!;
          expect(r.players.find((p) => p.id === actor)?.status).toBe('active');
          r = applyAction(r, actor, botAction(r, actor, random), random);
          for (const p of r.players) {
            expect(p.total).toBeGreaterThanOrEqual(0);
            expect(scoreHand(p).count).toBeLessThanOrEqual(10);
          }
          expect(new Set([...r.deck, ...r.discards, ...r.used].map((c) => c.id)).size).toBe(
            buildDeck(max).length,
          );
        }
        expect(r.phase).toBe('finished');
        expect(r.players.find((p) => p.id === r.winnerId)!.total).toBeGreaterThanOrEqual(200);
      }
    },
  );
});
