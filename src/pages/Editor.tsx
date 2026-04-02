import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, createGrid, addEntity, removeEntity } from '../engine/grid';
import { createEntity, Entity, TextWord } from '../engine/entities';
import { useSprites, getSpriteDataUrl, SpriteSheet } from '../data/sprites';
import { parseCommunityLevel, levelToCommunityFormat, CommunityLevel } from '../data/communityLevel';
import './Editor.css';

const CELL_SIZE = 32;
const DEFAULT_WIDTH = 15;
const DEFAULT_HEIGHT = 11;

type PlaceTool = string; // EntityType or 'eraser'

interface PaletteItem {
  type: PlaceTool;
  label: string;
  textureName: string;
  isText?: boolean;
  word?: TextWord;
}

const PALETTE: PaletteItem[] = [
  { type: 'BABA', label: 'Baba', textureName: 'BABA' },
  { type: 'WALL', label: 'Wall', textureName: 'WALL' },
  { type: 'ROCK', label: 'Rock', textureName: 'ROCK' },
  { type: 'FLAG', label: 'Flag', textureName: 'FLAG' },
  { type: 'CRAB', label: 'Crab', textureName: 'CRAB' },
  { type: 'TEXT_WORD', label: 'Text…', textureName: '', isText: true },
  { type: 'TEXT_IS', label: 'IS', textureName: 'Text_IS', isText: true },
  { type: 'TEXT_AND', label: 'AND', textureName: 'Text_AND', isText: true },
  { type: 'TEXT_YOU', label: 'YOU', textureName: 'Text_YOU', isText: true },
  { type: 'TEXT_WIN', label: 'WIN', textureName: 'Text_WIN', isText: true },
  { type: 'TEXT_PUSH', label: 'PUSH', textureName: 'Text_PUSH', isText: true },
  { type: 'TEXT_STOP', label: 'STOP', textureName: 'Text_STOP', isText: true },
  { type: 'TEXT_LOVE', label: 'LOVE', textureName: 'Text_LOVE', isText: true },
  { type: 'TEXT_HATE', label: 'HATE', textureName: 'Text_HATE', isText: true },
  { type: 'TEXT_DEFEAT', label: 'DEFEAT', textureName: 'Text_DEFEAT', isText: true },
  { type: 'eraser', label: 'Eraser', textureName: '' },
];

function entityFallbackLabel(type: string, entity?: Entity): string {
  if (type.startsWith('TEXT_')) {
    switch (type) {
      case 'TEXT_WORD': return entity?.word || '?';
      case 'TEXT_IS': return 'IS';
      case 'TEXT_AND': return 'AND';
      case 'TEXT_YOU': return 'YOU';
      case 'TEXT_WIN': return 'WIN';
      case 'TEXT_PUSH': return 'PUSH';
      case 'TEXT_STOP': return 'STOP';
      case 'TEXT_LOVE': return 'LOVE';
      case 'TEXT_HATE': return 'HATE';
      case 'TEXT_DEFEAT': return 'DEFEAT';
      default: return type.slice(5);
    }
  }
  switch (type) {
    case 'BABA': return 'B';
    case 'WALL': return '';
    case 'ROCK': return 'R';
    case 'FLAG': return 'F';
    case 'CRAB': return 'C';
    default: return type.charAt(0);
  }
}

function fallbackColor(type: string): string {
  switch (type) {
    case 'BABA': return '#ffffff';
    case 'WALL': return '#8B4513';
    case 'ROCK': return '#808080';
    case 'FLAG': return '#ff4444';
    case 'CRAB': return '#cc4444';
    default:
      if (type.startsWith('TEXT_')) return '#ffff00';
      return '#cccccc';
  }
}

export function Editor() {
  const navigate = useNavigate();
  const spriteSheet = useSprites();
  const [grid, setGrid] = useState<Grid>(() => createGrid(DEFAULT_WIDTH, DEFAULT_HEIGHT));
  const [gridWidth, setGridWidth] = useState(DEFAULT_WIDTH);
  const [gridHeight, setGridHeight] = useState(DEFAULT_HEIGHT);
  const [selectedTool, setSelectedTool] = useState<PlaceTool>('BABA');
  const [levelName, setLevelName] = useState('My Level');
  const [isPainting, setIsPainting] = useState(false);
  const [textInput, setTextInput] = useState<{ x: number; y: number; value: string } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const data = {
      id: 'editor-temp',
      name: levelName,
      width: grid.width,
      height: grid.height,
      entities: Array.from(grid.entities.values()),
    };
    localStorage.setItem('editor-grid', JSON.stringify(data));
  }, [grid, levelName]);

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
    if (selectedTool === 'eraser') {
      const cell = grid.cells[y][x];
      const toRemove = [...cell.entities];
      for (const id of toRemove) {
        removeEntity(grid, id);
      }
      setGrid({ ...grid });
    } else {
      const cell = grid.cells[y][x];
      const toRemove = [...cell.entities];
      for (const id of toRemove) {
        removeEntity(grid, id);
      }

      if (selectedTool === 'TEXT_WORD') {
        setTextInput({ x, y, value: '' });
      } else {
        const entity = createEntity(selectedTool, { x, y });
        addEntity(grid, entity);
        setGrid({ ...grid });
      }
    }
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

  function handleTextSubmit(word: string) {
    if (!textInput) return;
    const upperWord = word.toUpperCase() as TextWord;
    const validWords: TextWord[] = ['BABA', 'WALL', 'ROCK', 'FLAG', 'CRAB', 'YOU', 'WIN', 'PUSH', 'STOP', 'LOVE', 'HATE', 'DEFEAT'];
    if (!validWords.includes(upperWord)) {
      setTextInput(null);
      return;
    }
    const cell = grid.cells[textInput.y][textInput.x];
    const toRemove = [...cell.entities];
    for (const id of toRemove) {
      removeEntity(grid, id);
    }
    const entity = createEntity('TEXT_WORD', { x: textInput.x, y: textInput.y }, upperWord);
    addEntity(grid, entity);
    setGrid({ ...grid });
    setTextInput(null);
  }

  function handleSave() {
    // Export in community format
    const levelData = {
      id: 'custom',
      name: levelName,
      width: grid.width,
      height: grid.height,
      entities: Array.from(grid.entities.values()),
    };
    const communityJson = levelToCommunityFormat(levelData);
    const json = JSON.stringify(communityJson, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      alert('Community format JSON copied to clipboard!');
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = json;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('Community format JSON copied to clipboard!');
    });
  }

  function handleLoad() {
    const json = prompt('Paste level JSON (community or internal format):');
    if (!json) return;
    try {
      const data = JSON.parse(json);
      let entities: Entity[];
      let width: number;
      let height: number;
      let name: string;

      if (data.thingsMap) {
        // Community format
        const level = parseCommunityLevel(data as CommunityLevel);
        entities = level.entities;
        width = level.width;
        height = level.height;
        name = level.name;
      } else {
        // Legacy internal format
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
    } catch (e) {
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
    // Fallback
    return (
      <div
        key={e.id}
        className={`editor-entity ${e.type.startsWith('TEXT_') ? 'editor-entity-text' : `editor-entity-${e.type.toLowerCase()}`}`}
        style={{ backgroundColor: fallbackColor(e.type) }}
      >
        {entityFallbackLabel(e.type, e)}
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

  function renderPaletteSwatch(item: PaletteItem) {
    if (item.type === 'eraser') {
      return <div className="palette-swatch" style={{ backgroundColor: '#ff0000' }} />;
    }
    if (spriteSheet && item.textureName) {
      const url = getSpriteDataUrl(spriteSheet, item.textureName, 0, 18);
      if (url) {
        return (
          <div
            className="palette-swatch"
            style={{
              backgroundImage: `url(${url})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              imageRendering: 'pixelated',
            }}
          />
        );
      }
    }
    return <div className="palette-swatch" style={{ backgroundColor: fallbackColor(item.type) }} />;
  }

  return (
    <div className="editor-page">
      <div className="editor-topbar">
        <div className="topbar-left">
          <a href="/play" className="back-link">Game</a>
        </div>
        <div className="topbar-center">
          <input
            type="text"
            className="level-name-input"
            value={levelName}
            onChange={e => setLevelName(e.target.value)}
            placeholder="Level name"
          />
        </div>
        <div className="topbar-right">
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
          <button className="editor-btn" onClick={handleSave}>Save JSON</button>
          <button className="editor-btn" onClick={handleLoad}>Load JSON</button>
          <button className="editor-btn play-btn" onClick={handlePlay}>Play</button>
        </div>
      </div>

      <div className="editor-main">
        <div className="palette">
          <div className="palette-title">Elements</div>
          {PALETTE.map(item => (
            <button
              key={item.type + item.label}
              className={`palette-item ${selectedTool === item.type ? 'selected' : ''}`}
              onClick={() => setSelectedTool(item.type)}
            >
              {renderPaletteSwatch(item)}
              <span>{item.label}</span>
            </button>
          ))}
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

          {textInput && (
            <div className="text-input-overlay">
              <div className="text-input-modal">
                <div className="text-input-title">Enter word:</div>
                <div className="text-input-hint">BABA, WALL, ROCK, FLAG, CRAB, YOU, WIN, PUSH, STOP, LOVE, HATE, DEFEAT</div>
                <input
                  type="text"
                  className="text-input-field"
                  value={textInput.value}
                  onChange={e => setTextInput({ ...textInput, value: e.target.value.toUpperCase() })}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleTextSubmit(textInput.value);
                    if (e.key === 'Escape') setTextInput(null);
                  }}
                  autoFocus
                  maxLength={6}
                />
                <div className="text-input-buttons">
                  <button onClick={() => setTextInput(null)}>Cancel</button>
                  <button onClick={() => handleTextSubmit(textInput.value)}>OK</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sidebar-right">
          <div className="sidebar-title">Controls</div>
          <div className="help-text">
            <p>Click to place</p>
            <p>Right-click to erase</p>
            <p>Drag to paint</p>
          </div>
        </div>
      </div>
    </div>
  );
}
