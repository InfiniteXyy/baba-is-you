import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Grid, createGrid, addEntity, cloneGrid } from '../engine/grid';
import { tick, Direction } from '../engine/movement';
import { levels, getLevelById, Level } from '../data/levels';
import { Entity } from '../engine/entities';
import './Play.css';

type PlayState = 'menu' | 'playing' | 'won';

const CELL_SIZE = 40;
const GAP = 2;
const STEP = CELL_SIZE + GAP; // pixel distance between cell origins

function entityLetter(type: string, entity: Entity): string {
  if (type.startsWith('TEXT_')) {
    switch (type) {
      case 'TEXT_WORD': return entity.word || '?';
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

function renderGameGrid(grid: Grid): JSX.Element {
  const gridW = grid.width * STEP + GAP; // +GAP for padding
  const gridH = grid.height * STEP + GAP;

  // Background cells
  const cells: JSX.Element[] = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      cells.push(
        <div
          key={`cell-${x}-${y}`}
          className="cell"
          style={{
            position: 'absolute',
            left: GAP + x * STEP,
            top: GAP + y * STEP,
            width: CELL_SIZE,
            height: CELL_SIZE,
          }}
        />
      );
    }
  }

  // Entities — sorted so text renders on top
  const allEntities = Array.from(grid.entities.values());
  const nonText = allEntities.filter(e => !e.type.startsWith('TEXT_'));
  const textEnts = allEntities.filter(e => e.type.startsWith('TEXT_'));

  const renderEntity = (e: Entity) => {
    const isText = e.type.startsWith('TEXT_');
    return (
      <div
        key={e.id}
        className={`entity ${isText ? 'entity-text' : `entity-${e.type.toLowerCase()}`}`}
        style={{
          left: GAP + e.position.x * STEP,
          top: GAP + e.position.y * STEP,
        }}
      >
        {entityLetter(e.type, e)}
      </div>
    );
  };

  return (
    <div className="game-grid" style={{ width: gridW, height: gridH }}>
      {cells}
      {nonText.map(renderEntity)}
      {textEnts.map(renderEntity)}
    </div>
  );
}

export function Play() {
  const [searchParams] = useSearchParams();
  const [gameState, setGameState] = useState<PlayState>('menu');
  const [grid, setGrid] = useState<Grid | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const historyRef = useRef<Grid[]>([]);

  // Check for level in URL
  useEffect(() => {
    const levelId = searchParams.get('level');
    if (levelId) {
      const lvl = levelId === 'editor-temp' ? null : getLevelById(levelId);
      if (lvl) {
        startLevel(lvl);
      }
    }
  }, [searchParams]);

  function startLevel(lvl: Level) {
    const g = createGrid(lvl.width, lvl.height);
    for (const entity of lvl.entities) {
      addEntity(g, { ...entity, position: { ...entity.position } });
    }
    historyRef.current = [];
    setGrid(g);
    setLevel(lvl);
    setMoveCount(0);
    setGameState('playing');
  }

  function loadEditorTemp() {
    try {
      const data = localStorage.getItem('editor-grid');
      if (data) {
        const parsed = JSON.parse(data);
        const g = createGrid(parsed.width, parsed.height);
        for (const entity of parsed.entities) {
          addEntity(g, entity);
        }
        setGrid(g);
        setLevel({ id: 'editor-temp', name: parsed.name || 'Custom', width: parsed.width, height: parsed.height, entities: [] });
        setMoveCount(0);
        setGameState('playing');
      }
    } catch (e) {
      console.error('Failed to load editor grid:', e);
    }
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameState !== 'playing' || !grid) return;

    let dir: Direction | null = null;
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        dir = 'up';
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        dir = 'down';
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        dir = 'left';
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        dir = 'right';
        break;
      case 'z':
      case 'Z':
        e.preventDefault();
        if (historyRef.current.length > 0) {
          const prev = historyRef.current[historyRef.current.length - 1];
          historyRef.current = historyRef.current.slice(0, -1);
          setGrid(prev);
          setMoveCount(m => Math.max(0, m - 1));
        }
        return;
      case 'r':
      case 'R':
        // Restart level
        if (level) startLevel(level);
        return;
      default:
        return;
    }

    e.preventDefault();
    const result = tick(grid, dir);
    if (result.moved) {
      historyRef.current = [...historyRef.current, cloneGrid(grid)];
      setMoveCount(m => m + 1);
    }
    setGrid(result.grid);
    if (result.won) {
      setGameState('won');
    }
  }, [gameState, grid, level]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Check URL param for editor-temp on mount
  useEffect(() => {
    const levelId = searchParams.get('level');
    if (levelId === 'editor-temp' && gameState === 'menu') {
      loadEditorTemp();
    }
  }, []);

  if (gameState === 'menu') {
    return (
      <div className="play-page">
        <h1 className="game-title">Baba Is You</h1>
        <p className="game-subtitle">A puzzle game where rules are what you make of them</p>
        <div className="level-select">
          <h2>Select Level</h2>
          <div className="level-list">
            {levels.map(lvl => (
              <button
                key={lvl.id}
                className="level-button"
                onClick={() => startLevel(lvl)}
              >
                {lvl.name}
              </button>
            ))}
            <button
              className="level-button editor-button"
              onClick={() => window.location.href = '/editor'}
            >
              Map Editor
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!grid || !level) return null;

  return (
    <div className="play-page">
      <div className="game-header">
        <div className="header-left">
          <button className="back-button" onClick={() => setGameState('menu')}>
            Menu
          </button>
        </div>
        <div className="header-center">
          <span className="level-name">{level.name}</span>
        </div>
        <div className="header-right">
          <span className="move-counter">Moves: {moveCount}</span>
        </div>
      </div>

      <div className="game-area">
        {renderGameGrid(grid)}
      </div>

      <div className="controls-hint">
        Arrow keys / WASD to move &bull; Z to undo &bull; R to restart
      </div>

      {gameState === 'won' && (
        <div className="win-overlay">
          <div className="win-modal">
            <h2>You Win!</h2>
            <p>Moves: {moveCount}</p>
            <div className="win-buttons">
              <button onClick={() => setGameState('menu')}>Menu</button>
              <button onClick={() => startLevel(level)}>Replay</button>
              {level.id !== 'editor-temp' && (
                <button
                  onClick={() => {
                    const idx = levels.findIndex(l => l.id === level.id);
                    if (idx < levels.length - 1) {
                      startLevel(levels[idx + 1]);
                    } else {
                      setGameState('menu');
                    }
                  }}
                >
                  Next Level
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
