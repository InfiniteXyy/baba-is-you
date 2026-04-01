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

function textWordToEntityType(word: TextWord): string {
  return word; // BABA, WALL, ROCK, FLAG
}

export function evaluateRules(grid: Grid): RuleSet {
  const rules = new Map<string, EffectiveProperties>(); // subject word -> accumulated props

  // Scan each row for "WORD IS WORD [AND WORD...]" patterns
  for (let y = 0; y < grid.height; y++) {
    let x = 0;
    while (x < grid.width) {
      const cellEntities = getEntitiesAt(grid, { x, y });

      // Get text entities by type
      const textWordEntities = cellEntities.filter(e => e.type === 'TEXT_WORD' && e.word);
      const textIsEntities = cellEntities.filter(e => e.type === 'TEXT_IS');

      // Need at least a WORD + IS
      if (textWordEntities.length === 0 || textIsEntities.length === 0) {
        x++;
        continue;
      }

      const subjectWord = textWordEntities[0].word!;
      const subjectType = textWordToEntityType(subjectWord);

      // Find all predicate words after IS (scan rightward)
      const predicates: TextWord[] = [];
      let scanX = x + 1;

      // Move past the IS entity
      while (scanX < grid.width) {
        const scanCell = getEntitiesAt(grid, { x: scanX, y });
        const hasAnd = scanCell.some(e => e.type === 'TEXT_AND');
        const hasIs = scanCell.some(e => e.type === 'TEXT_IS');
        const wordEntity = scanCell.find(e => e.type === 'TEXT_WORD' && e.word);

        if (hasAnd) {
          scanX++;
          continue;
        }
        if (hasIs) {
          // Hit another IS, stop scanning predicates
          break;
        }
        if (wordEntity) {
          const w = wordEntity.word!;
          if (PROPERTY_KEYWORDS.includes(w)) {
            predicates.push(w);
          } else {
            // Could be another subject, stop
            break;
          }
        } else {
          // Empty cell or non-text entity, stop
          break;
        }
        scanX++;
      }

      if (predicates.length > 0) {
        // Apply predicates to subject
        if (!rules.has(subjectType)) {
          rules.set(subjectType, { ...EMPTY_PROPS });
        }
        const props = rules.get(subjectType)!;
        for (const pred of predicates) {
          const propName = propertyNameFromWord(pred);
          if (propName) {
            (props as any)[propName] = true;
          }
        }
      }

      x = scanX;
    }
  }

  return rules;
}

// Get properties for an entity type from the rule set
export function getPropertiesForType(rules: RuleSet, type: string): EffectiveProperties {
  return rules.get(type) ?? { ...EMPTY_PROPS };
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
