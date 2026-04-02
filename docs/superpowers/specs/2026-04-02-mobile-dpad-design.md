# Mobile D-Pad Controls

## Problem

The game is keyboard-only. Mobile users have no way to play. The movement engine exposes a clean `tick(grid, dir)` API that accepts `'up' | 'down' | 'left' | 'right'`, making it straightforward to wire alternative input sources.

## Approach

Add a fixed-position D-pad overlay visible only on touch-capable devices during gameplay. No third-party libraries.

## Component: `src/components/MobileDPad.tsx`

A self-contained React component that renders a D-pad with directional arrows plus Undo and Retry action buttons.

### Props

```typescript
interface MobileDPadProps {
  onMove: (dir: 'up' | 'down' | 'left' | 'right') => void;
  onUndo: () => void;
  onRetry: () => void;
  gameState: 'playing' | 'dead' | 'won' | 'select';
}
```

### Visibility

- Rendered only when `'ontouchstart' in window` is true (checked once on mount via state init).
- Shown during `gameState === 'playing'` or `gameState === 'dead'`.
- Hidden during `'won'` and `'select'` states.

### Layout

Fixed to the bottom-right of the viewport. Cross-shaped arrangement:

```
         [↑]
    [←]  [·]  [→]
         [↓]

[Undo]  [Retry]
```

- Arrow buttons: ~48px touch targets, semi-transparent dark background.
- Undo/Retry: smaller text buttons below the cross, labeled with icons (↺ Undo, ↻ Retry).
- All buttons use `opacity: 0.6` at rest, `opacity: 0.9` when pressed.
- Positioned with `fixed bottom-4 right-4` so it doesn't overlap the game board on most devices.

### Touch Handling

- Use `onTouchStart` (not `onClick`) on each button for zero-latency response.
- Call `e.preventDefault()` on all touch events to prevent double-tap zoom and ghost clicks.
- Buttons provide visual feedback via CSS `:active` pseudo-class and `active:opacity-90`.

## Integration: `src/pages/Play.tsx`

### Refactoring

Extract three functions from the existing `handleKeyDown` callback:

1. `handleMove(dir: Direction)` — calls `tick()`, updates grid, pushes history, checks win/dead.
2. `handleUndo()` — pops history, decrements move count, resumes from dead.
3. `handleRetry()` — restarts current level.

`handleKeyDown` becomes a thin dispatcher that parses the key and calls one of these three.

### Rendering

```tsx
{isTouchDevice && (gameState === 'playing' || gameState === 'dead') && (
  <MobileDPad
    onMove={handleMove}
    onUndo={handleUndo}
    onRetry={handleRetry}
    gameState={gameState}
  />
)}
```

`isTouchDevice` is computed once: `useState(() => 'ontouchstart' in window)`.

## Viewport Update: `index.html`

Update the meta tag to prevent accidental zoom on mobile:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```

## Styling

All Tailwind utilities inline, consistent with the rest of the project. The D-pad uses:

- `fixed bottom-4 right-4 z-50` for positioning.
- `bg-black/50 backdrop-blur-sm rounded-xl` for the container.
- `w-12 h-12 rounded-lg` for each arrow button.
- `text-white/70 active:text-white active:bg-white/20` for touch feedback.
- Grid layout for the cross pattern: 3×3 grid with arrows in cardinal positions.

## Scope Boundaries

- Play mode only. No editor D-pad.
- No haptic feedback (possible future enhancement).
- No swipe gestures or joystick alternative.
- No landscape/portrait detection — the fixed position works in both.
- The grid itself may need horizontal scroll on small phones for large levels; that is out of scope for this feature.
