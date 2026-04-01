// Rule engine: parses "X IS Y" patterns from text entities on the grid
import { Grid, getEntitiesAt } from './grid';
import { Entity, TextWord } from './entities';

export type PropertyName = 'isYou' | 'isWin' | 'isPush' | 'isStop' | 'isLove' | 'isHate' | 'isKill';

export interface EffectiveProperties {
  isYou: boolean;
  isWin: boolean;
  isPush: boolean;
  isStop: boolean;
  isLove: boolean;
  isHate: boolean;
  isKill: boolean;
}

export type RuleSet = Map<string, EffectiveProperties>; // entityType -> properties

const EMPTY_PROPS: EffectiveProperties = {
  isYou: false,
  isWin: false,
  isPush: false,
  isStop: false,
  isLove: false,
  isHate: false,
  isKill: false,
};

// Entity names that can appear as subject OR predicate (noun-is-noun transformation)
export const ENTITY_KEYWORDS: TextWord[] = ['BABA', 'WALL', 'ROCK', 'FLAG'];

// Keywords that can appear as the predicate of a rule
const PROPERTY_KEYWORDS: TextWord[] = ['YOU', 'WIN', 'PUSH', 'STOP', 'LOVE', 'HATE'];

function propertyNameFromWord(word: TextWord): PropertyName | null {
  switch (word) {
    case 'YOU': return 'isYou';
    case 'WIN': return 'isWin';
    case 'PUSH': return 'isPush';
    case 'STOP': return 'isStop';
    case 'LOVE': return 'isLove';
    case 'HATE': return 'isHate';
    default: return null;
  }
}

// Extract a property keyword from an entity, handling both dedicated property types
// (TEXT_YOU, TEXT_WIN, etc.) and TEXT_WORD entities with property keywords.
function getPropertyFromEntity(entity: Entity): TextWord | null {
  switch (entity.type) {
    case 'TEXT_YOU': return 'YOU';
    case 'TEXT_WIN': return 'WIN';
    case 'TEXT_PUSH': return 'PUSH';
    case 'TEXT_STOP': return 'STOP';
    case 'TEXT_LOVE': return 'LOVE';
    case 'TEXT_HATE': return 'HATE';
  }
  if (entity.type === 'TEXT_WORD' && entity.word && PROPERTY_KEYWORDS.includes(entity.word)) {
    return entity.word;
  }
  return null;
}

// Extract an entity keyword from a predicate entity (for noun-is-noun rules)
function getEntityKeywordFromEntity(entity: Entity): TextWord | null {
  if (entity.type === 'TEXT_WORD' && entity.word && ENTITY_KEYWORDS.includes(entity.word)) {
    return entity.word;
  }
  return null;
}

function textWordToEntityType(word: TextWord): string {
  return word; // BABA, WALL, ROCK, FLAG
}

// Scan a single line (horizontal or vertical) for "WORD IS PROPERTY/NOUN [AND PROPERTY/NOUN...]" patterns
function scanLine(
  grid: Grid,
  startX: number,
  startY: number,
  dx: number,
  dy: number,
  length: number,
  rules: Map<string, EffectiveProperties>,
  transformations: Map<string, string>
): void {
  let i = 0;
  while (i < length) {
    const x = startX + i * dx;
    const y = startY + i * dy;
    const cellEntities = getEntitiesAt(grid, { x, y });

    const textWordEntity = cellEntities.find(e => e.type === 'TEXT_WORD' && e.word);
    if (!textWordEntity) {
      i++;
      continue;
    }

    // Check if next cell has TEXT_IS
    const ni = i + 1;
    if (ni >= length) { i++; continue; }
    const nextCell = getEntitiesAt(grid, { x: startX + ni * dx, y: startY + ni * dy });
    const hasIs = nextCell.some(e => e.type === 'TEXT_IS');
    if (!hasIs) {
      i++;
      continue;
    }

    const subjectWord = textWordEntity.word!;
    const subjectType = textWordToEntityType(subjectWord);

    const predicates: Array<{ kind: 'property' | 'entity'; word: TextWord }> = [];
    let si = i + 2;

    while (si < length) {
      const sx = startX + si * dx;
      const sy = startY + si * dy;
      const scanCell = getEntitiesAt(grid, { x: sx, y: sy });
      const hasAnd = scanCell.some(e => e.type === 'TEXT_AND');
      const hasIsNext = scanCell.some(e => e.type === 'TEXT_IS');

      if (hasAnd) { si++; continue; }
      if (hasIsNext) { break; }

      const propertyEntity = scanCell.find(e => getPropertyFromEntity(e) !== null);
      const entityKeywordEntity = scanCell.find(e => getEntityKeywordFromEntity(e) !== null);
      if (propertyEntity) {
        predicates.push({ kind: 'property', word: getPropertyFromEntity(propertyEntity)! });
      } else if (entityKeywordEntity) {
        predicates.push({ kind: 'entity', word: getEntityKeywordFromEntity(entityKeywordEntity)! });
      } else {
        break;
      }
      si++;
    }

    if (predicates.length > 0) {
      for (const pred of predicates) {
        if (pred.kind === 'property') {
          if (!rules.has(subjectType)) {
            rules.set(subjectType, { ...EMPTY_PROPS });
          }
          const props = rules.get(subjectType)!;
          const propName = propertyNameFromWord(pred.word);
          if (propName) {
            (props as any)[propName] = true;
          }
        } else {
          // noun-is-noun transformation
          const targetType = textWordToEntityType(pred.word);
          if (subjectType !== targetType) {
            transformations.set(subjectType, targetType);
          }
        }
      }
    }

    i = si;
  }
}

export function evaluateRules(grid: Grid): RuleSet {
  const rules = new Map<string, EffectiveProperties>();
  const transformations = new Map<string, string>();

  // Scan each row (horizontal, left-to-right)
  for (let y = 0; y < grid.height; y++) {
    scanLine(grid, 0, y, 1, 0, grid.width, rules, transformations);
  }

  // Scan each column (vertical, top-to-bottom)
  for (let x = 0; x < grid.width; x++) {
    scanLine(grid, x, 0, 0, 1, grid.height, rules, transformations);
  }

  return rules;
}

// Evaluate noun-is-noun transformation rules and return source->target mappings.
// Resolves chains (WALL->ROCK, ROCK->FLAG => WALL->FLAG, ROCK->FLAG)
// and detects cycles (WALL->ROCK, ROCK->WALL => simultaneous swap).
export function evaluateTransformations(grid: Grid): Map<string, string> {
  const rules = new Map<string, EffectiveProperties>();
  const rawTransformations = new Map<string, string>();

  for (let y = 0; y < grid.height; y++) {
    scanLine(grid, 0, y, 1, 0, grid.width, rules, rawTransformations);
  }
  for (let x = 0; x < grid.width; x++) {
    scanLine(grid, x, 0, 0, 1, grid.height, rules, rawTransformations);
  }

  if (rawTransformations.size === 0) return rawTransformations;

  // Resolve chains: follow each mapping to its final target.
  // Detect cycles by tracking visited nodes during chain resolution.
  const resolved = new Map<string, string>();
  for (const source of rawTransformations.keys()) {
    const visited = new Set<string>();
    let current = source;
    visited.add(current);

    while (rawTransformations.has(current)) {
      const next = rawTransformations.get(current)!;
      if (visited.has(next)) {
        // Cycle detected — keep original direct mappings for swap
        break;
      }
      visited.add(next);
      current = next;
    }

    if (current !== source) {
      resolved.set(source, current);
    }
  }

  return resolved;
}

// Get properties for an entity type from the rule set.
// Text entities are always pushable — this is a core game mechanic.
export function getPropertiesForType(rules: RuleSet, type: string): EffectiveProperties {
  const props = rules.get(type) ?? { ...EMPTY_PROPS };
  if (type.startsWith('TEXT_')) {
    return { ...props, isPush: true };
  }
  return props;
}

// Get all entities that have a given property
export function getEntitiesWithProperty(
  grid: Grid,
  rules: RuleSet,
  prop: PropertyName
): Entity[] {
  const result: Entity[] = [];
  for (const entity of grid.entities.values()) {
    const props = rules.get(entity.type);
    if (props && (props as any)[prop]) {
      result.push(entity);
    }
    // Also check if any type mapping applies (e.g., ROCK with PUSH property)
    // The entity type itself should match the rule subject
  }
  return result;
}
