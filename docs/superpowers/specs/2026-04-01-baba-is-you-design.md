# Baba Is You — Design Spec

## Overview

A browser-based implementation of the puzzle game "Baba Is You" using React, Vite, and TypeScript. The game features a rule-engine where players rearrange word tiles to change game mechanics. Includes a separate map editor accessible via `/editor` route.

---

## Tech Stack

- **Vite** — build tool
- **React 18** — UI framework
- **TypeScript** — type safety
- **React Router DOM** — routing (`/play`, `/editor`)
- **Pure CSS** — pixel-art aesthetic via CSS Grid, no external sprite assets

---

## Architecture

```
src/
  components/       # React UI components (shared)
  engine/            # Pure game logic (no React dependencies)
    grid.ts          # Grid, Cell, Entity types + helpers
    rules.ts         # Rule parser + rule engine
    movement.ts       # Movement + collision resolution
    entities.ts       # Entity type definitions
  data/
    levels.ts         # Built-in sample levels
  pages/
    Play.tsx          # Game page (/play)
    Editor.tsx        # Map editor page (/editor)
  App.tsx             # Router setup
  main.tsx
```

### Engine Design

**Grid**: 2D array of cells. Each cell holds entity IDs.

```typescript
type Position = { x: number; y: number };
type EntityId = string;

interface Entity {
  id: EntityId;
  type: EntityType;
  position: Position;
}

interface Cell {
  entities: EntityId[]; // multiple entities per cell
}

interface Grid {
  width: number;
  height: number;
  cells: Cell[][];      // [y][x]
  entities: Map<EntityId, Entity>;
}
```

**Entity Types** (strings): `BABA`, `WALL`, `ROCK`, `FLAG`, `TEXT_WORD`, `TEXT_IS`, `TEXT_AND`, `TEXT_YOU`, `TEXT_WIN`, `TEXT_PUSH`, `TEXT_STOP`, `TEXT_LOVE`, `TEXT_HATE`

**Rule Engine**: Parses text entities forming "X IS Y" patterns (including AND chains). Produces effective properties:

```typescript
interface EffectiveProperties {
  isYou: boolean;
  isWin: boolean;
  isPush: boolean;
  isStop: boolean;
  isLove: boolean;
  isHate: boolean;
  isKill: boolean;       // for HATE interactions
}

type RuleSet = Map<EntityId, EffectiveProperties>;
```

**Rule Evaluation**:
1. Scan grid for TEXT_WORD + IS + ... sequences (horizontal only)
2. Extract subject and predicate(s) from text entities
3. Apply AND chaining (X IS A AND B → X has both A and B)
4. Return RuleSet mapping entity IDs to properties

**Movement Engine** (tick):
1. Get all entities where `isYou === true` → list of players
2. Get input direction (arrow keys / WASD)
3. For each player, calculate intended new position
4. Collision pass: check STOP (blocks), PUSH (push rocks), LOVE/HATE (destroy on contact), WIN (victory)
5. Commit all valid moves
6. Return new Grid state

---

## Visual Design

### Pixel-Art Aesthetic (CSS-based)

No external images — all rendering via styled divs.

**Grid cell**: 40×40px, `display: flex` with centered content.

**Element visuals**:

| Element | Color | Notes |
|---------|-------|-------|
| Baba | White (#fff) | Letter "B" centered |
| Wall | Brown (#8B4513) | Solid fill |
| Rock | Gray (#808080) | Letter "R" |
| Flag | Red (#ff4444) | Letter "F" |
| Text | Yellow (#ffff00) | Bold, black text |

**CSS techniques**:
- `image-rendering: pixelated` on containers
- Sharp pixel borders via `box-shadow` stacking
- Grid gap = 1px (subtle grid lines)

---

## Game Page (`/play`)

- Top bar: level name, move counter, "Back to menu" button
- Center: game grid (CSS Grid)
- Bottom: control hints (arrow keys / WASD)
- Keyboard listener on mount, cleanup on unmount
- Win screen overlay: "You Win!" + "Next Level" + "Replay" buttons
- Built-in levels list on home state before starting a level

---

## Editor Page (`/editor`)

- Left sidebar: element palette (click to select)
- Center: grid canvas (click + drag to paint)
- Right sidebar: layer controls (erase mode toggle)
- Top bar: level name input, Save JSON, Load JSON, Play buttons
- Grid size: configurable (default 15×11, like original Baba Is You)
- Text placement: when TEXT_WORD selected, click cell → inline input for word value

### Editor Interactions

- **Left-click + drag**: paint selected element
- **Right-click**: erase cell
- **Palette click**: select element to paint
- **Eraser toggle**: when active, left-click removes entities
- **Save**: serialize grid to JSON, copy to clipboard
- **Load**: paste JSON, parse into editor state
- **Play**: navigate to `/play?level=<id>` with current grid (or temp level id)

---

## Sample Levels

Stored in `data/levels.ts`:

```typescript
interface Level {
  id: string;
  name: string;
  width: number;
  height: number;
  entities: Entity[]; // initial entity list
}
```

**Level 1 — "First Steps"**: Baba + Flag adjacent, no rules — player sees basic movement and wins by touching flag.

**Level 2 — "You"**: BABA + IS + YOU + FLAG. Rule: BABA IS YOU. Baba controlled.

**Level 3 — "Push"**: BABA + ROCK + IS + YOU + PUSH + FLAG. Rock blocks path, must push it.

**Level 4 — "Stop"**: WALL blocks path. BABA IS YOU. ROCK IS PUSH. WIN requires reaching flag.

**Level 5 — "Love"**: ROCK + IS + LOVE. BABA + IS + YOU. ROCK LOVE BABA → rocks love you (you win by touching rocks). Simple demonstration of LOVE mechanic.

---

## Routing

```
/              → redirect to /play
/play          → Game page, level select or play
/play?level=X  → Play specific level
/editor        → Map editor
```

---

## State Management

React `useState` + `useReducer` for UI state. Engine functions are pure — given grid + input, return new grid. No external state library needed.

---

## Level JSON Format

```json
{
  "id": "custom-1",
  "name": "My Level",
  "width": 15,
  "height": 11,
  "entities": [
    { "id": "e1", "type": "BABA", "position": { "x": 2, "y": 5 } },
    { "id": "e2", "type": "TEXT_WORD", "position": { "x": 0, "y": 1 }, "word": "BABA" },
    { "id": "e3", "type": "TEXT_IS", "position": { "x": 1, "y": 1 } },
    { "id": "e4", "type": "TEXT_YOU", "position": { "x": 2, "y": 1 } }
  ]
}
```

---

## Success Criteria

1. Game renders grid with all entity types visually distinct
2. Rule engine correctly interprets "X IS Y" and "X IS Y AND Z" patterns
3. Movement respects STOP, PUSH, LOVE, HATE, WIN rules
4. Editor allows painting all entity types
5. Editor save/load round-trips correctly via JSON
6. Built-in levels are completable
7. Pixel-art aesthetic is cohesive and readable
