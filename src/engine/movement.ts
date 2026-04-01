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

    // Check for PUSH - chain push: walk in movement direction collecting all pushable entities
    {
      const pushChain: Entity[][] = []; // each entry = pushable entities at one cell in the chain
      let chainPos = { ...newPos };
      let chainBlocked = false;
      let hasPushAtStart = false;

      while (true) {
        const cellEntities = getEntitiesAt(newGrid, chainPos);
        const pushableInCell: Entity[] = [];
        let cellHasStop = false;

        for (const e of cellEntities) {
          const props = getPropertiesForType(rules, e.type);
          if (props.isStop) {
            cellHasStop = true;
            break;
          }
          if (props.isPush) {
            pushableInCell.push(e);
          }
        }

        if (cellHasStop) {
          chainBlocked = true;
          break;
        }

        if (pushableInCell.length === 0) {
          // Empty cell (or no pushable/stop entities) — chain can resolve here
          break;
        }

        if (pushChain.length === 0) hasPushAtStart = true;
        pushChain.push(pushableInCell);

        // Advance to next cell in the chain
        chainPos = { x: chainPos.x + offset.x, y: chainPos.y + offset.y };
        if (!isValidPosition(newGrid, chainPos)) {
          chainBlocked = true;
          break;
        }
      }

      if (hasPushAtStart) {
        if (chainBlocked) {
          blocked = true;
        } else {
          // Move all chain entities one cell in movement direction, farthest first
          for (let i = pushChain.length - 1; i >= 0; i--) {
            for (const e of pushChain[i]) {
              const target = { x: e.position.x + offset.x, y: e.position.y + offset.y };
              moveEntity(newGrid, e.id, target);
            }
          }
          hasMoved = true;
        }
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
