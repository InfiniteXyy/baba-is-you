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
  const sidebarTitleClass = "text-[0.5rem] text-[#444] mb-2.5 uppercase tracking-[2px]";
  const mapActionClass = "bg-transparent border-none text-[var(--color-text-dim)] cursor-pointer text-[0.7rem] px-[3px] py-0 font-[inherit] transition-colors duration-100";

  return (
    <div className="w-[170px] bg-[var(--color-bg-panel)] border border-[var(--color-border)] p-3 rounded flex flex-col max-h-[calc(100vh-80px)] overflow-y-auto">
      <div className={sidebarTitleClass}>My Maps</div>
      <div className="flex flex-col gap-[3px] flex-1">
        {savedMaps.length === 0 && <div className="text-[0.45rem] text-[var(--color-text-dim)] text-center py-3">Auto-saved maps appear here</div>}
        {savedMaps.map(map => (
          <div
            key={map.id}
            className={`group flex justify-between items-center px-2 py-1.5 bg-[var(--color-bg-input)] border border-transparent rounded-[3px] text-[0.5rem] cursor-pointer transition-all duration-100 hover:bg-[#1a1a1a] hover:border-[var(--color-border-hover)] ${map.id === currentMapId ? '!border-[var(--color-border-active)] !bg-[#151515]' : ''}`}
            onClick={() => onLoadMap(map.id)}
            onDoubleClick={(e) => { e.stopPropagation(); setRenamingId(map.id); }}
          >
            {renamingId === map.id ? (
              <input
                className="bg-[var(--color-bg-input)] border border-[var(--color-border-active)] text-white py-0.5 px-1 text-[0.5rem] font-[inherit] w-full rounded-sm flex-1 focus:outline-none focus:border-[var(--color-text-subtle)]"
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
              <span className={`overflow-hidden text-ellipsis whitespace-nowrap flex-1 text-[var(--color-text-soft)] group-hover:text-[var(--color-text-bright)] ${map.id === currentMapId ? '!text-[var(--color-text-bright)]' : ''}`}>{map.name}</span>
            )}
            <div className="flex gap-0.5 shrink-0">
              <button
                className={`${mapActionClass} hover:text-[var(--color-text-light)]`}
                onClick={(e) => { e.stopPropagation(); onDuplicateMap(map.id); }}
                title="Duplicate"
              >⧉</button>
              <button
                className={`${mapActionClass} hover:text-[var(--color-danger)]`}
                onClick={(e) => { e.stopPropagation(); onDeleteMap(map.id); }}
                title="Delete"
              >×</button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5">
        <div className={sidebarTitleClass}>Controls</div>
        <div className="text-[0.45rem] text-[var(--color-text-dim)] leading-[2.2] [&_p]:my-0.5">
          <p>Click to place</p>
          <p>Right-click to erase</p>
          <p>Drag to paint</p>
        </div>
      </div>
    </div>
  );
}
