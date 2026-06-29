import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { formatSize, formatDate } from '../utils/fileUtils';
import type { FileInfo } from '../types';

export function PropertiesPanel({ filePath }: { filePath: string }) {
  const [info, setInfo] = useState<FileInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.getFileInfo(filePath)
      .then(setInfo)
      .catch(e => setError(e.toString()))
      .finally(() => setLoading(false));
  }, [filePath]);

  if (loading) return <div className="loading">计算中…</div>;
  if (error) return <div className="empty-state"><div className="empty-icon">⚠️</div><div style={{ color: 'var(--danger)' }}>{error}</div></div>;
  if (!info) return null;

  const Row = ({ k, v }: { k: string; v: string }) => (
    <div className="prop-row">
      <span className="prop-key">{k}</span>
      <span className="prop-val">{v}</span>
    </div>
  );

  return (
    <div className="properties-panel">
      <div className="prop-section">
        <div className="prop-section-title">基本信息</div>
        <Row k="名称" v={info.name} />
        <Row k="路径" v={info.path} />
        <Row k="类型" v={info.is_dir ? '文件夹' : (info.mime_type || info.extension.toUpperCase())} />
        {!info.is_dir && <Row k="大小" v={`${formatSize(info.size)} (${info.size.toLocaleString()} 字节)`} />}
        <Row k="修改时间" v={formatDate(info.modified)} />
        <Row k="创建时间" v={formatDate(info.created)} />
        <Row k="权限" v={info.permissions} />
      </div>

      {!info.is_dir && (
        <div className="prop-section">
          <div className="prop-section-title">校验值</div>
          <Row k="MD5" v={info.md5} />
          <Row k="SHA-256" v={info.sha256} />
        </div>
      )}
    </div>
  );
}
