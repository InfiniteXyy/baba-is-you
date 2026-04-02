# Mobile D-Pad Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fixed-position D-pad overlay for mobile users to play the game with touch controls.

**Architecture:** A new `MobileDPad` component renders 4 directional arrows + Undo/Retry buttons, fixed to bottom-right. Play.tsx is refactored to extract `handleMove`, `handleUndo`, `handleRetry` from the monolithic `handleKeyDown`, which both keyboard and D-pad share. Touch detection via `'ontouchstart' in window`.

**Tech Stack:** React, TypeScript, Tailwind CSS 4 (inline utilities)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/MobileDPad.tsx` | Create | D-pad overlay component with arrows + action buttons |
| `src/pages/Play.tsx` | Modify | Extract move/undo/retry handlers, render D-pad, add touch detection |
| `index.html` | Modify | Update viewport meta to disable user zoom on mobile |

---

### Task 1: Create MobileDPad component

**Files:**
- Create: `src/components/MobileDPad.tsx`

- [ ] **Step 1: Create the component file**

```tsx
// src/components/MobileDPad.tsx
import { Direction } from '../engine/movement';

interface MobileDPadProps {
  onMove: (dir: Direction) => void;
  onUndo: () => void;
  onRetry: () => void;
  gameState: 'playing' | 'dead' | 'won' | 'menu';
}

export function MobileDPad({ onMove, onUndo, onRetry, gameState }: MobileDPadProps) {
  if (gameState !== 'playing' && gameState !== 'dead') return null;

  const prevent = (e: React.TouchEvent) => e.preventDefault();

  const arrowBtn = (dir: Direction, label: string, gridArea: string) => (
    <button
      className="w-14 h-14 rounded-xl bg-white/10 border border-white/20 text-white/70 text-xl flex items-center justify-center active:bg-white/25 active:text-white active:scale-95 transition-all duration-75 select-none"
      style={{ gridArea }}
      onTouchStart={(e) => { prevent(e); onMove(dir); }}
      onTouchEnd={prevent}
    >
      {label}
    </button>
  );

  const actionBtn = (label: string, icon: string, onClick: () => void) => (
    <button
      className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white/60 text-[0.55rem] font-retro tracking-wider active:bg-white/25 active:text-white active:scale-95 transition-all duration-75 select-none"
      onTouchStart={(e) => { prevent(e); onClick(); }}
      onTouchEnd={prevent}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-3">
      <div
        className="grid gap-1"
        style={{
          gridTemplateAreas: `". up ." "left center right" ". down ."`,
          gridTemplateColumns: 'repeat(3, auto)',
          gridTemplateRows: 'repeat(3, auto)',
        }}
      >
        {arrowBtn('up', '▲', 'up')}
        {arrowBtn('left', '◀', 'left')}
        <div className="w-14 h-14" style={{ gridArea: 'center' }} />
        {arrowBtn('right', '▶', 'right')}
        {arrowBtn('down', '▼', 'down')}
      </div>
      <div className="flex gap-2">
        {actionBtn('Undo', '↺', onUndo)}
        {actionBtn('Retry', '↻', onRetry)}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors (component isn't imported yet, so it just needs to type-check standalone)

- [ ] **Step 3: Commit**

```bash
git add src/components/MobileDPad.tsx
git commit -m "feat: add MobileDPad component for touch controls"
```

---

### Task 2: Refactor Play.tsx — extract handlers and integrate D-pad

**Files:**
- Modify: `src/pages/Play.tsx`

- [ ] **Step 1: Add import and touch detection state**

At the top of Play.tsx, add the import after the existing imports (line 9):

```tsx
import { MobileDPad } from '../components/MobileDPad';
```

Inside the `Play()` function, after the existing state declarations (after `const spriteSheet = useSprites();`), add:

```tsx
const [isTouchDevice] = useState(() => 'ontouchstart' in window);
```

- [ ] **Step 2: Extract handleMove, handleUndo, handleRetry**

Replace the existing `handleKeyDown` useCallback (lines 234-311) with four functions:

```tsx
  function handleMove(dir: Direction) {
    if (gameState !== 'playing' || !grid) return;
    const result = tick(grid, dir);
    if (result.moved) {
      historyRef.current = [...historyRef.current, cloneGrid(grid)];
      setMoveCount(m => m + 1);
    }
    setGrid(result.grid);
    if (result.won) {
      setGameState('won');
    } else if (result.dead) {
      setGameState('dead');
    }
  }

  function handleUndo() {
    if (!grid || historyRef.current.length === 0) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    setGrid(prev);
    setMoveCount(m => Math.max(0, m - 1));
    if (gameState === 'dead') setGameState('playing');
  }

  function handleRetry() {
    if (level) startLevel(level);
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameState === 'dead' && grid) {
      if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); handleUndo(); return; }
      if (e.key === 'r' || e.key === 'R') { handleRetry(); return; }
      return;
    }
    if (gameState !== 'playing' || !grid) return;

    let dir: Direction | null = null;
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': dir = 'up'; break;
      case 'ArrowDown': case 's': case 'S': dir = 'down'; break;
      case 'ArrowLeft': case 'a': case 'A': dir = 'left'; break;
      case 'ArrowRight': case 'd': case 'D': dir = 'right'; break;
      case 'z': case 'Z': e.preventDefault(); handleUndo(); return;
      case 'r': case 'R': handleRetry(); return;
      default: return;
    }
    e.preventDefault();
    handleMove(dir);
  }, [gameState, grid, level]);
```

- [ ] **Step 3: Wire existing death dialog buttons to extracted handlers**

In the dead dialog JSX (around line 430-450), replace the inline undo handler with the extracted function:

Old:
```tsx
<button className={modalBtnClass} onClick={() => startLevel(level)}>Retry</button>
<button className={modalBtnClass} onClick={() => {
  if (historyRef.current.length > 0) {
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    setGrid(prev);
    setMoveCount(m => Math.max(0, m - 1));
    setGameState('playing');
  }
}}>Undo</button>
```

New:
```tsx
<button className={modalBtnClass} onClick={handleRetry}>Retry</button>
<button className={modalBtnClass} onClick={handleUndo}>Undo</button>
```

- [ ] **Step 4: Render MobileDPad in the play view**

After the controls hint text `<div>` (line ~398-400), add:

```tsx
{isTouchDevice && (
  <MobileDPad
    onMove={handleMove}
    onUndo={handleUndo}
    onRetry={handleRetry}
    gameState={gameState}
  />
)}
```

- [ ] **Step 5: Verify TypeScript compiles and build passes**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -10`
Expected: Clean build with no errors

- [ ] **Step 6: Commit**

```bash
git add src/pages/Play.tsx
git commit -m "feat: integrate mobile D-pad into Play view

Extract handleMove/handleUndo/handleRetry from handleKeyDown.
Render MobileDPad on touch-capable devices during gameplay."
```

---

### Task 3: Update viewport meta for mobile

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Update viewport meta tag**

In `index.html` line 6, replace:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

with:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "fix: prevent zoom on mobile for better touch controls"
```

---

### Task 4: Final build verification

- [ ] **Step 1: Full build and type check**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -10`
Expected: Clean build, no warnings

- [ ] **Step 2: Verify no regressions in file structure**

Run: `ls -la src/components/MobileDPad.tsx`
Expected: File exists

Run: `grep -c 'MobileDPad' src/pages/Play.tsx`
Expected: At least 2 (import + usage)

Run: `grep 'user-scalable' index.html`
Expected: `user-scalable=no`
