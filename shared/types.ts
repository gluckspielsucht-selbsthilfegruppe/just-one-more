export type CardKind =
  'number' | 'bonus' | 'double' | 'prediction' | 'flip3' | 'chance' | 'hackathon';
export interface Card {
  id: string;
  kind: CardKind;
  value: number;
  frozen?: boolean;
  disabled?: boolean;
}
export interface Player {
  id: string;
  name: string;
  color: string;
  bot: boolean;
  connected: boolean;
  ready: boolean;
  total: number;
  hand: Card[];
  status: 'active' | 'banked' | 'busted';
  predictionMultiplier: number;
  roulette: 0 | 1 | 2;
  roundScore: number;
  qualified: boolean;
}
export interface RoomSettings {
  maxNumber: 12 | 13 | 14 | 15;
  endMode: 'points' | 'seven';
  isPublic: boolean;
  maxPlayers: number;
}
export type Effect = { kind: 'prediction' | 'flip3'; ownerId: string };
export type Prompt =
  | { kind: 'target'; actorId: string; effect: 'prediction' | 'flip3' }
  | { kind: 'guess'; actorId: string }
  | { kind: 'bank'; actorId: string };
export interface GameEvent {
  id: number;
  text: string;
  type: 'info' | 'draw' | 'bust' | 'bank' | 'special' | 'win';
  playerId?: string;
  moment?:
    | 'prediction-hit'
    | 'prediction-reverse-hit'
    | 'bust'
    | 'bank'
    | 'roulette-loss'
    | 'roulette-win'
    | 'hackathon';
}
export interface RoundResult {
  round: number;
  scores: {
    id: string;
    name: string;
    score: number;
    total: number;
    status: Player['status'];
    roulette: number;
    qualified: boolean;
  }[];
}
export interface Room {
  code: string;
  name: string;
  hostId: string;
  settings: RoomSettings;
  players: Player[];
  phase: 'lobby' | 'playing' | 'round-end' | 'finished';
  round: number;
  version: number;
  turnId: string | null;
  prompt: Prompt | null;
  winnerId: string | null;
  tied: boolean;
  deck: Card[];
  discards: Card[];
  used: Card[];
  opening: string[];
  effects: Effect[];
  forced: { targetId: string; remaining: number; guess?: number } | null;
  advanceTurn: boolean;
  ending: boolean;
  reversed: boolean;
  events: GameEvent[];
  history: RoundResult[];
  createdAt: number;
  updatedAt: number;
  eventSequence: number;
  gameId: string;
  departedIds: string[];
}
export type PublicRoom = Omit<
  Room,
  'deck' | 'discards' | 'used' | 'opening' | 'effects' | 'forced' | 'advanceTurn'
> & { deckCount: number; discardCount: number };
export interface RoomSummary {
  code: string;
  name: string;
  hostName: string;
  players: number;
  maxPlayers: number;
  phase: Room['phase'];
  settings: RoomSettings;
  round: number;
}
export type GameAction =
  | { type: 'draw' }
  | { type: 'bank'; roulette: boolean }
  | { type: 'target'; targetId: string }
  | { type: 'guess'; value: number };
export interface Stats {
  games: number;
  wins: number;
  bestScore: number;
  rounds: number;
  bestRound: number;
}
export interface Profile {
  id: string;
  name: string;
  color: string;
  theme: 'classic' | 'midnight' | 'mint';
  appearance: 'neon' | 'velvet' | 'pop';
  account: boolean;
  stats: Stats;
}
export interface ScoreBreakdown {
  numberSum: number;
  multiplier: number;
  flatBonus: number;
  comboBonus: number;
  countBonus: number;
  count: number;
  subtotal: number;
  total: number;
  combos: string[];
}
