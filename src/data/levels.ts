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

export const levels: Level[] = [
  // Level 1: "First Steps" - Baba + Flag, no rules yet
  // Player touches flag directly to win (no rules needed)
  {
    id: 'first-steps',
    name: 'First Steps',
    width: 11,
    height: 9,
    entities: [
      createEntity('BABA', { x: 2, y: 4 }),
      createEntity('FLAG', { x: 8, y: 4 }),
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
    ],
  },

  // Level 5: "Love" - ROCK LOVE BABA - touch rock to win
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
