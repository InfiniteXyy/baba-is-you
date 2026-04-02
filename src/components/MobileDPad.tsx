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
