// Entity type definitions for Baba Is You
// EntityType is a string to support arbitrary community entity types
export type EntityType = string;

// Known entity types for reference
export const CHARACTER_TYPES = ['BABA', 'WALL', 'ROCK', 'FLAG', 'CRAB'] as const;

export type TextWord =
  | 'BABA'
  | 'WALL'
  | 'ROCK'
  | 'FLAG'
  | 'CRAB'
  | 'YOU'
  | 'WIN'
  | 'PUSH'
  | 'STOP'
  | 'LOVE'
  | 'HATE'
  | 'DEFEAT';

export interface Entity {
  id: string;
  type: EntityType;
  position: Position;
  word?: TextWord;
  textureName: string;
}

export interface Position {
  x: number;
  y: number;
}

let entityCounter = 0;

export function resetEntityCounter(): void {
  entityCounter = 0;
}

export function deriveTextureName(type: EntityType, word?: TextWord): string {
  if (type === 'TEXT_WORD' && word) return `Text_${word}`;
  if (type.startsWith('TEXT_')) return `Text_${type.slice(5)}`;
  return type;
}

export function createEntity(
  type: EntityType,
  position: Position,
  word?: TextWord
): Entity {
  const id = `${type}-${position.x}-${position.y}-${++entityCounter}`;
  return {
    id,
    type,
    position: { ...position },
    ...(word !== undefined && { word }),
    textureName: deriveTextureName(type, word),
  };
}

export function posKey(pos: Position): string {
  return `${pos.x},${pos.y}`;
}

export function parsePosKey(key: string): Position {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}
