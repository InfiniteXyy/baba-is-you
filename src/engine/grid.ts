// Grid types and operations
import { Entity, Position } from './entities';

export interface Cell {
  entities: string[]; // entity IDs in this cell
}

export interface Grid {
  width: number;
  height: number;
  cells: Cell[][]; // [y][x]
  entities: Map<string, Entity>; // entityId -> Entity
}

export function createGrid(width: number, height: number): Grid {
  const cells: Cell[][] = [];
  for (let y = 0; y < height; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < width; x++) {
      row.push({ entities: [] });
    }
    cells.push(row);
  }
  return { width, height, cells, entities: new Map() };
}

export function addEntity(grid: Grid, entity: Entity): void {
  grid.entities.set(entity.id, entity);
  const cell = grid.cells[entity.position.y]?.[entity.position.x];
  if (cell && !cell.entities.includes(entity.id)) {
    cell.entities.push(entity.id);
  }
}

export function removeEntity(grid: Grid, entityId: string): void {
  const entity = grid.entities.get(entityId);
  if (entity) {
    const cell = grid.cells[entity.position.y]?.[entity.position.x];
    if (cell) {
      cell.entities = cell.entities.filter(id => id !== entityId);
    }
    grid.entities.delete(entityId);
  }
}

export function moveEntity(grid: Grid, entityId: string, newPos: Position): void {
  const entity = grid.entities.get(entityId);
  if (!entity) return;

  // Remove from old cell
  const oldCell = grid.cells[entity.position.y]?.[entity.position.x];
  if (oldCell) {
    oldCell.entities = oldCell.entities.filter(id => id !== entityId);
  }

  // Update position
  entity.position = { ...newPos };

  // Add to new cell
  const newCell = grid.cells[newPos.y]?.[newPos.x];
  if (newCell && !newCell.entities.includes(entityId)) {
    newCell.entities.push(entityId);
  }
}

export function getEntitiesAt(grid: Grid, pos: Position): Entity[] {
  const cell = grid.cells[pos.y]?.[pos.x];
  if (!cell) return [];
  return cell.entities.map(id => grid.entities.get(id)).filter((e): e is Entity => e !== undefined);
}

export function getEntityAt(grid: Grid, pos: Position): Entity | undefined {
  return getEntitiesAt(grid, pos)[0];
}

export function isValidPosition(grid: Grid, pos: Position): boolean {
  return pos.x >= 0 && pos.x < grid.width && pos.y >= 0 && pos.y < grid.height;
}

export function cloneGrid(grid: Grid): Grid {
  const newCells: Cell[][] = [];
  for (let y = 0; y < grid.height; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < grid.width; x++) {
      row.push({ entities: [...grid.cells[y][x].entities] });
    }
    newCells.push(row);
  }
  const newEntities = new Map(
    Array.from(grid.entities.entries()).map(([id, entity]) => [
      id,
      { ...entity, position: { ...entity.position } },
    ])
  );
  return { width: grid.width, height: grid.height, cells: newCells, entities: newEntities };
}

export function gridToLevelData(grid: Grid): { id: string; name: string; width: number; height: number; entities: Entity[] } {
  return {
    id: 'custom',
    name: 'Custom Level',
    width: grid.width,
    height: grid.height,
    entities: Array.from(grid.entities.values()),
  };
}

export function levelDataToGrid(data: { width: number; height: number; entities: Entity[] }): Grid {
  const grid = createGrid(data.width, data.height);
  for (const entity of data.entities) {
    addEntity(grid, entity);
  }
  return grid;
}
