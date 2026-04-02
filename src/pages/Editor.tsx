import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Grid, createGrid, addEntity, removeEntity } from '../engine/grid';
import { createEntity, Entity, TextWord } from '../engine/entities';
import { useSprites, getSpriteDataUrl, SpriteSheet } from '../data/sprites';
import { parseCommunityLevel, levelToCommunityFormat, CommunityLevel } from '../data/communityLevel';
import './Editor.css';

const CELL_SIZE = 28;
const DEFAULT_WIDTH = 24;
const DEFAULT_HEIGHT = 18;

type PlaceTool = string;

interface PaletteItem {
  type: PlaceTool;
  label: string;
  textureName: string;
  isText?: boolean;
  word?: TextWord;
}

interface QuickPattern {
  label: string;
  entities: { type: string; word?: string; offsetX: number }[];
}

const QUICK_PATTERNS: QuickPattern[] = [
  { label: 'BABA IS YOU', entities: [
    { type: 'TEXT_WORD', word: 'BABA', offsetX: 0 },
    { type: 'TEXT_IS', offsetX: 1 },
    { type: 'TEXT_YOU', offsetX: 2 },
  ]},
  { label: 'WALL IS STOP', entities: [
    { type: 'TEXT_WORD', word: 'WALL', offsetX: 0 },
    { type: 'TEXT_IS', offsetX: 1 },
    { type: 'TEXT_STOP', offsetX: 2 },
  ]},
  { label: 'ROCK IS PUSH', entities: [
    { type: 'TEXT_WORD', word: 'ROCK', offsetX: 0 },
    { type: 'TEXT_IS', offsetX: 1 },
    { type: 'TEXT_PUSH', offsetX: 2 },
  ]},
  { label: 'FLAG IS WIN', entities: [
    { type: 'TEXT_WORD', word: 'FLAG', offsetX: 0 },
    { type: 'TEXT_IS', offsetX: 1 },
    { type: 'TEXT_WIN', offsetX: 2 },
  ]},
  { label: 'WATER IS SINK', entities: [
    { type: 'TEXT_WORD', word: 'WATER', offsetX: 0 },
    { type: 'TEXT_IS', offsetX: 1 },
    { type: 'TEXT_SINK', offsetX: 2 },
  ]},
  { label: 'KEY IS OPEN', entities: [
    { type: 'TEXT_WORD', word: 'KEY', offsetX: 0 },
    { type: 'TEXT_IS', offsetX: 1 },
    { type: 'TEXT_OPEN', offsetX: 2 },
  ]},
  { label: 'DOOR IS SHUT', entities: [
    { type: 'TEXT_WORD', word: 'DOOR', offsetX: 0 },
    { type: 'TEXT_IS', offsetX: 1 },
    { type: 'TEXT_SHUT', offsetX: 2 },
  ]},
  { label: 'LAVA IS HOT', entities: [
    { type: 'TEXT_WORD', word: 'LAVA', offsetX: 0 },
    { type: 'TEXT_IS', offsetX: 1 },
    { type: 'TEXT_HOT', offsetX: 2 },
  ]},
];

const CHARACTER_PALETTE: PaletteItem[] = [
  'BABA', 'WALL', 'ROCK', 'FLAG', 'CRAB', 'WATER', 'LAVA', 'GRASS', 'FLOWER',
  'ALGAE', 'BRICK', 'BUBBLE', 'COG', 'DOOR', 'ICE', 'JELLY', 'KEY', 'PILLAR',
  'PIPE', 'ROBOT', 'SKULL', 'STAR', 'TILE',
].map(name => ({ type: name, label: name, textureName: name }));

const NOUN_PALETTE: PaletteItem[] = [
  'BABA', 'WALL', 'ROCK', 'FLAG', 'CRAB', 'WATER', 'LAVA', 'GRASS', 'ICE', 'JELLY',
  'COG', 'DOOR', 'KEY', 'PILLAR', 'PIPE', 'ROBOT', 'SKULL', 'STAR',
].map(name => ({ type: `NOUN_${name}`, label: name, textureName: `Text_${name}`, isText: true, word: name as TextWord }));

const OPERATOR_PALETTE: PaletteItem[] = [
  { type: 'TEXT_IS', label: 'IS', textureName: 'Text_IS', isText: true },
  { type: 'TEXT_AND', label: 'AND', textureName: 'Text_AND', isText: true },
];

const PROPERTY_PALETTE: PaletteItem[] = [
  'YOU', 'WIN', 'PUSH', 'STOP', 'LOVE', 'HATE', 'DEFEAT',
  'SINK', 'HOT', 'MELT', 'FLOAT', 'MOVE', 'OPEN', 'SHUT', 'WEAK',
].map(name => ({ type: `TEXT_${name}`, label: name, textureName: `Text_${name}`, isText: true }));

interface SavedMap {
  id: string;
  name: string;
  updatedAt: number;
  data: string;
}

function fallbackColor(type: string): string {
  if (type.startsWith('TEXT_')) return '#ffff00';
  switch (type) {
    case 'BABA': return '#ffffff';
    case 'WALL': return '#8B4513';
    case 'ROCK': return '#808080';
    case 'FLAG': return '#ff4444';
    default: return '#cccccc';
  }
}

export function Editor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const spriteSheet = useSprites();
  const [savedMaps, setSavedMaps] = useState<SavedMap[]>(() => {
    const stored = localStorage.getItem('editor-saved-maps');
    return stored ? JSON.parse(stored) : [];
  });
  const [currentMapId, setCurrentMapId] = useState<string | null>(null);
  const [grid, setGrid] = useState<Grid>(() => createGrid(DEFAULT_WIDTH, DEFAULT_HEIGHT));
  const [gridWidth, setGridWidth] = useState(DEFAULT_WIDTH);
  const [gridHeight, setGridHeight] = useState(DEFAULT_HEIGHT);
  const [selectedTool, setSelectedTool] = useState<PlaceTool>('BABA');
  const [levelName, setLevelName] = useState('My Level');
  const [isPainting, setIsPainting] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [paletteWidth, setPaletteWidth] = useState(240);
  const [isResizing, setIsResizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sharedMapPopup, setSharedMapPopup] = useState<{ data: CommunityLevel } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs for auto-save to avoid recreating callbacks
  const gridRef2 = useRef(grid);
  const levelNameRef = useRef(levelName);
  const currentMapIdRef = useRef(currentMapId);
  const savedMapsRef = useRef(savedMaps);
  gridRef2.current = grid;
  levelNameRef.current = levelName;
  currentMapIdRef.current = currentMapId;
  savedMapsRef.current = savedMaps;

  // Load shared map from URL
  useEffect(() => {
    const mapData = searchParams.get('map');
    if (mapData) {
      try {
        const json = decodeURIComponent(atob(mapData));
        const parsed = JSON.parse(json) as CommunityLevel;
        setSharedMapPopup({ data: parsed });
      } catch (e) {
        console.error('Failed to decode shared map:', e);
      }
    }
  }, []);

  function loadSharedMap(data: CommunityLevel) {
    const level = parseCommunityLevel(data);
    const newGrid = createGrid(level.width, level.height);
    for (const entity of level.entities) {
      addEntity(newGrid, entity);
    }
    setGrid(newGrid);
    setGridWidth(level.width);
    setGridHeight(level.height);
    setLevelName(level.name);
    setCurrentMapId(null);
    setSharedMapPopup(null);
    // Clear the map param from URL
    navigate('/editor', { replace: true });
  }

  function playSharedMap(data: CommunityLevel) {
    const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
    setSharedMapPopup(null);
    navigate(`/play?map=${encoded}`);
  }

  // Resizable palette
  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e: MouseEvent) => {
      const newWidth = Math.max(160, Math.min(400, e.clientX - 16));
      setPaletteWidth(newWidth);
    };
    const handleUp = () => setIsResizing(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isResizing]);

  const filterItems = (items: PaletteItem[]) =>
    searchQuery ? items.filter(i => i.label.toLowerCase().includes(searchQuery.toLowerCase())) : items;

  const filterPatterns = (patterns: QuickPattern[]) =>
    searchQuery ? patterns.filter(p => p.label.toLowerCase().includes(searchQuery.toLowerCase())) : patterns;

  // Debounced auto-save (uses refs to avoid re-triggering)
  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      const g = gridRef2.current;
      const name = levelNameRef.current;
      const mapId = currentMapIdRef.current;

      // Save editor-grid for Play route
      const tempData = {
        id: 'editor-temp', name, width: g.width, height: g.height,
        entities: Array.from(g.entities.values()),
      };
      localStorage.setItem('editor-grid', JSON.stringify(levelToCommunityFormat(tempData)));

      // Auto-save to saved maps
      const communityJson = levelToCommunityFormat({
        id: mapId || 'custom', name, width: g.width, height: g.height,
        entities: Array.from(g.entities.values()),
      });
      const json = JSON.stringify(communityJson);
      const now = Date.now();

      setSavedMaps(prev => {
        let updated: SavedMap[];
        if (mapId) {
          updated = prev.map(m =>
            m.id === mapId ? { ...m, name, updatedAt: now, data: json } : m
          );
        } else {
          const id = crypto.randomUUID();
          setCurrentMapId(id);
          updated = [...prev, { id, name, updatedAt: now, data: json }];
        }
        localStorage.setItem('editor-saved-maps', JSON.stringify(updated));
        return updated;
      });
    }, 600);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [grid, levelName]);

  function handleNew() {
    const newGrid = createGrid(DEFAULT_WIDTH, DEFAULT_HEIGHT);
    setGrid(newGrid);
    setGridWidth(DEFAULT_WIDTH);
    setGridHeight(DEFAULT_HEIGHT);
    setLevelName('My Level');
    setCurrentMapId(null);
  }

  function resizeGrid(newWidth: number, newHeight: number) {
    const newGrid = createGrid(newWidth, newHeight);
    for (const entity of grid.entities.values()) {
      if (entity.position.x < newWidth && entity.position.y < newHeight) {
        addEntity(newGrid, { ...entity });
      }
    }
    setGrid(newGrid);
    setGridWidth(newWidth);
    setGridHeight(newHeight);
  }

  function getCellFromEvent(e: React.MouseEvent): { x: number; y: number } | null {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / (CELL_SIZE + 1));
    const y = Math.floor((e.clientY - rect.top) / (CELL_SIZE + 1));
    if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) return null;
    return { x, y };
  }

  function paintCell(x: number, y: number) {
    if (selectedTool.startsWith('PATTERN_')) {
      const patternIdx = parseInt(selectedTool.replace('PATTERN_', ''));
      const pattern = QUICK_PATTERNS[patternIdx];
      if (pattern) {
        for (const p of pattern.entities) {
          const px = x + p.offsetX;
          if (px >= grid.width) continue;
          const pCell = grid.cells[y][px];
          for (const id of [...pCell.entities]) removeEntity(grid, id);
          const entity = createEntity(p.type, { x: px, y }, p.word as any);
          addEntity(grid, entity);
        }
      }
      setGrid({ ...grid });
      return;
    }

    const cell = grid.cells[y][x];
    const toRemove = [...cell.entities];
    for (const id of toRemove) {
      removeEntity(grid, id);
    }

    if (selectedTool === 'eraser') {
      // just erase
    } else if (selectedTool.startsWith('NOUN_')) {
      const word = selectedTool.replace('NOUN_', '') as TextWord;
      const entity = createEntity('TEXT_WORD', { x, y }, word);
      addEntity(grid, entity);
    } else {
      const entity = createEntity(selectedTool, { x, y });
      addEntity(grid, entity);
    }
    setGrid({ ...grid });
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (e.button === 2) return;
    const pos = getCellFromEvent(e);
    if (!pos) return;
    setIsPainting(true);
    paintCell(pos.x, pos.y);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isPainting) return;
    const pos = getCellFromEvent(e);
    if (!pos) return;
    paintCell(pos.x, pos.y);
  }

  function handleMouseUp() {
    setIsPainting(false);
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    const pos = getCellFromEvent(e);
    if (!pos) return;
    const cell = grid.cells[pos.y][pos.x];
    const toRemove = [...cell.entities];
    for (const id of toRemove) {
      removeEntity(grid, id);
    }
    setGrid({ ...grid });
  }

  function handleLoadMap(id: string) {
    const map = savedMaps.find(m => m.id === id);
    if (!map) return;
    try {
      const data = JSON.parse(map.data);
      const level = parseCommunityLevel(data as CommunityLevel);
      const newGrid = createGrid(level.width, level.height);
      for (const entity of level.entities) {
        addEntity(newGrid, entity);
      }
      setGrid(newGrid);
      setGridWidth(level.width);
      setGridHeight(level.height);
      setLevelName(level.name);
      setCurrentMapId(id);
    } catch {
      alert('Failed to load map');
    }
  }

  function handleDeleteMap(id: string) {
    const updated = savedMaps.filter(m => m.id !== id);
    setSavedMaps(updated);
    localStorage.setItem('editor-saved-maps', JSON.stringify(updated));
    if (currentMapId === id) {
      setCurrentMapId(null);
    }
  }

  function handleExportJson() {
    const levelData = {
      id: currentMapId || 'custom',
      name: levelName,
      width: grid.width,
      height: grid.height,
      entities: Array.from(grid.entities.values()),
    };
    const communityJson = levelToCommunityFormat(levelData);
    const json = JSON.stringify(communityJson, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      alert('JSON copied to clipboard!');
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = json;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('JSON copied to clipboard!');
    });
  }

  function handleImportJson() {
    const json = prompt('Paste level JSON:');
    if (!json) return;
    try {
      const data = JSON.parse(json);
      let entities: Entity[];
      let width: number;
      let height: number;
      let name: string;

      if (data.thingsMap) {
        const level = parseCommunityLevel(data as CommunityLevel);
        entities = level.entities;
        width = level.width;
        height = level.height;
        name = level.name;
      } else {
        entities = data.entities;
        width = data.width;
        height = data.height;
        name = data.name || 'My Level';
      }

      const newGrid = createGrid(width, height);
      for (const entity of entities) {
        addEntity(newGrid, entity);
      }
      setGrid(newGrid);
      setGridWidth(width);
      setGridHeight(height);
      setLevelName(name);
      setCurrentMapId(null);
    } catch {
      alert('Invalid level JSON');
    }
  }

  function handlePlay() {
    const levelData = {
      id: currentMapId || 'editor-temp',
      name: levelName,
      width: grid.width,
      height: grid.height,
      entities: Array.from(grid.entities.values()),
    };
    const communityJson = levelToCommunityFormat(levelData);
    const encoded = btoa(encodeURIComponent(JSON.stringify(communityJson)));
    navigate(`/play?map=${encoded}`);
  }

  function handleShare() {
    const levelData = {
      id: currentMapId || 'custom',
      name: levelName,
      width: grid.width,
      height: grid.height,
      entities: Array.from(grid.entities.values()),
    };
    const communityJson = levelToCommunityFormat(levelData);
    const encoded = btoa(encodeURIComponent(JSON.stringify(communityJson)));
    const url = `${window.location.origin}${import.meta.env.BASE_URL}#/editor?map=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('Share link copied!');
    });
  }

  function handleRename(id: string, newName: string) {
    const updated = savedMaps.map(m =>
      m.id === id ? { ...m, name: newName } : m
    );
    setSavedMaps(updated);
    localStorage.setItem('editor-saved-maps', JSON.stringify(updated));
    setRenamingId(null);
  }

  function renderEntitySprite(e: Entity, sheet: SpriteSheet | null, size: number) {
    const spriteUrl = sheet ? getSpriteDataUrl(sheet, e.textureName, 0, size) : null;
    if (spriteUrl) {
      return (
        <div
          key={e.id}
          className="editor-entity editor-entity-sprite"
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
        className="editor-entity"
        style={{ backgroundColor: fallbackColor(e.type), fontSize: '8px', color: '#000' }}
      >
        {e.type.startsWith('TEXT_') ? (e.word || e.type.slice(5)) : e.type.charAt(0)}
      </div>
    );
  }

  function renderCells() {
    const cells: React.JSX.Element[] = [];
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const cell = grid.cells[y][x];
        const key = `${x}-${y}`;

        if (cell.entities.length === 0) {
          cells.push(<div key={key} className="editor-cell empty" />);
        } else {
          const allEntities = cell.entities.map(id => grid.entities.get(id)!).filter(e => e);
          cells.push(
            <div key={key} className="editor-cell">
              {allEntities.map(e => renderEntitySprite(e, spriteSheet, CELL_SIZE))}
            </div>
          );
        }
      }
    }
    return cells;
  }

  function renderPaletteItem(item: PaletteItem) {
    const isSelected = selectedTool === item.type;
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
        key={item.type}
        className={`palette-item ${isSelected ? 'selected' : ''}`}
        onClick={() => setSelectedTool(item.type)}
        title={item.label}
      >
        {swatch}
        <span className="palette-label">{item.label}</span>
      </button>
    );
  }

  return (
    <div className="editor-page">
      <div className="editor-topbar">
        <div className="topbar-left">
          <button className="back-link" onClick={() => navigate('/play')}>← Game</button>
        </div>
        <div className="topbar-center">
          <input
            type="text"
            className="level-name-input"
            value={levelName}
            onChange={e => setLevelName(e.target.value)}
            placeholder="Level name"
          />
          <div className="grid-size-controls">
            <label className="grid-size-label">
              W
              <input
                type="number"
                className="grid-size-input"
                min={5}
                max={30}
                value={gridWidth}
                onChange={e => {
                  const v = Math.max(5, Math.min(30, Number(e.target.value)));
                  resizeGrid(v, gridHeight);
                }}
              />
            </label>
            <label className="grid-size-label">
              H
              <input
                type="number"
                className="grid-size-input"
                min={5}
                max={20}
                value={gridHeight}
                onChange={e => {
                  const v = Math.max(5, Math.min(20, Number(e.target.value)));
                  resizeGrid(gridWidth, v);
                }}
              />
            </label>
          </div>
        </div>
        <div className="topbar-right">
          <button className="editor-btn" onClick={handleNew}>New</button>
          <button className="editor-btn" onClick={handleExportJson}>Export</button>
          <button className="editor-btn" onClick={handleImportJson}>Import</button>
          <button className="editor-btn" onClick={handleShare}>Share</button>
          <button className="editor-btn play-btn" onClick={handlePlay}>▶ Play</button>
        </div>
      </div>

      <div className="editor-main">
        <div className="palette" style={{ width: paletteWidth }}>
          <input
            type="text"
            className="palette-search"
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {filterPatterns(QUICK_PATTERNS).length > 0 && (
            <div className="palette-section">
              <div className="palette-section-title">Quick Rules</div>
              <div className="pattern-list">
                {filterPatterns(QUICK_PATTERNS).map((p) => {
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
          {filterItems(CHARACTER_PALETTE).length > 0 && (
            <div className="palette-section">
              <div className="palette-section-title">Characters</div>
              <div className="palette-grid">
                {filterItems(CHARACTER_PALETTE).map(item => renderPaletteItem(item))}
              </div>
            </div>
          )}
          {filterItems(NOUN_PALETTE).length > 0 && (
            <div className="palette-section">
              <div className="palette-section-title">Nouns</div>
              <div className="palette-grid">
                {filterItems(NOUN_PALETTE).map(item => renderPaletteItem(item))}
              </div>
            </div>
          )}
          {filterItems(OPERATOR_PALETTE).length > 0 && (
            <div className="palette-section">
              <div className="palette-section-title">Operators</div>
              <div className="palette-grid">
                {filterItems(OPERATOR_PALETTE).map(item => renderPaletteItem(item))}
              </div>
            </div>
          )}
          {filterItems(PROPERTY_PALETTE).length > 0 && (
            <div className="palette-section">
              <div className="palette-section-title">Properties</div>
              <div className="palette-grid">
                {filterItems(PROPERTY_PALETTE).map(item => renderPaletteItem(item))}
              </div>
            </div>
          )}
          <div className="palette-section">
            <div className="palette-section-title">Tools</div>
            <div className="palette-grid">
              {renderPaletteItem({ type: 'eraser', label: 'Eraser', textureName: '' })}
            </div>
          </div>
        </div>

        <div className="resize-handle" onMouseDown={() => setIsResizing(true)} />

        <div className="canvas-container">
          <div
            ref={gridRef}
            className="editor-grid"
            style={{
              gridTemplateColumns: `repeat(${grid.width}, ${CELL_SIZE}px)`,
              gridTemplateRows: `repeat(${grid.height}, ${CELL_SIZE}px)`,
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onContextMenu={handleContextMenu}
          >
            {renderCells()}
          </div>
        </div>

        <div className="sidebar-right">
          <div className="sidebar-title">My Maps</div>
          <div className="saved-maps-list">
            {savedMaps.length === 0 && <div className="no-maps">Auto-saved maps appear here</div>}
            {savedMaps.map(map => (
              <div
                key={map.id}
                className={`saved-map-item ${map.id === currentMapId ? 'active' : ''}`}
                onClick={() => handleLoadMap(map.id)}
                onDoubleClick={(e) => { e.stopPropagation(); setRenamingId(map.id); }}
              >
                {renamingId === map.id ? (
                  <input
                    className="saved-map-rename-input"
                    defaultValue={map.name}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRename(map.id, (e.target as HTMLInputElement).value);
                      }
                    }}
                    onBlur={(e) => handleRename(map.id, e.target.value)}
                  />
                ) : (
                  <span className="saved-map-name">{map.name}</span>
                )}
                <button
                  className="saved-map-delete"
                  onClick={(e) => { e.stopPropagation(); handleDeleteMap(map.id); }}
                  title="Delete"
                >×</button>
              </div>
            ))}
          </div>
          <div className="sidebar-section">
            <div className="sidebar-title">Controls</div>
            <div className="help-text">
              <p>Click to place</p>
              <p>Right-click to erase</p>
              <p>Drag to paint</p>
            </div>
          </div>
        </div>
      </div>

      {sharedMapPopup && (
        <div className="shared-map-overlay">
          <div className="shared-map-modal">
            <h2>Shared Map</h2>
            <p className="shared-map-name">{sharedMapPopup.data.name}</p>
            <p className="shared-map-info">{sharedMapPopup.data.sceneWidth}×{sharedMapPopup.data.sceneHeight}</p>
            <div className="shared-map-buttons">
              <button onClick={() => loadSharedMap(sharedMapPopup.data)}>Edit</button>
              <button onClick={() => playSharedMap(sharedMapPopup.data)}>▶ Play</button>
              <button onClick={() => { setSharedMapPopup(null); navigate('/editor', { replace: true }); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
