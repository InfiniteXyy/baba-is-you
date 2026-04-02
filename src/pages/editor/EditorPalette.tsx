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
    swatch = <div className="palette-swatch eraser-swatch">✕</div>;
  } else if (spriteSheet && item.textureName) {
    const url = getSpriteDataUrl(spriteSheet, item.textureName, 0, 28);
    swatch = url
      ? <div className="palette-swatch" style={{
          backgroundImage: `url(${url})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          imageRendering: 'pixelated',
        }} />
      : <div className="palette-swatch" style={{ backgroundColor: fallbackColor(item.type) }} />;
  } else {
    swatch = <div className="palette-swatch" style={{ backgroundColor: fallbackColor(item.type) }} />;
  }

  return (
    <button
      className={`palette-item ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
      title={item.label}
    >
      {swatch}
      <span className="palette-label">{item.label}</span>
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

  return (
    <div className="palette" style={{ width: paletteWidth }}>
      <input
        type="text"
        className="palette-search"
        placeholder="Search..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
      />
      {filteredPatterns.length > 0 && (
        <div className="palette-section">
          <div className="palette-section-title">Quick Rules</div>
          <div className="pattern-list">
            {filteredPatterns.map((p) => {
              const originalIdx = QUICK_PATTERNS.indexOf(p);
              return (
                <button
                  key={originalIdx}
                  className={`pattern-item ${selectedTool === `PATTERN_${originalIdx}` ? 'selected' : ''}`}
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
        <div className="palette-section">
          <div className="palette-section-title">Characters</div>
          <div className="palette-grid">
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
        <div className="palette-section">
          <div className="palette-section-title">Nouns</div>
          <div className="palette-grid">
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
        <div className="palette-section">
          <div className="palette-section-title">Operators</div>
          <div className="palette-grid">
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
        <div className="palette-section">
          <div className="palette-section-title">Properties</div>
          <div className="palette-grid">
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
      <div className="palette-section">
        <div className="palette-section-title">Tools</div>
        <div className="palette-grid">
          <PaletteItemButton
            item={{ type: 'eraser', label: 'Eraser', textureName: '' }}
            isSelected={selectedTool === 'eraser'}
            onSelect={() => setSelectedTool('eraser')}
            spriteSheet={spriteSheet}
          />
        </div>
      </div>
      <div className="resize-handle" onMouseDown={() => setIsResizing(true)} />
    </div>
  );
}
