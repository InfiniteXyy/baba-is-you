// Entity type definitions for Baba Is You
// Entity types as strings - no baked properties, properties come from rules

export type EntityType =
  | 'BABA'
  | 'WALL'
  | 'ROCK'
  | 'FLAG'
  | 'TEXT_WORD'
  | 'TEXT_IS'
  | 'TEXT_AND'
  | 'TEXT_YOU'
  | 'TEXT_WIN'
  | 'TEXT_PUSH'
  | 'TEXT_STOP'
  | 'TEXT_LOVE'
  | 'TEXT_HATE';

export type TextWord =
  | 'BABA'
  | 'WALL'
  | 'ROCK'
  | 'FLAG'
  | 'YOU'
  | 'WIN'
  | 'PUSH'
  | 'STOP'
  | 'LOVE'
  | 'HATE';

export interface Entity {
  id: string;
  type: EntityType;
  position: Position;
  // For TEXT_WORD entities, the actual word value
  word?: TextWord;
}

export interface Position {
  x: number;
  y: number;
}

let entityCounter = 0;

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
  };
}

export function posKey(pos: Position): string {
  return `${pos.x},${pos.y}`;
}

export function parsePosKey(key: string): Position {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}
