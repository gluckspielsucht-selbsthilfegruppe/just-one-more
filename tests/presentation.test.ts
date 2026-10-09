import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoom, makePlayer, toPublicRoom, DEFAULT_SETTINGS } from '../shared/engine';
import { rouletteResult, rouletteRotation, type RouletteBet } from '../src/roulette';
import { GameAudio, readAudioSettings } from '../src/audio';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('roulette presentation uses the confirmed game result', () => {
  function fixture() {
    const room = createRoom('WHEEL', 'Wheel table', makePlayer('a', 'Alice'), DEFAULT_SETTINGS);
    room.phase = 'playing';
    room.round = 2;
    const bet: RouletteBet = { gameId: room.gameId, round: 2, points: 40, qualified: false };
    return { room, bet };
  }
  it.each([0, 2] as const)('shows ×%i even when the spin ends the round', (multiplier) => {
    const { room, bet } = fixture();
    Object.assign(room.players[0], {
      status: 'banked',
      roulette: multiplier,
      roundScore: 40 * multiplier,
    });
    room.phase = 'round-end';
    expect(rouletteResult(toPublicRoom(room), 'a', bet)).toEqual({
      multiplier,
      points: 40 * multiplier,
    });
    const angleUnderPointer = (360 - (rouletteRotation(multiplier) % 360)) % 360;
    const pocket = Math.floor(angleUnderPointer / 30);
    expect(pocket % 2 === 0 ? 2 : 0).toBe(multiplier);
    expect(angleUnderPointer % 30).toBe(15);
  });
  it('keeps a confirmed result when another player starts the next round', () => {
    const { room, bet } = fixture();
    room.round++;
    room.history.push({
      round: bet.round,
      scores: [
        {
          id: 'a',
          name: 'Alice',
          score: 80,
          total: 130,
          status: 'banked',
          roulette: 2,
          qualified: false,
        },
      ],
    });
    expect(rouletteResult(toPublicRoom(room), 'a', bet)).toEqual({ multiplier: 2, points: 80 });
  });
  it('never turns an ordinary bank, pending action, or previous game into a roulette result', () => {
    const { room, bet } = fixture();
    expect(rouletteResult(toPublicRoom(room), 'a', bet)).toBeNull();
    room.players[0].status = 'banked';
    expect(rouletteResult(toPublicRoom(room), 'a', bet)).toBeNull();
    room.players[0].roulette = 2;
    expect(rouletteResult(toPublicRoom(room), 'a', { ...bet, gameId: 'other-game' })).toBeNull();
  });
});

describe('audio preferences and lifecycle', () => {
  it('starts silently and tolerates unavailable storage', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
    });
    expect(readAudioSettings()).toEqual({ music: false, effects: false, volume: 0.35 });
  });
  it('preserves the existing sound setting without opting into music', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => (key === 'jom-sound' ? 'true' : null),
    });
    expect(readAudioSettings()).toEqual({ music: false, effects: true, volume: 0.35 });
  });
  it('clamps a stored volume to the supported range', () => {
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ music: true, volume: 900 }) });
    expect(readAudioSettings().volume).toBe(1);
  });
  it('uses one scheduler, pauses in hidden tabs, and releases audio on unmount', async () => {
    vi.useFakeTimers();
    const param = () => ({
      value: 0,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      setTargetAtTime: vi.fn(),
    });
    class Node {
      gain = param();
      frequency = param();
      threshold = param();
      ratio = param();
      connect = vi.fn();
      disconnect = vi.fn();
      start = vi.fn();
      stop = vi.fn();
    }
    class Oscillator extends Node {}
    const nodes: Node[] = [];
    const contexts: Context[] = [];
    class Context {
      currentTime = 0;
      sampleRate = 8000;
      state = 'suspended';
      destination = new Node();
      constructor() {
        contexts.push(this);
      }
      resume = vi.fn(async () => {
        this.state = 'running';
      });
      suspend = vi.fn(async () => {
        this.state = 'suspended';
      });
      close = vi.fn(async () => {
        this.state = 'closed';
      });
      createGain = () => new Node();
      createDynamicsCompressor = () => new Node();
      createBiquadFilter = () => new Node();
      createBuffer = () => ({ getChannelData: () => new Float32Array(8000) });
      createOscillator = () => {
        const node = new Oscillator();
        nodes.push(node);
        return node;
      };
      createBufferSource = () => {
        const node = new Node();
        nodes.push(node);
        return node;
      };
    }
    vi.stubGlobal('AudioContext', Context);
    vi.stubGlobal('OscillatorNode', Oscillator);
    const audio = new GameAudio();
    const settings = { music: true, effects: false, volume: 0.35 };
    audio.configure(settings, 'neon');
    expect(contexts).toHaveLength(0);
    await audio.unlock();
    await audio.unlock();
    audio.configure(settings, 'neon');
    expect(contexts).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(1);
    expect(nodes.length).toBeGreaterThan(0);
    const count = nodes.length;
    audio.play('win');
    expect(nodes).toHaveLength(count);
    await audio.setVisible(false);
    expect(vi.getTimerCount()).toBe(0);
    expect(contexts[0].state).toBe('suspended');
    expect(nodes.every((node) => node.stop.mock.calls.length >= 2)).toBe(true);
    await audio.setVisible(true);
    expect(vi.getTimerCount()).toBe(1);
    audio.configure(settings, 'velvet');
    expect(vi.getTimerCount()).toBe(1);
    audio.dispose();
    expect(vi.getTimerCount()).toBe(0);
    expect(contexts[0].state).toBe('closed');
  });
});
