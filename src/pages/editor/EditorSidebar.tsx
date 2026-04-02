import { SavedMap } from './constants';

interface EditorSidebarProps {
  savedMaps: SavedMap[];
  currentMapId: string | null;
  renamingId: string | null;
  setRenamingId: (id: string | null) => void;
  onLoadMap: (id: string) => void;
  onDeleteMap: (id: string) => void;
  onDuplicateMap: (id: string) => void;
  onRename: (id: string, newName: string) => void;
}

export function EditorSidebar({
  savedMaps, currentMapId, renamingId, setRenamingId,
  onLoadMap, onDeleteMap, onDuplicateMap, onRename,
}: EditorSidebarProps) {
  return (
    <div className="sidebar-right">
      <div className="sidebar-title">My Maps</div>
      <div className="saved-maps-list">
        {savedMaps.length === 0 && <div className="no-maps">Auto-saved maps appear here</div>}
        {savedMaps.map(map => (
          <div
            key={map.id}
            className={`saved-map-item ${map.id === currentMapId ? 'active' : ''}`}
            onClick={() => onLoadMap(map.id)}
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
                    onRename(map.id, (e.target as HTMLInputElement).value);
                  }
                }}
                onBlur={(e) => onRename(map.id, e.target.value)}
              />
            ) : (
              <span className="saved-map-name">{map.name}</span>
            )}
            <div className="saved-map-actions">
              <button
                className="saved-map-action"
                onClick={(e) => { e.stopPropagation(); onDuplicateMap(map.id); }}
                title="Duplicate"
              >⧉</button>
              <button
                className="saved-map-action"
                onClick={(e) => { e.stopPropagation(); onDeleteMap(map.id); }}
                title="Delete"
              >×</button>
            </div>
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
  );
}
