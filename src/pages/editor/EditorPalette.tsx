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

const swatchClass = "w-7 h-7 shrink-0 rounded-[3px] [image-rendering:pixelated]";
const paletteItemClass = "flex flex-col items-center gap-[3px] py-1 px-0.5 bg-[var(--color-bg-input)] border border-transparent text-[var(--color-text-subtle)] cursor-pointer text-[0.4rem] font-[inherit] text-center transition-all duration-100 rounded-[3px] hover:bg-[#1a1a1a] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-bright)]";
const paletteGridClass = "grid grid-cols-[repeat(auto-fill,minmax(42px,1fr))] gap-[3px]";
const sectionTitleClass = "text-[0.45rem] text-[#444] mt-1.5 mb-1 uppercase tracking-[2px]";

function PaletteItemButton({ item, isSelected, onSelect, spriteSheet }: {
  item: PaletteItem;
  isSelected: boolean;
  onSelect: () => void;
  spriteSheet: SpriteSheet | null;
}) {
  let swatch: React.JSX.Element;

  if (item.type === 'eraser') {
    swatch = <div className={`${swatchClass} flex items-center justify-center text-sm text-[var(--color-danger)] bg-[#1a0a0a] border border-[#331111]`}>✕</div>;
  } else if (spriteSheet && item.textureName) {
    const url = getSpriteDataUrl(spriteSheet, item.textureName, 0, 28);
    swatch = url
      ? <div className={swatchClass} style={{
          backgroundImage: `url(${url})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          imageRendering: 'pixelated',
        }} />
      : <div className={swatchClass} style={{ backgroundColor: fallbackColor(item.type) }} />;
  } else {
    swatch = <div className={swatchClass} style={{ backgroundColor: fallbackColor(item.type) }} />;
  }

  return (
    <button
      className={`${paletteItemClass} ${isSelected ? '!bg-[#1a1a1a] !border-[var(--color-border-bright)] !text-white' : ''}`}
      onClick={onSelect}
      title={item.label}
    >
      {swatch}
      <span className="overflow-hidden text-ellipsis whitespace-nowrap w-full">{item.label}</span>
    </button>
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

  const patternItemClass = "py-[5px] px-2 bg-[var(--color-bg-input)] border border-transparent text-[var(--color-text-subtle)] cursor-pointer text-[0.4rem] font-[inherit] text-left transition-all duration-100 rounded-[3px] whitespace-nowrap overflow-hidden text-ellipsis hover:bg-[#1a1a1a] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-bright)]";

  return (
    <div className="bg-[var(--color-bg-panel)] border border-[var(--color-border)] p-2.5 flex flex-col gap-1 rounded overflow-y-auto overflow-x-hidden max-h-[calc(100vh-80px)] relative [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#222] [&::-webkit-scrollbar-thumb]:rounded-sm" style={{ width: paletteWidth }}>
      <input
        type="text"
        className="bg-[var(--color-bg-input)] border border-[#222] text-white py-[5px] px-2.5 text-[0.55rem] w-full font-[inherit] tracking-[1px] rounded-[3px] mb-2 box-border focus:outline-none focus:border-[var(--color-border-active)]"
        placeholder="Search..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
      />
      {filteredPatterns.length > 0 && (
        <div className="mb-1">
          <div className={sectionTitleClass}>Quick Rules</div>
          <div className="flex flex-col gap-0.5">
            {filteredPatterns.map((p) => {
              const originalIdx = QUICK_PATTERNS.indexOf(p);
              return (
                <button
                  key={originalIdx}
                  className={`${patternItemClass} ${selectedTool === `PATTERN_${originalIdx}` ? '!bg-[#1a1a1a] !border-[var(--color-border-bright)] !text-white' : ''}`}
                  onClick={() => setSelectedTool(`PATTERN_${originalIdx}`)}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {filteredCharacters.length > 0 && (
        <div className="mb-1">
          <div className={sectionTitleClass}>Characters</div>
          <div className={paletteGridClass}>
            {filteredCharacters.map(item => (
              <PaletteItemButton
                key={item.type}
                item={item}
                isSelected={selectedTool === item.type}
                onSelect={() => setSelectedTool(item.type)}
                spriteSheet={spriteSheet}
              />
            ))}
          </div>
        </div>
      )}
      {filteredNouns.length > 0 && (
        <div className="mb-1">
          <div className={sectionTitleClass}>Nouns</div>
          <div className={paletteGridClass}>
            {filteredNouns.map(item => (
              <PaletteItemButton
                key={item.type}
                item={item}
                isSelected={selectedTool === item.type}
                onSelect={() => setSelectedTool(item.type)}
                spriteSheet={spriteSheet}
              />
            ))}
          </div>
        </div>
      )}
      {filteredOperators.length > 0 && (
        <div className="mb-1">
          <div className={sectionTitleClass}>Operators</div>
          <div className={paletteGridClass}>
            {filteredOperators.map(item => (
              <PaletteItemButton
                key={item.type}
                item={item}
                isSelected={selectedTool === item.type}
                onSelect={() => setSelectedTool(item.type)}
                spriteSheet={spriteSheet}
              />
            ))}
          </div>
        </div>
      )}
      {filteredProperties.length > 0 && (
        <div className="mb-1">
          <div className={sectionTitleClass}>Properties</div>
          <div className={paletteGridClass}>
            {filteredProperties.map(item => (
              <PaletteItemButton
                key={item.type}
                item={item}
                isSelected={selectedTool === item.type}
                onSelect={() => setSelectedTool(item.type)}
                spriteSheet={spriteSheet}
              />
            ))}
          </div>
        </div>
      )}
      <div className="mb-1">
        <div className={sectionTitleClass}>Tools</div>
        <div className={paletteGridClass}>
          <PaletteItemButton
            item={{ type: 'eraser', label: 'Eraser', textureName: '' }}
            isSelected={selectedTool === 'eraser'}
            onSelect={() => setSelectedTool('eraser')}
            spriteSheet={spriteSheet}
          />
        </div>
      </div>
      <div className="absolute top-0 -right-[3px] w-1.5 h-full cursor-col-resize bg-transparent transition-[background] duration-150 z-10 hover:bg-[var(--color-border-hover)]" onMouseDown={() => setIsResizing(true)} />
    </div>
  );
}
