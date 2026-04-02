import React from 'react';
import { getSpriteDataUrl, SpriteSheet } from '../../data/sprites';
import {
  PlaceTool, PaletteItem, QuickPattern,
  QUICK_PATTERNS, CHARACTER_PALETTE, NOUN_PALETTE, OPERATOR_PALETTE, PROPERTY_PALETTE,
  fallbackColor,
} from './constants';

interface EditorPaletteProps {
  paletteWidth: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedTool: PlaceTool;
  setSelectedTool: (tool: PlaceTool) => void;
  setIsResizing: (resizing: boolean) => void;
  spriteSheet: SpriteSheet | null;
}

function filterItems(items: PaletteItem[], query: string) {
  return query ? items.filter(i => i.label.toLowerCase().includes(query.toLowerCase())) : items;
}

function filterPatterns(patterns: QuickPattern[], query: string) {
  return query ? patterns.filter(p => p.label.toLowerCase().includes(query.toLowerCase())) : patterns;
}

function PaletteItemButton({ item, isSelected, onSelect, spriteSheet }: {
  item: PaletteItem;
  isSelected: boolean;
  onSelect: () => void;
  spriteSheet: SpriteSheet | null;
}) {
  let swatch: React.JSX.Element;

  if (item.type === 'eraser') {
    swatch = <div className="w-7 h-7 shrink-0 rounded [image-rendering:pixelated] flex items-center justify-center text-sm text-danger bg-[#1a0a0a] border border-[#331111]">✕</div>;
  } else if (spriteSheet && item.textureName) {
    const url = getSpriteDataUrl(spriteSheet, item.textureName, 0, 28);
    swatch = url
      ? <div className="w-7 h-7 shrink-0 rounded [image-rendering:pixelated]" style={{
          backgroundImage: `url(${url})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          imageRendering: 'pixelated',
        }} />
      : <div className="w-7 h-7 shrink-0 rounded [image-rendering:pixelated]" style={{ backgroundColor: fallbackColor(item.type) }} />;
  } else {
    swatch = <div className="w-7 h-7 shrink-0 rounded [image-rendering:pixelated]" style={{ backgroundColor: fallbackColor(item.type) }} />;
  }

  return (
    <button
      className={`flex flex-col items-center gap-[3px] px-0.5 py-1 bg-bg-input border border-transparent text-text-subtle cursor-pointer text-[0.4rem] font-[inherit] text-center transition-all duration-100 rounded hover:bg-[#1a1a1a] hover:border-border-hover hover:text-text-bright ${isSelected ? '!bg-[#1a1a1a] !border-border-bright !text-white' : ''}`}
      onClick={onSelect}
      title={item.label}
    >
      {swatch}
      <span className="overflow-hidden text-ellipsis whitespace-nowrap w-full">{item.label}</span>
    </button>
  );
}

function PaletteSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <div className="text-[0.45rem] text-border-active my-1 mt-1.5 uppercase tracking-[2px]">{title}</div>
      {children}
    </div>
  );
}

export function EditorPalette({
  paletteWidth, searchQuery, setSearchQuery,
  selectedTool, setSelectedTool, setIsResizing, spriteSheet,
}: EditorPaletteProps) {
  const filteredPatterns = filterPatterns(QUICK_PATTERNS, searchQuery);
  const filteredCharacters = filterItems(CHARACTER_PALETTE, searchQuery);
  const filteredNouns = filterItems(NOUN_PALETTE, searchQuery);
  const filteredOperators = filterItems(OPERATOR_PALETTE, searchQuery);
  const filteredProperties = filterItems(PROPERTY_PALETTE, searchQuery);

  const gridCls = 'grid grid-cols-[repeat(auto-fill,minmax(42px,1fr))] gap-[3px]';

  return (
    <div className="bg-bg-panel border border-border p-2.5 flex flex-col gap-1 rounded overflow-y-auto overflow-x-hidden max-h-[calc(100vh-80px)] relative [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#222] [&::-webkit-scrollbar-thumb]:rounded-sm" style={{ width: paletteWidth }}>
      <input
        type="text"
        className="bg-bg-input border border-[#222] text-white px-2.5 py-[5px] text-[0.55rem] w-full font-[inherit] tracking-[1px] rounded mb-2 focus:outline-none focus:border-border-active"
        placeholder="Search..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
      />
      {filteredPatterns.length > 0 && (
        <PaletteSection title="Quick Rules">
          <div className="flex flex-col gap-0.5">
            {filteredPatterns.map((p) => {
              const originalIdx = QUICK_PATTERNS.indexOf(p);
              return (
                <button
                  key={originalIdx}
                  className={`px-2 py-[5px] bg-bg-input border border-transparent text-text-subtle cursor-pointer text-[0.4rem] font-[inherit] text-left transition-all duration-100 rounded whitespace-nowrap overflow-hidden text-ellipsis hover:bg-[#1a1a1a] hover:border-border-hover hover:text-text-bright ${selectedTool === `PATTERN_${originalIdx}` ? '!bg-[#1a1a1a] !border-border-bright !text-white' : ''}`}
                  onClick={() => setSelectedTool(`PATTERN_${originalIdx}`)}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </PaletteSection>
      )}
      {filteredCharacters.length > 0 && (
        <PaletteSection title="Characters">
          <div className={gridCls}>
            {filteredCharacters.map(item => (
              <PaletteItemButton key={item.type} item={item} isSelected={selectedTool === item.type} onSelect={() => setSelectedTool(item.type)} spriteSheet={spriteSheet} />
            ))}
          </div>
        </PaletteSection>
      )}
      {filteredNouns.length > 0 && (
        <PaletteSection title="Nouns">
          <div className={gridCls}>
            {filteredNouns.map(item => (
              <PaletteItemButton key={item.type} item={item} isSelected={selectedTool === item.type} onSelect={() => setSelectedTool(item.type)} spriteSheet={spriteSheet} />
            ))}
          </div>
        </PaletteSection>
      )}
      {filteredOperators.length > 0 && (
        <PaletteSection title="Operators">
          <div className={gridCls}>
            {filteredOperators.map(item => (
              <PaletteItemButton key={item.type} item={item} isSelected={selectedTool === item.type} onSelect={() => setSelectedTool(item.type)} spriteSheet={spriteSheet} />
            ))}
          </div>
        </PaletteSection>
      )}
      {filteredProperties.length > 0 && (
        <PaletteSection title="Properties">
          <div className={gridCls}>
            {filteredProperties.map(item => (
              <PaletteItemButton key={item.type} item={item} isSelected={selectedTool === item.type} onSelect={() => setSelectedTool(item.type)} spriteSheet={spriteSheet} />
            ))}
          </div>
        </PaletteSection>
      )}
      <PaletteSection title="Tools">
        <div className={gridCls}>
          <PaletteItemButton
            item={{ type: 'eraser', label: 'Eraser', textureName: '' }}
            isSelected={selectedTool === 'eraser'}
            onSelect={() => setSelectedTool('eraser')}
            spriteSheet={spriteSheet}
          />
        </div>
      </PaletteSection>
      <div className="absolute top-0 -right-[3px] w-1.5 h-full cursor-col-resize bg-transparent transition-[background] duration-150 z-10 hover:bg-border-hover" onMouseDown={() => setIsResizing(true)} />
    </div>
  );
}
