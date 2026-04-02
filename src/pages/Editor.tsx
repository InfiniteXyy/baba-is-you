import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, createGrid, addEntity, removeEntity } from '../engine/grid';
import { createEntity, Entity, TextWord } from '../engine/entities';
import { useSprites, getSpriteDataUrl, SpriteSheet } from '../data/sprites';
import { parseCommunityLevel, levelToCommunityFormat, CommunityLevel } from '../data/communityLevel';
import './Editor.css';

const CELL_SIZE = 32;
const DEFAULT_WIDTH = 15;
const DEFAULT_HEIGHT = 11;

type PlaceTool = string;

interface PaletteItem {
  type: PlaceTool;
  label: string;
  textureName: string;
  isText?: boolean;
  word?: TextWord;
}

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
  const gridRef = useRef<HTMLDivElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save to editor-grid for Play route
  useEffect(() => {
    const levelData = {
      id: 'editor-temp',
      name: levelName,
      width: grid.width,
      height: grid.height,
      entities: Array.from(grid.entities.values()),
    };
    const communityJson = levelToCommunityFormat(levelData);
    localStorage.setItem('editor-grid', JSON.stringify(communityJson));
  }, [grid, levelName]);

  // Auto-save current map to localStorage (debounced)
  const autoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      const levelData = {
        id: currentMapId || 'custom',
        name: levelName,
        width: grid.width,
        height: grid.height,
        entities: Array.from(grid.entities.values()),
      };
      const communityJson = levelToCommunityFormat(levelData);
      const json = JSON.stringify(communityJson);
      const now = Date.now();

      setSavedMaps(prev => {
        let updated: SavedMap[];
        if (currentMapId) {
          updated = prev.map(m =>
            m.id === currentMapId ? { ...m, name: levelName, updatedAt: now, data: json } : m
          );
        } else {
          const id = crypto.randomUUID();
          setCurrentMapId(id);
          updated = [...prev, { id, name: levelName, updatedAt: now, data: json }];
        }
        localStorage.setItem('editor-saved-maps', JSON.stringify(updated));
        return updated;
      });
    }, 800);
  }, [currentMapId, grid, levelName]);

  useEffect(() => {
    autoSave();
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [grid, levelName, autoSave]);

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
    navigate('/play?level=editor-temp');
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
          <button className="editor-btn play-btn" onClick={handlePlay}>▶ Play</button>
        </div>
      </div>

      <div className="editor-main">
        <div className="palette">
          <div className="palette-section">
            <div className="palette-section-title">Characters</div>
            <div className="palette-grid">
              {CHARACTER_PALETTE.map(item => renderPaletteItem(item))}
            </div>
          </div>
          <div className="palette-section">
            <div className="palette-section-title">Nouns</div>
            <div className="palette-grid">
              {NOUN_PALETTE.map(item => renderPaletteItem(item))}
            </div>
          </div>
          <div className="palette-section">
            <div className="palette-section-title">Operators</div>
            <div className="palette-grid">
              {OPERATOR_PALETTE.map(item => renderPaletteItem(item))}
            </div>
          </div>
          <div className="palette-section">
            <div className="palette-section-title">Properties</div>
            <div className="palette-grid">
              {PROPERTY_PALETTE.map(item => renderPaletteItem(item))}
            </div>
          </div>
          <div className="palette-section">
            <div className="palette-section-title">Tools</div>
            <div className="palette-grid">
              {renderPaletteItem({ type: 'eraser', label: 'Eraser', textureName: '' })}
            </div>
          </div>
        </div>

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
              >
                <span className="saved-map-name">{map.name}</span>
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
    </div>
  );
}
