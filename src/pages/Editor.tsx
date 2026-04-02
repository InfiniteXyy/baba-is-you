import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Grid, createGrid, addEntity, removeEntity } from '../engine/grid';
import { createEntity, Entity, TextWord } from '../engine/entities';
import { useSprites } from '../data/sprites';
import { parseCommunityLevel, levelToCommunityFormat, CommunityLevel } from '../data/communityLevel';
import { CELL_SIZE, DEFAULT_WIDTH, DEFAULT_HEIGHT, QUICK_PATTERNS, PlaceTool, SavedMap } from './editor/constants';
import { EditorPalette } from './editor/EditorPalette';
import { EditorSidebar } from './editor/EditorSidebar';
import { EditorCanvas } from './editor/EditorCanvas';
import { SharedMapPopup } from './editor/SharedMapPopup';
import './Editor.css';

export function Editor() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const spriteSheet = useSprites();
  const [savedMaps, setSavedMaps] = useState<SavedMap[]>(() => {
    const stored = localStorage.getItem('editor-saved-maps');
    return stored ? JSON.parse(stored) : [];
  });
  const [currentMapId, setCurrentMapId] = useState<string | null>(() => {
    return searchParams.get('id') || null;
  });
  const [grid, setGrid] = useState<Grid>(() => createGrid(DEFAULT_WIDTH, DEFAULT_HEIGHT));
  const [gridWidth, setGridWidth] = useState(DEFAULT_WIDTH);
  const [gridHeight, setGridHeight] = useState(DEFAULT_HEIGHT);
  const [selectedTool, setSelectedTool] = useState<PlaceTool>('BABA');
  const [levelName, setLevelName] = useState('My Level');
  const [isPainting, setIsPainting] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [paletteWidth, setPaletteWidth] = useState(() => {
    const stored = localStorage.getItem('editor-palette-width');
    return stored ? Number(stored) : 240;
  });
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

  function loadMapFromSaved(map: SavedMap) {
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
    setCurrentMapId(map.id);
  }

  // Load shared map from URL, or from ?id=, or auto-load most recent saved map
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
      return;
    }

    const urlId = searchParams.get('id');
    if (urlId) {
      const stored = localStorage.getItem('editor-saved-maps');
      const maps: SavedMap[] = stored ? JSON.parse(stored) : [];
      const map = maps.find(m => m.id === urlId);
      if (map) {
        try {
          loadMapFromSaved(map);
        } catch {
          console.error('Failed to load map from URL id');
        }
      }
      return;
    }

    // No ?map= and no ?id= — auto-load the most recently updated saved map
    const stored = localStorage.getItem('editor-saved-maps');
    const maps: SavedMap[] = stored ? JSON.parse(stored) : [];
    if (maps.length > 0) {
      const mostRecent = maps.sort((a, b) => b.updatedAt - a.updatedAt)[0];
      try {
        loadMapFromSaved(mostRecent);
      } catch {
        console.error('Failed to auto-load most recent map');
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
    navigate('/editor', { replace: true });
  }

  function playSharedMap(data: CommunityLevel) {
    const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
    setSharedMapPopup(null);
    navigate(`/play?map=${encoded}`);
  }

  // Sync currentMapId to URL
  useEffect(() => {
    const currentUrlId = searchParams.get('id');
    if (currentMapId && currentMapId !== currentUrlId) {
      setSearchParams({ id: currentMapId }, { replace: true });
    } else if (!currentMapId && currentUrlId) {
      setSearchParams({}, { replace: true });
    }
  }, [currentMapId]);

  // Resizable palette
  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e: MouseEvent) => {
      const newWidth = Math.max(160, Math.min(400, e.clientX - 16));
      setPaletteWidth(newWidth);
    };
    const handleUp = () => {
      setIsResizing(false);
      setPaletteWidth(w => { localStorage.setItem('editor-palette-width', String(w)); return w; });
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isResizing]);

  // Debounced auto-save (uses refs to avoid re-triggering)
  const hasUserEdited = useRef(false);
  useEffect(() => {
    if (!hasUserEdited.current) {
      hasUserEdited.current = true;
      if (!currentMapIdRef.current) return;
    }

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      const g = gridRef2.current;
      const name = levelNameRef.current;
      const mapId = currentMapIdRef.current;

      const tempData = {
        id: 'editor-temp', name, width: g.width, height: g.height,
        entities: Array.from(g.entities.values()),
      };
      localStorage.setItem('editor-grid', JSON.stringify(levelToCommunityFormat(tempData)));

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
      loadMapFromSaved(map);
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

  function handleDuplicateMap(id: string) {
    const source = savedMaps.find(m => m.id === id);
    if (!source) return;
    const newId = crypto.randomUUID();
    const duplicate: SavedMap = {
      id: newId,
      name: `${source.name} (copy)`,
      updatedAt: Date.now(),
      data: source.data,
    };
    const updated = [...savedMaps, duplicate];
    setSavedMaps(updated);
    localStorage.setItem('editor-saved-maps', JSON.stringify(updated));
    handleLoadMap(newId);
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
        <EditorPalette
          paletteWidth={paletteWidth}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedTool={selectedTool}
          setSelectedTool={setSelectedTool}
          setIsResizing={setIsResizing}
          spriteSheet={spriteSheet}
        />

        <EditorCanvas
          grid={grid}
          spriteSheet={spriteSheet}
          cellSize={CELL_SIZE}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onContextMenu={handleContextMenu}
          gridRef={gridRef}
        />

        <EditorSidebar
          savedMaps={savedMaps}
          currentMapId={currentMapId}
          renamingId={renamingId}
          setRenamingId={setRenamingId}
          onLoadMap={handleLoadMap}
          onDeleteMap={handleDeleteMap}
          onDuplicateMap={handleDuplicateMap}
          onRename={handleRename}
        />
      </div>

      {sharedMapPopup && (
        <SharedMapPopup
          data={sharedMapPopup.data}
          onEdit={() => loadSharedMap(sharedMapPopup.data)}
          onPlay={() => playSharedMap(sharedMapPopup.data)}
          onCancel={() => { setSharedMapPopup(null); navigate('/editor', { replace: true }); }}
        />
      )}
    </div>
  );
}
