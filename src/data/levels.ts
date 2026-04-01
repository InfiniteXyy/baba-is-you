// Built-in sample levels
import { Entity, TextWord } from '../engine/entities';
import { createEntity } from '../engine/entities';

export interface Level {
  id: string;
  name: string;
  width: number;
  height: number;
  entities: Entity[];
}

function makeText(x: number, y: number, word: TextWord): Entity {
  return createEntity('TEXT_WORD', { x, y }, word);
}

function makeIs(x: number, y: number): Entity {
  return createEntity('TEXT_IS', { x, y });
}

function makeYou(x: number, y: number): Entity {
  return createEntity('TEXT_YOU', { x, y });
}

function makeWin(x: number, y: number): Entity {
  return createEntity('TEXT_WIN', { x, y });
}

function makePush(x: number, y: number): Entity {
  return createEntity('TEXT_PUSH', { x, y });
}

function makeLove(x: number, y: number): Entity {
  return createEntity('TEXT_LOVE', { x, y });
}

function makeStop(x: number, y: number): Entity {
  return createEntity('TEXT_STOP', { x, y });
}

export const levels: Level[] = [
  // Level 1: "First Steps" - BABA IS YOU + FLAG IS WIN
  {
    id: 'first-steps',
    name: 'First Steps',
    width: 11,
    height: 9,
    entities: [
      createEntity('BABA', { x: 2, y: 4 }),
      createEntity('FLAG', { x: 8, y: 4 }),
      // Rules
      makeText(0, 2, 'BABA'),
      makeIs(1, 2),
      makeYou(2, 2),
      makeText(4, 2, 'FLAG'),
      makeIs(5, 2),
      makeWin(6, 2),
    ],
  },

  // Level 2: "You" - BABA IS YOU + FLAG IS WIN
  {
    id: 'you',
    name: 'You',
    width: 11,
    height: 9,
    entities: [
      // BABA (playable)
      createEntity('BABA', { x: 2, y: 4 }),
      // Rules row y=2
      makeText(0, 2, 'BABA'),
      makeIs(1, 2),
      makeYou(2, 2),
      makeText(4, 2, 'FLAG'),
      makeIs(5, 2),
      makeWin(6, 2),
      // Flag
      createEntity('FLAG', { x: 8, y: 4 }),
    ],
  },

  // Level 3: "Push" - ROCK blocks, must push it
  {
    id: 'push',
    name: 'Push',
    width: 11,
    height: 9,
    entities: [
      createEntity('BABA', { x: 1, y: 4 }),
      createEntity('ROCK', { x: 4, y: 4 }),
      createEntity('FLAG', { x: 9, y: 4 }),
      // Rules row y=2
      makeText(0, 2, 'BABA'),
      makeIs(1, 2),
      makeYou(2, 2),
      makeText(4, 2, 'ROCK'),
      makeIs(5, 2),
      makePush(6, 2),
      makeText(8, 2, 'FLAG'),
      makeIs(9, 2),
      makeWin(10, 2),
    ],
  },

  // Level 4: "Stop" - WALL blocks path
  {
    id: 'stop',
    name: 'Stop',
    width: 13,
    height: 9,
    entities: [
      createEntity('BABA', { x: 1, y: 4 }),
      createEntity('WALL', { x: 4, y: 3 }),
      createEntity('WALL', { x: 4, y: 4 }),
      createEntity('WALL', { x: 4, y: 5 }),
      createEntity('ROCK', { x: 6, y: 4 }),
      createEntity('FLAG', { x: 11, y: 4 }),
      // Rules
      makeText(1, 2, 'BABA'),
      makeIs(2, 2),
      makeYou(3, 2),
      makeText(5, 2, 'ROCK'),
      makeIs(6, 2),
      makePush(7, 2),
      makeText(9, 2, 'FLAG'),
      makeIs(10, 2),
      makeWin(11, 2),
      makeText(5, 0, 'WALL'),
      makeIs(6, 0),
      makeStop(7, 0),
    ],
  },

  // Level 6: "Where Do I Go" — L-shaped map from screenshot
  {
    id: 'where-do-i-go',
    name: 'Where Do I Go',
    width: 13,
    height: 11,
    entities: [
      // ── Boundary walls ──────────────────────────────────────────────────
      // Top edge  (y=0, x=4..12)
      ...([4,5,6,7,8,9,10,11,12] as const).map(x => createEntity('WALL', { x, y: 0 })),
      // Right edge (x=12, y=1..10)
      ...([1,2,3,4,5,6,7,8,9,10] as const).map(y => createEntity('WALL', { x: 12, y })),
      // Bottom edge (y=10, x=0..11)
      ...([0,1,2,3,4,5,6,7,8,9,10,11] as const).map(x => createEntity('WALL', { x, y: 10 })),
      // Left edge lower (x=0, y=4..9)
      ...([4,5,6,7,8,9] as const).map(y => createEntity('WALL', { x: 0, y })),
      // Inner-corner horizontal (y=4, x=1..3) — top of left corridor
      ...([1,2,3] as const).map(x => createEntity('WALL', { x, y: 4 })),
      // Inner-corner vertical (x=4, y=1..3) — left wall of top room
      ...([1,2,3] as const).map(y => createEntity('WALL', { x: 4, y })),

      // ── Top room: IS, WIN, FLAG entity ──────────────────────────────────
      createEntity('TEXT_IS',  { x: 7, y: 2 }),
      createEntity('TEXT_WIN', { x: 10, y: 3 }),
      createEntity('FLAG',     { x: 6, y: 3 }),

      // ── Left corridor: FLAG text tile ───────────────────────────────────
      makeText(2, 5, 'FLAG'),

      // ── Bottom-left: BABA IS YOU (vertical) ─────────────────────────────
      makeText(2, 7, 'BABA'),
      createEntity('TEXT_IS',  { x: 2, y: 8 }),
      createEntity('TEXT_YOU', { x: 2, y: 9 }),

      // ── Bottom-right: WALL IS STOP (vertical) + BABA player ─────────────
      makeText(6, 7, 'WALL'),
      createEntity('TEXT_IS',   { x: 6, y: 8 }),
      createEntity('TEXT_STOP', { x: 6, y: 9 }),
      createEntity('BABA',      { x: 9, y: 8 }),
    ],
  },

  {
    id: 'love',
    name: 'Love',
    width: 11,
    height: 9,
    entities: [
      createEntity('BABA', { x: 2, y: 4 }),
      createEntity('ROCK', { x: 5, y: 4 }),
      createEntity('FLAG', { x: 8, y: 4 }),
      // Rules row y=2
      makeText(0, 2, 'BABA'),
      makeIs(1, 2),
      makeYou(2, 2),
      makeText(4, 2, 'ROCK'),
      makeIs(5, 2),
      makeLove(6, 2),
      makeText(8, 2, 'FLAG'),
      makeIs(9, 2),
      makeWin(10, 2),
    ],
  },
];

export function getLevelById(id: string): Level | undefined {
  return levels.find(l => l.id === id);
}
