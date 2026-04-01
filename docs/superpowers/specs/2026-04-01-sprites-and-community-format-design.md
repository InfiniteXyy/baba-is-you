# Sprite Rendering & Community Map Format

## Overview

Two changes:
1. Replace CSS-based entity visuals with sprite sheet rendering using `assets/game_sprites.webp`
2. Adopt the community map data format so levels from the community can be loaded directly

## Sprite Rendering

### Sprite Sheet

- **File:** `assets/game_sprites.webp` (2012×982, TexturePacker format)
- **Metadata:** `assets/game_sprites.json` with `frames`, `animations`, `meta` keys
- **Frame format:** Each frame has `frame: {x, y, w, h}` (crop rect in the sheet), `spriteSourceSize: {x, y, w, h}` (offset within 48×48 canvas), `sourceSize: {w: 48, h: 48}`
- **Animations:** 3 frames per sprite (e.g., `characters/BABA_00.png`, `_01`, `_02`), listed in `animations` key
- **Categories:** `characters/` (game entities), `nouns/` (text noun tiles), `operators/` (IS, AND, etc.), `properties/` (YOU, WIN, PUSH, etc.)

### Sprite Module (`src/engine/sprites.ts`)

New module that loads and exposes sprite data:

```typescript
interface SpriteFrame {
  x: number; y: number;  // position in sprite sheet
  w: number; h: number;  // size in sprite sheet
  offsetX: number; offsetY: number;  // offset within 48×48 canvas
}

function getSpriteFrameKey(textureName: string, frameIndex: number): string
// e.g., getSpriteFrameKey("BABA", 0) → "characters/BABA_00.png"
// The category prefix is resolved from a lookup or from the entity's species.

function getFrame(frameKey: string): SpriteFrame
```

The sprite JSON is imported statically (small enough to bundle). The `.webp` image is referenced via URL.

### Rendering Approach

Each entity `<div>` uses CSS background-image with the sprite sheet:

```css
.entity-sprite {
  width: 48px;
  height: 48px;
  background-image: url('/assets/game_sprites.webp');
  background-repeat: no-repeat;
  /* background-position and background-size set via inline style per entity */
}
```

For a frame at `{x, y, w, h}` in the sheet (2012×982), and `spriteSourceSize: {x: ox, y: oy}`:
- `background-position: -${x - ox}px -${y - oy}px`
- `background-size: 2012px 982px` (full sheet size, no scaling since cell = 48px = source size)

### Animation

- Global animation timer: `setInterval` at ~200ms cycling frame index `0 → 1 → 2 → 0`
- Frame index stored in React state (`animFrame`), triggers re-render
- All entities animate in sync (same frame index)
- Timer starts on level load, stops on unmount

### Cell Size

- Cell size changes from 40px to 48px (native sprite size, no scaling needed)
- Gap stays at 2px, so step = 50px

## Community Map Format

### Data Types

```typescript
interface ThingSetup {
  defaultBlockX: number;
  defaultBlockY: number;
  defaultTowards: number;  // direction, currently unused by engine
  textureName: string;     // sprite name (e.g., "BABA", "Text_BABA", "Text_IS")
}

interface ThingGroup {
  species: string;  // "characters" | "nouns" | "operators" | "properties"
  name: string;     // group name (e.g., "WALL", "Text_BABA", "Text_IS")
  thingSetup: ThingSetup[];
}

interface CommunityLevel {
  id: string;
  name: string;
  sceneWidth: number;
  sceneHeight: number;
  thingsMap: ThingGroup[];
}
```

### Level Loader (`src/data/levelLoader.ts`)

Converts `CommunityLevel` → internal `Grid`:

**Mapping rules:**
- `species: "characters"` → game entity. `textureName` = entity type (BABA, WALL, ROCK, FLAG, or unknown)
- `species: "nouns"` → text noun. `textureName` = `Text_BABA` → EntityType `TEXT_WORD` with `word = "BABA"`
- `species: "operators"` → text operator. `Text_IS` → EntityType `TEXT_IS`, `Text_AND` → `TEXT_AND`
- `species: "properties"` → text property. `Text_YOU` → `TEXT_YOU`, `Text_WIN` → `TEXT_WIN`, etc.

**Unknown entities:**
- Character types not in the engine (CRAB, ALGAE, etc.) get a generic EntityType string matching their textureName
- They render correctly via sprites but have no inherent game properties
- Rules can still assign properties to them (e.g., "CRAB IS DEFEAT" if engine supported it)

**Entity position:** `defaultBlockX` → `position.x`, `defaultBlockY` → `position.y`

### Entity Type Changes

The `EntityType` union in `entities.ts` becomes a string type to accommodate any community entity:

```typescript
export type EntityType = string;
// Known types still have constants for type checking in the engine
export const KNOWN_ENTITY_TYPES = ['BABA', 'WALL', 'ROCK', 'FLAG'] as const;
export const KNOWN_TEXT_TYPES = ['TEXT_WORD', 'TEXT_IS', 'TEXT_AND', 'TEXT_YOU', 'TEXT_WIN', 'TEXT_PUSH', 'TEXT_STOP', 'TEXT_LOVE', 'TEXT_HATE'] as const;
```

Each entity also stores its `textureName` and `species` for sprite lookup:

```typescript
export interface Entity {
  id: string;
  type: EntityType;
  position: Position;
  word?: TextWord;        // for TEXT_WORD entities
  textureName: string;    // sprite name for rendering
  species: string;        // sprite category for frame lookup
}
```

### Built-in Levels

All 6 built-in levels converted to the community JSON format in `src/data/levels/`. The `levels.ts` file imports these JSON files and exposes the same `levels` array and `getLevelById()` API.

Example structure:
```
src/data/
  levels/
    first-steps.json
    you.json
    push.json
    stop.json
    where-do-i-go.json
    love.json
  levelLoader.ts    // CommunityLevel → Grid converter
  levels.ts         // imports JSONs, exports levels array
```

### TextWord Type

`TextWord` also becomes a string type to support any noun from community maps:

```typescript
export type TextWord = string;
export const KNOWN_ENTITY_WORDS = ['BABA', 'WALL', 'ROCK', 'FLAG'] as const;
export const KNOWN_PROPERTY_WORDS = ['YOU', 'WIN', 'PUSH', 'STOP', 'LOVE', 'HATE'] as const;
```

The rule engine checks against `KNOWN_PROPERTY_WORDS` for property rules and `KNOWN_ENTITY_WORDS` (+ any character textureName) for noun-is-noun transformations.

### ENTITY_KEYWORDS Dynamic Resolution

Currently `ENTITY_KEYWORDS` is hardcoded to `['BABA', 'WALL', 'ROCK', 'FLAG']`. After this change, any character entity name encountered in the level is a valid entity keyword for noun-is-noun transformations. The level loader collects all character names present in the level and provides them to the rule engine.

## Files Changed

| File | Change |
|------|--------|
| `src/engine/entities.ts` | EntityType → string, add textureName/species fields |
| `src/engine/sprites.ts` | **New** — sprite frame lookup |
| `src/engine/rules.ts` | Use dynamic entity keywords from level data |
| `src/data/levelLoader.ts` | **New** — CommunityLevel → Grid converter |
| `src/data/levels.ts` | Import JSON levels, export via loader |
| `src/data/levels/*.json` | **New** — 6 built-in levels in community format |
| `src/pages/Play.tsx` | Sprite-based rendering, animation timer, 48px cells |
| `src/pages/Play.css` | Update entity styles for sprite rendering |

## Out of Scope

- New game properties (DEFEAT, MELT, SINK, etc.) — unknown types render but have no logic
- Directional sprites (defaultTowards is stored but not used for rendering)
- Level editor updates (editor can be updated separately)
- Sound effects
