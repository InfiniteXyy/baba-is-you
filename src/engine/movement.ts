// Movement engine: handles player input, collision, and state transitions
import { Grid, cloneGrid, moveEntity, removeEntity, getEntitiesAt } from './grid';
import { Entity, Position } from './entities';
import { evaluateRules, getPropertiesForType } from './rules';

export type Direction = 'up' | 'down' | 'left' | 'right';

export function directionToOffset(dir: Direction): Position {
  switch (dir) {
    case 'up': return { x: 0, y: -1 };
    case 'down': return { x: 0, y: 1 };
    case 'left': return { x: -1, y: 0 };
    case 'right': return { x: 1, y: 0 };
  }
}

export interface GameTickResult {
  grid: Grid;
  won: boolean;
  moved: boolean;
}

export function tick(grid: Grid, dir: Direction): GameTickResult {
  const rules = evaluateRules(grid);
  const offset = directionToOffset(dir);

  // Find all YOU entities
  const youEntities: Entity[] = [];
  for (const entity of grid.entities.values()) {
    const props = getPropertiesForType(rules, entity.type);
    if (props.isYou) {
      youEntities.push(entity);
    }
  }

  if (youEntities.length === 0) {
    return { grid, won: false, moved: false };
  }

  const newGrid = cloneGrid(grid);
  const moves: Array<{ entityId: string; from: Position; to: Position }> = [];
  const destroys: string[] = []; // entity ids to destroy
  let hasMoved = false;

  // Calculate intended moves for all YOU entities
  for (const you of youEntities) {
    const newPos = { x: you.position.x + offset.x, y: you.position.y + offset.y };

    if (!isValidPosition(newGrid, newPos)) {
      moves.push({ entityId: you.id, from: you.position, to: you.position });
      continue;
    }

    const destEntities = getEntitiesAt(newGrid, newPos);

    // Check for WIN (YOU on WIN entity)
    for (const dest of destEntities) {
      const destProps = getPropertiesForType(rules, dest.type);
      if (destProps.isWin) {
        return { grid: newGrid, won: true, moved: true };
      }
    }

    // Check for STOP
    let blocked = false;
    for (const dest of destEntities) {
      const destProps = getPropertiesForType(rules, dest.type);
      if (destProps.isStop) {
        blocked = true;
        break;
      }
    }

    if (blocked) {
      moves.push({ entityId: you.id, from: you.position, to: you.position });
      continue;
    }

    // Check for PUSH - if dest has PUSH property, try to push it
    for (const dest of destEntities) {
      const destProps = getPropertiesForType(rules, dest.type);
      if (destProps.isPush) {
        const pushPos = { x: newPos.x + offset.x, y: newPos.y + offset.y };
        if (isValidPosition(newGrid, pushPos)) {
          const pushDestEntities = getEntitiesAt(newGrid, pushPos);
          let canPush = true;
          for (const pde of pushDestEntities) {
            const pdeProps = getPropertiesForType(rules, pde.type);
            if (pdeProps.isStop || pdeProps.isPush) {
              canPush = false;
              break;
            }
          }
          if (canPush) {
            // Push the entity
            moveEntity(newGrid, dest.id, pushPos);
            hasMoved = true;
          } else {
            blocked = true;
          }
        } else {
          blocked = true;
        }
        break;
      }
    }

    if (blocked) {
      moves.push({ entityId: you.id, from: you.position, to: you.position });
      continue;
    }

    // Check for LOVE/HATE interactions
    for (const dest of destEntities) {
      const destProps = getPropertiesForType(rules, dest.type);
      if (destProps.isLove || destProps.isHate) {
        // Destroy the other entity
        destroys.push(dest.id);
      }
    }

    moves.push({ entityId: you.id, from: you.position, to: newPos });
    hasMoved = true;
  }

  // Apply destroys
  for (const id of destroys) {
    removeEntity(newGrid, id);
  }

  // Apply moves
  for (const m of moves) {
    if (m.from.x !== m.to.x || m.from.y !== m.to.y) {
      moveEntity(newGrid, m.entityId, m.to);
    }
  }

  return { grid: newGrid, won: false, moved: hasMoved };
}

function isValidPosition(grid: Grid, pos: Position): boolean {
  return pos.x >= 0 && pos.x < grid.width && pos.y >= 0 && pos.y < grid.height;
}
