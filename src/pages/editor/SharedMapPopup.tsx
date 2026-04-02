import { CommunityLevel } from '../../data/communityLevel';

interface SharedMapPopupProps {
  data: CommunityLevel;
  onEdit: () => void;
  onPlay: () => void;
  onCancel: () => void;
}

export function SharedMapPopup({ data, onEdit, onPlay, onCancel }: SharedMapPopupProps) {
  return (
    <div className="shared-map-overlay">
      <div className="shared-map-modal">
        <h2>Shared Map</h2>
        <p className="shared-map-name">{data.name}</p>
        <p className="shared-map-info">{data.sceneWidth}×{data.sceneHeight}</p>
        <div className="shared-map-buttons">
          <button onClick={onEdit}>Edit</button>
          <button onClick={onPlay}>▶ Play</button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
