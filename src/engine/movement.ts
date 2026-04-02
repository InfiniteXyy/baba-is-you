// Movement engine: handles player input, collision, and state transitions
import { Grid, cloneGrid, moveEntity, removeEntity, getEntitiesAt } from './grid';
import { Entity, EntityType, Facing, Position } from './entities';
import { evaluateRules, evaluateTransformations, getPropertiesForType } from './rules';

export type Direction = 'up' | 'down' | 'left' | 'right';

export function directionToOffset(dir: Direction): Position {
  switch (dir) {
    case 'up': return { x: 0, y: -1 };
    case 'down': return { x: 0, y: 1 };
    case 'left': return { x: -1, y: 0 };
    case 'right': return { x: 1, y: 0 };
  }
}

export interface EntityMovement {
  entityId: string;
  from: Position;
  to: Position;
}

export interface GameTickResult {
  grid: Grid;
  won: boolean;
  dead: boolean;
  moved: boolean;
  movements: EntityMovement[];
}

export function tick(grid: Grid, dir: Direction): GameTickResult {
  const workGrid = cloneGrid(grid);

  // Phase 1: Apply noun-is-noun transformations (permanent, like original game)
  const transformations = evaluateTransformations(workGrid);
  if (transformations.size > 0) {
    for (const entity of workGrid.entities.values()) {
      if (entity.type.startsWith('TEXT_')) continue;
      const target = transformations.get(entity.type);
      if (target) {
        entity.type = target as EntityType;
      }
    }
  }

  // Phase 2: Evaluate rules (after transformation, entity composition may have changed)
  const rules = evaluateRules(workGrid);
  const offset = directionToOffset(dir);

  // Find all YOU entities
  const youEntities: Entity[] = [];
  for (const entity of workGrid.entities.values()) {
    const props = getPropertiesForType(rules, entity.type);
    if (props.isYou) {
      youEntities.push(entity);
    }
  }

  if (youEntities.length === 0) {
    const transformed = transformations.size > 0;
    return { grid: workGrid, won: false, dead: false, moved: transformed, movements: [] };
  }

  const newGrid = cloneGrid(workGrid);
  const moves: Array<{ entityId: string; from: Position; to: Position }> = [];
  const destroys: string[] = [];
  const allMovements: EntityMovement[] = [];
  let hasMoved = transformations.size > 0;

  // Sort YOU entities so the frontmost in the movement direction are processed first.
  // This ensures that if a front entity is blocked, entities behind it see the blockage.
  youEntities.sort((a, b) => {
    if (offset.x !== 0) return (b.position.x - a.position.x) * offset.x;
    return (b.position.y - a.position.y) * offset.y;
  });

  // Track positions occupied by blocked YOU entities so trailing ones don't overlap
  const blockedPositions = new Set<string>();
  const youEntityIds = new Set(youEntities.map(e => e.id));

  for (const you of youEntities) {
    const newPos = { x: you.position.x + offset.x, y: you.position.y + offset.y };

    if (!isValidPosition(newGrid, newPos)) {
      blockedPositions.add(`${you.position.x},${you.position.y}`);
      moves.push({ entityId: you.id, from: you.position, to: you.position });
      continue;
    }

    // Check if target cell is occupied by a blocked YOU entity
    if (blockedPositions.has(`${newPos.x},${newPos.y}`)) {
      blockedPositions.add(`${you.position.x},${you.position.y}`);
      moves.push({ entityId: you.id, from: you.position, to: you.position });
      continue;
    }

    const destEntities = getEntitiesAt(newGrid, newPos);
    // Exclude fellow YOU entities from obstacle checks — they're moving too
    const nonYouDest = destEntities.filter(e => !youEntityIds.has(e.id));

    // Check for WIN
    for (const dest of nonYouDest) {
      const destProps = getPropertiesForType(rules, dest.type);
      if (destProps.isWin) {
        return { grid: newGrid, won: true, dead: false, moved: true, movements: [] };
      }
    }

    // Check for STOP
    let blocked = false;
    for (const dest of nonYouDest) {
      const destProps = getPropertiesForType(rules, dest.type);
      if (destProps.isStop) {
        blocked = true;
        break;
      }
    }

    if (blocked) {
      blockedPositions.add(`${you.position.x},${you.position.y}`);
      moves.push({ entityId: you.id, from: you.position, to: you.position });
      continue;
    }

    // Chain push: walk in movement direction collecting all pushable non-YOU entities
    {
      const pushChain: Entity[][] = [];
      let chainPos = { ...newPos };
      let chainBlocked = false;
      let hasPushAtStart = false;

      while (true) {
        const cellEntities = getEntitiesAt(newGrid, chainPos);
        // Only consider non-YOU entities for push chains
        const nonYouCell = cellEntities.filter(e => !youEntityIds.has(e.id));
        const pushableInCell: Entity[] = [];
        let cellHasStop = false;

        for (const e of nonYouCell) {
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
          break;
        }

        if (pushChain.length === 0) hasPushAtStart = true;
        pushChain.push(pushableInCell);

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
          for (let i = pushChain.length - 1; i >= 0; i--) {
            for (const e of pushChain[i]) {
              const from = { ...e.position };
              const target = { x: e.position.x + offset.x, y: e.position.y + offset.y };
              moveEntity(newGrid, e.id, target);
              allMovements.push({ entityId: e.id, from, to: target });
              // Update facing for pushed entities
              if (offset.x < 0) e.facing = 'left';
              else if (offset.x > 0) e.facing = 'right';
            }
          }
          hasMoved = true;
        }
      }
    }

    if (blocked) {
      blockedPositions.add(`${you.position.x},${you.position.y}`);
      moves.push({ entityId: you.id, from: you.position, to: you.position });
      continue;
    }

    // Check for DEFEAT/LOVE/HATE interactions with YOU
    const youProps = getPropertiesForType(rules, you.type);
    for (const dest of nonYouDest) {
      const destProps = getPropertiesForType(rules, dest.type);
      if (destProps.isDefeat) {
        destroys.push(you.id);
      }
      if (destProps.isLove || destProps.isHate) {
        destroys.push(dest.id);
      }
      // HOT + MELT: if dest is HOT and YOU is MELT, YOU is destroyed
      if (destProps.isHot && youProps.isMelt) {
        destroys.push(you.id);
      }
      // OPEN + SHUT: if YOU is OPEN and dest is SHUT (or vice versa), both destroyed
      if ((youProps.isOpen && destProps.isShut) || (youProps.isShut && destProps.isOpen)) {
        destroys.push(you.id);
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

  // Determine facing from movement direction
  const facing: Facing | null = dir === 'left' ? 'left' : dir === 'right' ? 'right' : null;

  // Apply moves
  for (const m of moves) {
    if (m.from.x !== m.to.x || m.from.y !== m.to.y) {
      moveEntity(newGrid, m.entityId, m.to);
      allMovements.push({ entityId: m.entityId, from: m.from, to: m.to });
      // Update facing for entities that moved horizontally
      const ent = newGrid.entities.get(m.entityId);
      if (ent && facing) {
        ent.facing = facing;
      }
    }
  }

  // Post-move: SINK — any SINK entity sharing a cell with a non-SINK entity destroys both
  const sinkDestroys = new Set<string>();
  for (const entity of newGrid.entities.values()) {
    const props = getPropertiesForType(rules, entity.type);
    if (props.isSink) {
      const others = getEntitiesAt(newGrid, entity.position);
      for (const other of others) {
        if (other.id !== entity.id) {
          sinkDestroys.add(entity.id);
          sinkDestroys.add(other.id);
        }
      }
    }
  }
  for (const id of sinkDestroys) {
    removeEntity(newGrid, id);
  }

  // Post-move: WEAK entities overlapping with other entities are destroyed
  const weakDestroys: string[] = [];
  for (const entity of newGrid.entities.values()) {
    const props = getPropertiesForType(rules, entity.type);
    if (props.isWeak) {
      const others = getEntitiesAt(newGrid, entity.position);
      if (others.length > 1) {
        weakDestroys.push(entity.id);
      }
    }
  }
  for (const id of weakDestroys) {
    removeEntity(newGrid, id);
  }

  // Check if all YOU entities were destroyed this tick (death)
  const postRules = evaluateRules(newGrid);
  let hasYou = false;
  for (const entity of newGrid.entities.values()) {
    if (getPropertiesForType(postRules, entity.type).isYou) {
      hasYou = true;
      break;
    }
  }
  const dead = !hasYou && youEntities.length > 0;

  return { grid: newGrid, won: false, dead, moved: hasMoved, movements: allMovements };
}

function isValidPosition(grid: Grid, pos: Position): boolean {
  return pos.x >= 0 && pos.x < grid.width && pos.y >= 0 && pos.y < grid.height;
}
