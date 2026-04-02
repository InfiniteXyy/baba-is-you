import { CommunityLevel } from '../../data/communityLevel';

interface SharedMapPopupProps {
  data: CommunityLevel;
  onEdit: () => void;
  onPlay: () => void;
  onCancel: () => void;
}

export function SharedMapPopup({ data, onEdit, onPlay, onCancel }: SharedMapPopupProps) {
  const btnBase = 'px-5 py-2 border border-border-hover bg-[#1a1a1a] text-text-primary rounded cursor-pointer text-[0.8rem] transition-all duration-150 hover:bg-[#252525] hover:border-border-bright';
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-100">
      <div className="bg-[#141414] border border-border-hover rounded-lg px-8 py-6 text-center min-w-[280px]">
        <h2 className="m-0 mb-3 text-[1.1rem] text-text-primary">Shared Map</h2>
        <p className="text-text-light text-[0.85rem] m-0 mb-1">{data.name}</p>
        <p className="text-text-subtle text-[0.75rem] m-0 mb-5">{data.sceneWidth}×{data.sceneHeight}</p>
        <div className="flex gap-2.5 justify-center">
          <button className={`${btnBase} !bg-[#1a3a1a] !border-[#2a5a2a] hover:!bg-[#2a4a2a]`} onClick={onEdit}>Edit</button>
          <button className={btnBase} onClick={onPlay}>▶ Play</button>
          <button className={btnBase} onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
