import React from 'react';
import { Grid } from '../../engine/grid';
import { Entity } from '../../engine/entities';
import { getSpriteDataUrl, SpriteSheet } from '../../data/sprites';
import { CELL_SIZE, fallbackColor } from './constants';

interface EditorCanvasProps {
  grid: Grid;
  spriteSheet: SpriteSheet | null;
  cellSize: number;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  gridRef: React.RefObject<HTMLDivElement | null>;
}

const entityClass = "absolute inset-0 flex items-center justify-center font-bold text-[10px] text-black rounded-sm";
const cellClass = "w-7 h-7 flex items-center justify-center bg-[#0a0a0a] relative";

function renderEntitySprite(e: Entity, sheet: SpriteSheet | null, size: number) {
  const spriteUrl = sheet ? getSpriteDataUrl(sheet, e.textureName, 0, size) : null;
  if (spriteUrl) {
    return (
      <div
        key={e.id}
        className={`${entityClass} !bg-transparent [image-rendering:pixelated]`}
        style={{
          backgroundImage: `url(${spriteUrl})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }}
      />
    );
  }
  return (
    <div
      key={e.id}
      className={entityClass}
      style={{ backgroundColor: fallbackColor(e.type), fontSize: '8px', color: '#000' }}
    >
      {e.type.startsWith('TEXT_') ? (e.word || e.type.slice(5)) : e.type.charAt(0)}
    </div>
  );
}

function renderCells(grid: Grid, spriteSheet: SpriteSheet | null) {
  const cells: React.JSX.Element[] = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cell = grid.cells[y][x];
      const key = `${x}-${y}`;

      if (cell.entities.length === 0) {
        cells.push(<div key={key} className={cellClass} />);
      } else {
        const allEntities = cell.entities.map(id => grid.entities.get(id)!).filter(e => e);
        cells.push(
          <div key={key} className={cellClass}>
            {allEntities.map(e => renderEntitySprite(e, spriteSheet, CELL_SIZE))}
          </div>
        );
      }
    }
  }
  return cells;
}

export function EditorCanvas({
  grid, spriteSheet, cellSize,
  onMouseDown, onMouseMove, onMouseUp, onContextMenu, gridRef,
}: EditorCanvasProps) {
  return (
    <div className="flex-1 flex justify-center items-start relative">
      <div
        ref={gridRef}
        className="grid gap-px bg-[#060606] p-px cursor-crosshair select-none border-2 border-[var(--color-border)] rounded-[3px]"
        style={{
          gridTemplateColumns: `repeat(${grid.width}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${grid.height}, ${cellSize}px)`,
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onContextMenu={onContextMenu}
      >
        {renderCells(grid, spriteSheet)}
      </div>
    </div>
  );
}
