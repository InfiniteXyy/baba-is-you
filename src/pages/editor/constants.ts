import { TextWord } from '../../engine/entities';

export const CELL_SIZE = 28;
export const DEFAULT_WIDTH = 24;
export const DEFAULT_HEIGHT = 18;

export type PlaceTool = string;

export interface PaletteItem {
  type: PlaceTool;
  label: string;
  textureName: string;
  isText?: boolean;
  word?: TextWord;
}

export interface QuickPattern {
  label: string;
  entities: { type: string; word?: string; offsetX: number }[];
}

export interface SavedMap {
  id: string;
  name: string;
  updatedAt: number;
  data: string;
}

export const QUICK_PATTERNS: QuickPattern[] = [
  { label: 'BABA IS YOU', entities: [
    { type: 'TEXT_WORD', word: 'BABA', offsetX: 0 },
    { type: 'TEXT_IS', offsetX: 1 },
    { type: 'TEXT_YOU', offsetX: 2 },
  ]},
  { label: 'WALL IS STOP', entities: [
    { type: 'TEXT_WORD', word: 'WALL', offsetX: 0 },
    { type: 'TEXT_IS', offsetX: 1 },
    { type: 'TEXT_STOP', offsetX: 2 },
  ]},
  { label: 'ROCK IS PUSH', entities: [
    { type: 'TEXT_WORD', word: 'ROCK', offsetX: 0 },
    { type: 'TEXT_IS', offsetX: 1 },
    { type: 'TEXT_PUSH', offsetX: 2 },
  ]},
  { label: 'FLAG IS WIN', entities: [
    { type: 'TEXT_WORD', word: 'FLAG', offsetX: 0 },
    { type: 'TEXT_IS', offsetX: 1 },
    { type: 'TEXT_WIN', offsetX: 2 },
  ]},
  { label: 'WATER IS SINK', entities: [
    { type: 'TEXT_WORD', word: 'WATER', offsetX: 0 },
    { type: 'TEXT_IS', offsetX: 1 },
    { type: 'TEXT_SINK', offsetX: 2 },
  ]},
  { label: 'KEY IS OPEN', entities: [
    { type: 'TEXT_WORD', word: 'KEY', offsetX: 0 },
    { type: 'TEXT_IS', offsetX: 1 },
    { type: 'TEXT_OPEN', offsetX: 2 },
  ]},
  { label: 'DOOR IS SHUT', entities: [
    { type: 'TEXT_WORD', word: 'DOOR', offsetX: 0 },
    { type: 'TEXT_IS', offsetX: 1 },
    { type: 'TEXT_SHUT', offsetX: 2 },
  ]},
  { label: 'LAVA IS HOT', entities: [
    { type: 'TEXT_WORD', word: 'LAVA', offsetX: 0 },
    { type: 'TEXT_IS', offsetX: 1 },
    { type: 'TEXT_HOT', offsetX: 2 },
  ]},
];

export const CHARACTER_PALETTE: PaletteItem[] = [
  'BABA', 'WALL', 'ROCK', 'FLAG', 'CRAB', 'WATER', 'LAVA', 'GRASS', 'FLOWER',
  'ALGAE', 'BRICK', 'BUBBLE', 'COG', 'DOOR', 'ICE', 'JELLY', 'KEY', 'PILLAR',
  'PIPE', 'ROBOT', 'SKULL', 'STAR', 'TILE',
].map(name => ({ type: name, label: name, textureName: name }));

export const NOUN_PALETTE: PaletteItem[] = [
  'BABA', 'WALL', 'ROCK', 'FLAG', 'CRAB', 'WATER', 'LAVA', 'GRASS', 'ICE', 'JELLY',
  'COG', 'DOOR', 'KEY', 'PILLAR', 'PIPE', 'ROBOT', 'SKULL', 'STAR',
].map(name => ({ type: `NOUN_${name}`, label: name, textureName: `Text_${name}`, isText: true, word: name as TextWord }));

export const OPERATOR_PALETTE: PaletteItem[] = [
  { type: 'TEXT_IS', label: 'IS', textureName: 'Text_IS', isText: true },
  { type: 'TEXT_AND', label: 'AND', textureName: 'Text_AND', isText: true },
];

export const PROPERTY_PALETTE: PaletteItem[] = [
  'YOU', 'WIN', 'PUSH', 'STOP', 'LOVE', 'HATE', 'DEFEAT',
  'SINK', 'HOT', 'MELT', 'FLOAT', 'MOVE', 'OPEN', 'SHUT', 'WEAK',
].map(name => ({ type: `TEXT_${name}`, label: name, textureName: `Text_${name}`, isText: true }));

export function fallbackColor(type: string): string {
  if (type.startsWith('TEXT_')) return '#ffff00';
  switch (type) {
    case 'BABA': return '#ffffff';
    case 'WALL': return '#8B4513';
    case 'ROCK': return '#808080';
    case 'FLAG': return '#ff4444';
    default: return '#cccccc';
  }
}
