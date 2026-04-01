import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, createGrid, addEntity, removeEntity } from '../engine/grid';
import { createEntity, Entity, EntityType, TextWord } from '../engine/entities';
import './Editor.css';

const CELL_SIZE = 32;
const DEFAULT_WIDTH = 15;
const DEFAULT_HEIGHT = 11;

type PlaceTool = EntityType | 'eraser';

interface PaletteItem {
  type: PlaceTool;
  label: string;
  color?: string;
  isText?: boolean;
  word?: TextWord;
}

const PALETTE: PaletteItem[] = [
  { type: 'BABA', label: 'Baba', color: '#ffffff' },
  { type: 'WALL', label: 'Wall', color: '#8B4513' },
  { type: 'ROCK', label: 'Rock', color: '#808080' },
  { type: 'FLAG', label: 'Flag', color: '#ff4444' },
  { type: 'TEXT_WORD', label: 'Text', color: '#ffff00', isText: true },
  { type: 'TEXT_IS', label: 'IS', color: '#ffff00', isText: true, word: 'IS' as TextWord },
  { type: 'TEXT_AND', label: 'AND', color: '#ffff00', isText: true, word: 'AND' as TextWord },
  { type: 'TEXT_YOU', label: 'YOU', color: '#ffff00', isText: true, word: 'YOU' as TextWord },
  { type: 'TEXT_WIN', label: 'WIN', color: '#ffff00', isText: true, word: 'WIN' as TextWord },
  { type: 'TEXT_PUSH', label: 'PUSH', color: '#ffff00', isText: true, word: 'PUSH' as TextWord },
  { type: 'TEXT_STOP', label: 'STOP', color: '#ffff00', isText: true, word: 'STOP' as TextWord },
  { type: 'TEXT_LOVE', label: 'LOVE', color: '#ffff00', isText: true, word: 'LOVE' as TextWord },
  { type: 'TEXT_HATE', label: 'HATE', color: '#ffff00', isText: true, word: 'HATE' as TextWord },
  { type: 'eraser', label: 'Eraser', color: '#ff0000' },
];

function entityColor(type: string): string {
  switch (type) {
    case 'BABA': return '#ffffff';
    case 'WALL': return '#8B4513';
    case 'ROCK': return '#808080';
    case 'FLAG': return '#ff4444';
    case 'TEXT_WORD':
    case 'TEXT_IS':
    case 'TEXT_AND':
    case 'TEXT_YOU':
    case 'TEXT_WIN':
    case 'TEXT_PUSH':
    case 'TEXT_STOP':
    case 'TEXT_LOVE':
    case 'TEXT_HATE':
      return '#ffff00';
    default: return '#cccccc';
  }
}

function entityLetter(type: string, entity?: Entity): string {
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
      default: return '?';
    }
  }
  switch (type) {
    case 'BABA': return 'B';
    case 'WALL': return '';
    case 'ROCK': return 'R';
    case 'FLAG': return 'F';
    default: return '?';
  }
}

export function Editor() {
  const navigate = useNavigate();
  const [grid, setGrid] = useState<Grid>(() => createGrid(DEFAULT_WIDTH, DEFAULT_HEIGHT));
  const [selectedTool, setSelectedTool] = useState<PlaceTool>('BABA');
  const [levelName, setLevelName] = useState('My Level');
  const [isPainting, setIsPainting] = useState(false);
  const [textInput, setTextInput] = useState<{ x: number; y: number; value: string } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Save grid to localStorage whenever it changes
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
      // Remove all entities at this cell
      const cell = grid.cells[y][x];
      const toRemove = [...cell.entities];
      for (const id of toRemove) {
        removeEntity(grid, id);
      }
      setGrid({ ...grid });
    } else {
      // Remove existing entities at this cell first
      const cell = grid.cells[y][x];
      const toRemove = [...cell.entities];
      for (const id of toRemove) {
        removeEntity(grid, id);
      }

      // For TEXT_WORD, we need to prompt for the word value
      if (selectedTool === 'TEXT_WORD') {
        setTextInput({ x, y, value: '' });
      } else {
        const paletteItem = PALETTE.find(p => p.type === selectedTool);
        const entity = createEntity(
          selectedTool as EntityType,
          { x, y },
          paletteItem?.word as TextWord | undefined
        );
        addEntity(grid, entity);
        setGrid({ ...grid });
      }
    }
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (e.button === 2) return; // Right click handled separately
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
    // Right click erases
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
    const validWords: TextWord[] = ['BABA', 'WALL', 'ROCK', 'FLAG', 'YOU', 'WIN', 'PUSH', 'STOP', 'LOVE', 'HATE'];
    if (!validWords.includes(upperWord)) {
      setTextInput(null);
      return;
    }
    // Remove existing entities at this cell
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
    const data = {
      id: 'custom',
      name: levelName,
      width: grid.width,
      height: grid.height,
      entities: Array.from(grid.entities.values()),
    };
    const json = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      alert('Level JSON copied to clipboard!');
    }).catch(() => {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = json;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('Level JSON copied to clipboard!');
    });
  }

  function handleLoad() {
    const json = prompt('Paste level JSON:');
    if (!json) return;
    try {
      const data = JSON.parse(json);
      const newGrid = createGrid(data.width, data.height);
      for (const entity of data.entities) {
        addEntity(newGrid, entity);
      }
      setGrid(newGrid);
      setLevelName(data.name || 'My Level');
    } catch (e) {
      alert('Invalid level JSON');
    }
  }

  function handlePlay() {
    navigate('/play?level=editor-temp');
  }

  function renderCells() {
    const cells: JSX.Element[] = [];
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const cell = grid.cells[y][x];
        const key = `${x}-${y}`;

        if (cell.entities.length === 0) {
          cells.push(
            <div key={key} className="editor-cell empty" />
          );
        } else {
          // Render entities
          const allEntities = cell.entities.map(id => grid.entities.get(id)!).filter(e => e);
          const nonText = allEntities.filter(e => !e.type.startsWith('TEXT_'));
          const textEnts = allEntities.filter(e => e.type.startsWith('TEXT_'));

          cells.push(
            <div key={key} className="editor-cell">
              {nonText.map(e => (
                <div
                  key={e.id}
                  className={`editor-entity editor-entity-${e.type.toLowerCase()}`}
                  style={{ backgroundColor: entityColor(e.type) }}
                >
                  {entityLetter(e.type, e)}
                </div>
              ))}
              {textEnts.map(e => (
                <div
                  key={e.id}
                  className="editor-entity editor-entity-text"
                  style={{ backgroundColor: entityColor(e.type) }}
                >
                  {entityLetter(e.type, e)}
                </div>
              ))}
            </div>
          );
        }
      }
    }
    return cells;
  }

  return (
    <div className="editor-page">
      {/* Top Bar */}
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
          <button className="editor-btn" onClick={handleSave}>Save JSON</button>
          <button className="editor-btn" onClick={handleLoad}>Load JSON</button>
          <button className="editor-btn play-btn" onClick={handlePlay}>Play</button>
        </div>
      </div>

      <div className="editor-main">
        {/* Left Sidebar - Palette */}
        <div className="palette">
          <div className="palette-title">Elements</div>
          {PALETTE.map(item => (
            <button
              key={item.type}
              className={`palette-item ${selectedTool === item.type ? 'selected' : ''}`}
              onClick={() => setSelectedTool(item.type)}
            >
              <div
                className="palette-swatch"
                style={{ backgroundColor: item.color }}
              />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Center - Grid Canvas */}
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

          {/* Text Input Modal */}
          {textInput && (
            <div className="text-input-overlay">
              <div className="text-input-modal">
                <div className="text-input-title">Enter word:</div>
                <div className="text-input-hint">BABA, WALL, ROCK, FLAG, YOU, WIN, PUSH, STOP, LOVE, HATE</div>
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

        {/* Right Sidebar */}
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
