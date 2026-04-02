import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Grid, createGrid, addEntity, cloneGrid } from '../engine/grid';
import { tick, Direction } from '../engine/movement';
import { levels, getLevelById, Level } from '../data/levels';
import { parseCommunityLevel, CommunityLevel } from '../data/communityLevel';
import { Entity } from '../engine/entities';
import { evaluateRules, getPropertiesForType, RuleSet } from '../engine/rules';
import { useSprites, getSpriteDataUrl, SpriteSheet } from '../data/sprites';

type PlayState = 'menu' | 'playing' | 'won' | 'dead';

const CELL_SIZE = 40;
const STEP = CELL_SIZE;
const ANIM_INTERVAL = 200;
const ANIM_FRAMES = 3;

const entityTypeStyles: Record<string, React.CSSProperties> = {
  baba: {
    fontSize: '20px',
    color: '#333',
    background: '#f8f8f0',
    border: '2px solid #ddd',
    borderRadius: '4px',
    boxShadow: 'inset -2px -2px 0 #ccc, inset 2px 2px 0 #fff',
  },
  wall: {
    background: '#6b3a1f',
    border: '1px solid #4a2510',
    boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.1), inset -1px -1px 0 rgba(0,0,0,0.3)',
    backgroundImage: 'linear-gradient(0deg, rgba(0,0,0,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
    backgroundSize: '10px 10px',
  },
  rock: {
    fontSize: '18px',
    color: '#ddd',
    background: '#5a5a6a',
    border: '2px solid #444',
    borderRadius: '50%',
    boxShadow: 'inset -2px -2px 0 #3a3a4a, inset 2px 2px 0 #7a7a8a, 0 2px 4px rgba(0,0,0,0.4)',
  },
  flag: {
    fontSize: '18px',
    color: '#fff',
    background: '#e63946',
    border: '2px solid #b82d38',
    borderRadius: '3px',
    boxShadow: 'inset -2px -2px 0 #b82d38, inset 2px 2px 0 #ff6b6b, 0 0 8px rgba(230,57,70,0.3)',
  },
};

const textEntityStyle: React.CSSProperties = {
  fontSize: '9px',
  fontWeight: 'bold',
  color: '#1a1a2e',
  background: '#ffd166',
  border: '1px solid #d4a830',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  boxShadow: 'inset -1px -1px 0 #c49b28, inset 1px 1px 0 #ffe680',
  zIndex: 2,
};

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
    const isText = e.type.startsWith('TEXT_');
    const typeLower = e.type.toLowerCase();

    let typeStyle: React.CSSProperties = {};
    if (!spriteUrl) {
      if (isText) {
        typeStyle = textEntityStyle;
      } else if (entityTypeStyles[typeLower]) {
        typeStyle = entityTypeStyles[typeLower];
      }
    }

    return (
      <div
        key={e.id}
        className={`absolute w-[40px] h-[40px] flex items-center justify-center font-bold text-sm text-black text-center leading-none rounded-sm entity-transition z-[1]${spriteUrl ? ' !bg-transparent [image-rendering:pixelated]' : ''}`}
        style={{
          left: e.position.x * STEP,
          top: e.position.y * STEP,
          ...typeStyle,
          ...(spriteUrl ? {
            backgroundImage: `url(${spriteUrl})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          } : {}),
          ...(flipX ? { transform: 'scaleX(-1)' } : {}),
          ...(!isStop && !isText ? { opacity: 0.7 } : {}),
        }}
      >
        {!spriteUrl && entityFallbackLabel(e.type, e)}
      </div>
    );
  };

  return (
    <div className="relative bg-[#0a0a0a] p-0 rounded-sm" style={{ width: gridW, height: gridH }}>
      {nonText.map(renderEntity)}
      {textEnts.map(renderEntity)}
    </div>
  );
}

const modalBtnClass = "py-2.5 px-5 text-[0.7rem] bg-[#252550] text-text-primary border-2 border-border-active cursor-pointer uppercase tracking-[1px] transition-all duration-150 hover:bg-[#303060] hover:border-accent-gold hover:text-white hover:shadow-[0_0_12px_rgba(255,209,102,0.2)]";

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
      <div className="min-h-screen bg-bg-dark text-text-white flex flex-col items-center p-5 font-retro">
        <h1 className="text-[2.4rem] mb-[0.3rem] text-white [text-shadow:3px_3px_0_#000,0_0_30px_rgba(255,255,255,0.15)] tracking-[4px] uppercase">BABA IS YOU</h1>
        <p className="text-[0.6rem] text-text-muted mb-10 tracking-[2px] lowercase">push the rules, break the rules</p>
        <div className="w-full max-w-[700px] flex flex-col gap-6">
          {activeWorlds.map((world, wi) => (
            <div key={wi} className="flex flex-col gap-2.5">
              <div className="text-[0.65rem] text-text-subtle tracking-[2px] uppercase pl-1">{world.name}</div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
                {world.levels.map((lvl, li) => (
                  <button
                    key={lvl.id}
                    className="group flex items-center gap-2.5 py-3 px-3.5 bg-bg-card text-text-normal border border-[#1a1a2a] rounded-md cursor-pointer transition-all duration-150 text-left relative overflow-hidden hover:bg-[#18182e] hover:border-border-active hover:text-white hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)] active:translate-y-0"
                    onClick={() => startLevel(lvl)}
                  >
                    <span className="flex items-center justify-center w-[26px] h-[26px] rounded bg-[#1a1a30] text-text-subtle text-[0.6rem] shrink-0 group-hover:bg-[#252550] group-hover:text-text-light">{li + 1}</span>
                    <span className="text-[0.55rem] tracking-[0.5px] leading-[1.3] whitespace-nowrap overflow-hidden text-ellipsis">{lvl.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            className="self-center mt-2 py-2.5 px-7 text-[0.6rem] bg-transparent text-text-muted border border-dashed border-border-hover rounded-md cursor-pointer tracking-[1px] transition-all duration-150 hover:text-text-light hover:border-border-bright hover:bg-[#0e0e16]"
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
    <div className="min-h-screen bg-bg-dark text-text-white flex flex-col items-center p-5 font-retro">
      <div className="w-full max-w-[640px] flex justify-between items-center mb-4 px-2">
        <div>
          <button className="py-1.5 px-3.5 bg-[#1a1a3e] text-text-primary border-2 border-border-hover cursor-pointer text-[0.65rem] uppercase tracking-[1px] transition-all duration-150 hover:bg-[#252550] hover:border-accent-red hover:text-white" onClick={() => setGameState('menu')}>
            Menu
          </button>
        </div>
        <div>
          <span className="text-[0.9rem] font-bold text-accent-red [text-shadow:0_0_10px_rgba(255,107,107,0.3)]">{level.name}</span>
        </div>
        <div>
          <span className="text-[0.65rem] text-text-soft">Moves: {moveCount}</span>
        </div>
      </div>

      <div className="flex justify-center">
        {renderGameGrid(grid, spriteSheet, animFrame, rules)}
      </div>

      <div className="mt-5 text-text-muted text-[0.6rem] tracking-[1px]">
        Arrow keys / WASD to move &bull; Z to undo &bull; R to restart
      </div>

      {gameState === 'won' && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-100 animate-[fade-in_0.3s_ease]">
          <div className="bg-[#1a1a3e] border-[3px] border-accent-gold py-10 px-15 text-center rounded shadow-[0_0_80px_rgba(255,209,102,0.2),0_0_0_1px_rgba(255,209,102,0.1)] animate-[pop-in_0.3s_ease]">
            <h2 className="text-[1.8rem] text-accent-gold mb-4 [text-shadow:2px_2px_0_#000,0_0_20px_rgba(255,209,102,0.4)]">You Win!</h2>
            <p className="text-[0.8rem] text-text-light mb-8">Moves: {moveCount}</p>
            <div className="flex gap-3 justify-center">
              <button className={modalBtnClass} onClick={() => setGameState('menu')}>Menu</button>
              <button className={modalBtnClass} onClick={() => startLevel(level)}>Replay</button>
              {level.id !== 'editor-temp' && (
                <button
                  className={modalBtnClass}
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
        <div className="fixed inset-0 bg-[rgba(20,0,0,0.92)] flex items-center justify-center z-100 animate-[fade-in_0.3s_ease]">
          <div className="bg-[#2a0a0a] border-[3px] border-danger py-10 px-15 text-center rounded shadow-[0_0_80px_rgba(204,68,68,0.2),0_0_0_1px_rgba(204,68,68,0.1)] animate-[pop-in_0.3s_ease]">
            <h2 className="text-[1.8rem] text-danger mb-4 [text-shadow:2px_2px_0_#000,0_0_20px_rgba(204,68,68,0.4)]">You Died</h2>
            <p className="text-[0.8rem] text-text-light mb-8">Don't give up!</p>
            <div className="flex gap-3 justify-center">
              <button className={modalBtnClass} onClick={() => startLevel(level)}>Retry</button>
              <button className={modalBtnClass} onClick={() => {
                if (historyRef.current.length > 0) {
                  const prev = historyRef.current[historyRef.current.length - 1];
                  historyRef.current = historyRef.current.slice(0, -1);
                  setGrid(prev);
                  setMoveCount(m => Math.max(0, m - 1));
                  setGameState('playing');
                }
              }}>Undo</button>
              <button className={modalBtnClass} onClick={() => setGameState('menu')}>Menu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
