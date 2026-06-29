// ImageViewer
import { basename } from '../utils/fileUtils';

export function ImageViewer({ filePath }: { filePath: string }) {
  // Tauri converts file paths to asset URLs via the asset protocol
  const src = navigator.userAgent.includes('Tauri')
    ? `asset://localhost/${encodeURIComponent(filePath.replace(/\\/g, '/'))}`
    : filePath;

  return (
    <div className="image-viewer">
      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{basename(filePath)}</div>
      <img
        src={src}
        alt={basename(filePath)}
        draggable={false}
        onError={e => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    </div>
  );
}
