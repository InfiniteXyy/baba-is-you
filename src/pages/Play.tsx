import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Grid, createGrid, addEntity, cloneGrid } from '../engine/grid';
import { tick, Direction } from '../engine/movement';
import { levels, getLevelById, Level } from '../data/levels';
import { parseCommunityLevel, CommunityLevel } from '../data/communityLevel';
import { Entity } from '../engine/entities';
import { evaluateRules, getPropertiesForType, RuleSet } from '../engine/rules';
import { useSprites, getSpriteDataUrl, SpriteSheet } from '../data/sprites';
import './Play.css';

type PlayState = 'menu' | 'playing' | 'won' | 'dead';

const CELL_SIZE = 40;
const STEP = CELL_SIZE;
const ANIM_INTERVAL = 200;
const ANIM_FRAMES = 3;

function entityFallbackLabel(type: string, entity: Entity): string {
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

function renderGameGrid(grid: Grid, spriteSheet: SpriteSheet | null, animFrame: number, rules: RuleSet): React.JSX.Element {
  const gridW = grid.width * STEP;
  const gridH = grid.height * STEP;

  const allEntities = Array.from(grid.entities.values());
  const nonText = allEntities.filter(e => !e.type.startsWith('TEXT_'));
  const textEnts = allEntities.filter(e => e.type.startsWith('TEXT_'));

  const renderEntity = (e: Entity) => {
    const spriteUrl = spriteSheet ? getSpriteDataUrl(spriteSheet, e.textureName, animFrame, CELL_SIZE) : null;
    const flipX = e.facing === 'left' && !e.type.startsWith('TEXT_');
    const props = getPropertiesForType(rules, e.type);
    const isStop = props.isStop;

    return (
      <div
        key={e.id}
        className={`entity ${spriteUrl ? 'entity-sprite' : (e.type.startsWith('TEXT_') ? 'entity-text' : `entity-${e.type.toLowerCase()}`)}`}
        style={{
          left: e.position.x * STEP,
          top: e.position.y * STEP,
          ...(spriteUrl ? {
            backgroundImage: `url(${spriteUrl})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          } : {}),
          ...(flipX ? { transform: 'scaleX(-1)' } : {}),
          ...(!isStop && !e.type.startsWith('TEXT_') ? { opacity: 0.7 } : {}),
        }}
      >
        {!spriteUrl && entityFallbackLabel(e.type, e)}
      </div>
    );
  };

  return (
    <div className="game-grid" style={{ width: gridW, height: gridH }}>
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
  const spriteSheet = useSprites();
  const [animFrame, setAnimFrame] = useState(0);

  // Animation frame cycling
  useEffect(() => {
    if (gameState !== 'playing') return;
    const timer = setInterval(() => {
      setAnimFrame(f => (f + 1) % ANIM_FRAMES);
    }, ANIM_INTERVAL);
    return () => clearInterval(timer);
  }, [gameState]);

  const rules = useMemo(() => grid ? evaluateRules(grid) : new Map(), [grid]);

  useEffect(() => {
    const levelId = searchParams.get('level');
    const mapData = searchParams.get('map');
    if (mapData) {
      try {
        const json = decodeURIComponent(atob(mapData));
        const parsed = JSON.parse(json);
        const lvl = parseCommunityLevel(parsed as CommunityLevel);
        startLevel(lvl);
      } catch (e) {
        console.error('Failed to load shared map:', e);
      }
    } else if (levelId) {
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
        let lvl: Level;
        if (parsed.thingsMap) {
          lvl = parseCommunityLevel(parsed as CommunityLevel);
        } else {
          lvl = {
            id: 'editor-temp',
            name: parsed.name || 'Custom',
            width: parsed.width,
            height: parsed.height,
            entities: parsed.entities,
          };
        }
        const g = createGrid(lvl.width, lvl.height);
        for (const entity of lvl.entities) {
          addEntity(g, entity);
        }
        setGrid(g);
        setLevel(lvl);
        setMoveCount(0);
        setGameState('playing');
      }
    } catch (e) {
      console.error('Failed to load editor grid:', e);
    }
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Handle keyboard shortcuts in death dialog
    if (gameState === 'dead' && grid) {
      switch (e.key) {
        case 'z':
        case 'Z':
          e.preventDefault();
          if (historyRef.current.length > 0) {
            const prev = historyRef.current[historyRef.current.length - 1];
            historyRef.current = historyRef.current.slice(0, -1);
            setGrid(prev);
            setMoveCount(m => Math.max(0, m - 1));
            setGameState('playing');
          }
          return;
        case 'r':
        case 'R':
          if (level) startLevel(level);
          return;
      }
      return;
    }

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
    } else if (result.dead) {
      setGameState('dead');
    }
  }, [gameState, grid, level]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const levelId = searchParams.get('level');
    if (levelId === 'editor-temp' && gameState === 'menu') {
      loadEditorTemp();
    }
  }, []);

  if (gameState === 'menu') {
    // Group levels by world (first digit of level number)
    const worlds: { name: string; levels: Level[] }[] = [
      { name: 'World 0', levels: [] },
      { name: 'World 1', levels: [] },
      { name: 'World 2', levels: [] },
      { name: 'World 3', levels: [] },
    ];
    for (const lvl of levels) {
      const m = lvl.id.match(/level(\d)/);
      if (m) {
        const idx = parseInt(m[1]);
        if (worlds[idx]) worlds[idx].levels.push(lvl);
      }
    }
    // Remove empty worlds
    const activeWorlds = worlds.filter(w => w.levels.length > 0);

    return (
      <div className="play-page">
        <h1 className="game-title">BABA IS YOU</h1>
        <p className="game-subtitle">push the rules, break the rules</p>
        <div className="level-select">
          {activeWorlds.map((world, wi) => (
            <div key={wi} className="world-group">
              <div className="world-label">{world.name}</div>
              <div className="level-grid">
                {world.levels.map((lvl, li) => (
                  <button
                    key={lvl.id}
                    className="level-card"
                    onClick={() => startLevel(lvl)}
                  >
                    <span className="level-number">{li + 1}</span>
                    <span className="level-card-name">{lvl.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            className="editor-launch"
            onClick={() => window.location.hash = '#/editor'}
          >
            ✏️ Map Editor
          </button>
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
        {renderGameGrid(grid, spriteSheet, animFrame, rules)}
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

      {gameState === 'dead' && (
        <div className="death-overlay">
          <div className="death-modal">
            <h2>You Died</h2>
            <p>Don't give up!</p>
            <div className="win-buttons">
              <button onClick={() => startLevel(level)}>Retry</button>
              <button onClick={() => {
                if (historyRef.current.length > 0) {
                  const prev = historyRef.current[historyRef.current.length - 1];
                  historyRef.current = historyRef.current.slice(0, -1);
                  setGrid(prev);
                  setMoveCount(m => Math.max(0, m - 1));
                  setGameState('playing');
                }
              }}>Undo</button>
              <button onClick={() => setGameState('menu')}>Menu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
