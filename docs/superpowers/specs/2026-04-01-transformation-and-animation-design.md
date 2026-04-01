# Entity Transformation & Push Animation

## Overview

Two features for the Baba Is You game:
1. **Entity transformation rules** — "NOUN IS NOUN" (e.g., WALL IS ROCK) transforms all entities of the subject type into the object type
2. **Push animation** — 80ms 2-frame pixel snap when entities move

## Feature 1: Entity Transformation

### Behavior

When the rule engine detects a "NOUN IS NOUN" pattern (where the predicate is an entity name like BABA, WALL, ROCK, FLAG — not a property keyword like YOU, WIN, PUSH), all entities of the subject type instantly become the object type.

- Transformation happens once per tick, before movement processing
- The new type's rules apply immediately in the same tick
- TEXT_* entities are never transformed (rule tiles stay as-is)
- Chain transformations resolve in a single pass: if WALL IS ROCK and ROCK IS FLAG both exist, walls become rocks, then rocks (including former walls) become flags
- Cycle detection: if WALL IS ROCK and ROCK IS WALL both exist, perform a simultaneous swap — don't infinite loop

### Implementation

**File: `src/engine/rules.ts`**

Add a new return value from `evaluateRules` (or a separate `evaluateTransformations` function) that collects noun-to-noun mappings alongside the existing property rules. The scanning logic already walks "WORD IS ..." patterns; extend the predicate check to recognize entity-name words (BABA, WALL, ROCK, FLAG) in addition to property keywords.

Return type: `Map<string, string>` mapping source entity type to target entity type.

**File: `src/engine/movement.ts`**

In `tick()`, after calling `evaluateRules()` and before the movement loop:
1. Call the transformation function to get the type mappings
2. Iterate over all entities in the grid; for each entity whose type has a mapping, change its `type` to the target type (skip TEXT_* entities)
3. Re-evaluate rules after transformation (since the entity composition changed, rules may differ)

### Entity names vs property keywords

Current `TextWord` type includes both entity names (BABA, WALL, ROCK, FLAG) and property keywords (YOU, WIN, PUSH, STOP, LOVE, HATE). The rule scanner must distinguish between them:
- Entity names: BABA, WALL, ROCK, FLAG
- Property keywords: YOU, WIN, PUSH, STOP, LOVE, HATE

Define an `ENTITY_KEYWORDS` array for entity names. When scanning predicates, check entity keywords first for noun-is-noun rules, then property keywords for noun-is-property rules.

## Feature 2: Push Animation (80ms Pixel Snap)

### Behavior

When entities move (both YOU entities and pushed entities), they visually snap from their old position to their new position over 80ms in 2 discrete steps, creating a retro pixel-snap feel.

All entities in a push chain animate simultaneously. Failed moves (blocked) produce no animation.

### Implementation

**File: `src/engine/movement.ts`**

Extend `GameTickResult` to include movement data:

```typescript
export interface EntityMovement {
  entityId: string;
  from: Position;
  to: Position;
}

export interface GameTickResult {
  grid: Grid;
  won: boolean;
  moved: boolean;
  movements: EntityMovement[];  // NEW
}
```

Collect all actual position changes (from the `moves` array and push chain moves) into the `movements` array. Only include moves where `from !== to`.

**File: `src/pages/Play.tsx`**

1. Add `data-entity-id={id}` attribute to each entity `<div>` in the render
2. After a tick with movements, for each movement:
   - Calculate the pixel offset from new position back to old position: `dx = (from.x - to.x) * CELL_SIZE`, `dy = (from.y - to.y) * CELL_SIZE`
   - Set the entity element's `transform: translate(dx, dy)` with no transition (entity appears at old position)
   - In a `requestAnimationFrame`, set `transition: transform 80ms steps(2, end)` and `transform: translate(0, 0)` (entity snaps to new position)
3. After 80ms, remove inline styles

Use a ref to track animation state and prevent new moves during the 80ms animation window (input debouncing).

**File: `src/pages/Play.css`**

No new keyframe animations needed — the animation is driven entirely by inline CSS transforms and transitions applied via JS.

## Out of Scope

- Transformation visual effects (morphing, particles) — transformations are instant
- Sound effects
- Undo animation (undo is instant, no reverse animation)
