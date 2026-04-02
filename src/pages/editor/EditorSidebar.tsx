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
    <div className="w-[170px] bg-bg-panel border border-border p-3 rounded flex flex-col max-h-[calc(100vh-80px)] overflow-y-auto">
      <div className="text-[0.5rem] text-border-active mb-2.5 uppercase tracking-[2px]">My Maps</div>
      <div className="flex flex-col gap-[3px] flex-1">
        {savedMaps.length === 0 && <div className="text-[0.45rem] text-text-dim text-center py-3">Auto-saved maps appear here</div>}
        {savedMaps.map(map => (
          <div
            key={map.id}
            className={`flex justify-between items-center px-2 py-1.5 bg-bg-input border border-transparent rounded text-[0.5rem] cursor-pointer transition-all duration-100 hover:bg-[#1a1a1a] hover:border-border-hover ${map.id === currentMapId ? '!border-border-active !bg-[#151515]' : ''}`}
            onClick={() => onLoadMap(map.id)}
            onDoubleClick={(e) => { e.stopPropagation(); setRenamingId(map.id); }}
          >
            {renamingId === map.id ? (
              <input
                className="bg-bg-input border border-border-active text-white px-1 py-0.5 text-[0.5rem] font-[inherit] w-full rounded-sm flex-1 focus:outline-none focus:border-text-subtle"
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
              <span className={`text-text-soft overflow-hidden text-ellipsis whitespace-nowrap flex-1 ${map.id === currentMapId ? '!text-text-bright' : 'group-hover:text-text-bright'}`}>{map.name}</span>
            )}
            <div className="flex gap-0.5 shrink-0">
              <button
                className="bg-transparent border-none text-text-dim cursor-pointer text-[0.7rem] px-[3px] font-[inherit] transition-colors duration-100 hover:text-text-light"
                onClick={(e) => { e.stopPropagation(); onDuplicateMap(map.id); }}
                title="Duplicate"
              >⧉</button>
              <button
                className="bg-transparent border-none text-text-dim cursor-pointer text-[0.7rem] px-[3px] font-[inherit] transition-colors duration-100 hover:text-danger"
                onClick={(e) => { e.stopPropagation(); onDeleteMap(map.id); }}
                title="Delete"
              >×</button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5">
        <div className="text-[0.5rem] text-border-active mb-2.5 uppercase tracking-[2px]">Controls</div>
        <div className="text-[0.45rem] text-text-dim leading-[2.2]">
          <p className="my-0.5">Click to place</p>
          <p className="my-0.5">Right-click to erase</p>
          <p className="my-0.5">Drag to paint</p>
        </div>
      </div>
    </div>
  );
}
