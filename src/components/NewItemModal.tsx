import { useState } from 'react';

interface Props {
  onClose: () => void;
  onCreate: (name: string, isDir: boolean) => void;
}

export function NewItemModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [isDir, setIsDir] = useState(true);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ minWidth: 340 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">📁 新建</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button className={`btn${isDir ? ' btn-primary' : ''}`} style={{ flex: 1, height: 32 }} onClick={() => setIsDir(true)}>📁 文件夹</button>
              <button className={`btn${!isDir ? ' btn-primary' : ''}`} style={{ flex: 1, height: 32 }} onClick={() => setIsDir(false)}>📄 文件</button>
            </div>
            <label className="label">名称</label>
            <input
              className="input"
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={isDir ? '新建文件夹' : '新建文件.txt'}
              onKeyDown={e => {
                if (e.key === 'Enter' && name.trim()) onCreate(name.trim(), isDir);
                if (e.key === 'Escape') onClose();
              }}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={() => name.trim() && onCreate(name.trim(), isDir)} disabled={!name.trim()}>创建</button>
        </div>
      </div>
    </div>
  );
}
