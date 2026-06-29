import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { formatSize, formatDate, getFileIcon, basename } from '../utils/fileUtils';
import type { ArchiveEntry } from '../types';

interface ArchiveViewerProps {
  filePath: string;
  onExtract: (dest: string) => void;
}

export function ArchiveViewer({ filePath, onExtract }: ArchiveViewerProps) {
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [extractPath, setExtractPath] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'path'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    setLoading(true);
    setError('');
    api.listArchive(filePath)
      .then(data => setEntries(data))
      .catch(e => setError(e.toString()))
      .finally(() => setLoading(false));
    // default extract path: same dir as archive, strip extension
    const dir = filePath.replace(/[/\\][^/\\]+$/, '');
    const name = basename(filePath).replace(/\.[^.]+$/, '');
    setExtractPath(dir + '\\' + name);
  }, [filePath]);

  const sorted = [...entries]
    .filter(e => !filter || e.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      if (a.is_dir !== b.is_dir) return b.is_dir ? 1 : -1;
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'size') cmp = a.size - b.size;
      else cmp = a.path.localeCompare(b.path);
      return sortOrder === 'asc' ? cmp : -cmp;
    });

  const totalSize = entries.reduce((s, e) => s + e.size, 0);
  const totalCompressed = entries.reduce((s, e) => s + e.compressed_size, 0);
  const ratio = totalSize > 0 ? Math.round((1 - totalCompressed / totalSize) * 100) : 0;

  const handleSort = (col: 'name' | 'size' | 'path') => {
    if (sortBy === col) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortOrder('asc'); }
  };

  const sortIcon = (col: string) => sortBy === col ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : '';

  return (
    <div className="archive-viewer">
      <div className="archive-toolbar">
        <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)' }}>{basename(filePath)}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '2px 7px', borderRadius: 3 }}>
          {filePath.split('.').pop()?.toUpperCase()}
        </span>
        <div style={{ flex: 1 }} />
        {!loading && !error && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {entries.length} 项 · {formatSize(totalSize)} {totalCompressed > 0 && `(压缩率 ${ratio}%)`}
          </span>
        )}
      </div>

      {/* Search + extract */}
      <div style={{ display: 'flex', gap: 8, padding: '6px 10px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', alignItems: 'center', flexShrink: 0 }}>
        <input
          className="input"
          style={{ flex: 1, height: 27, fontSize: 12 }}
          placeholder="🔍 过滤文件名…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <input
          className="input"
          style={{ flex: 2, height: 27, fontSize: 11.5, fontFamily: 'var(--font-mono)' }}
          placeholder="解压目标路径"
          value={extractPath}
          onChange={e => setExtractPath(e.target.value)}
        />
        <button
          className="btn btn-primary"
          style={{ height: 27, padding: '0 14px', fontSize: 12, flexShrink: 0 }}
          onClick={() => extractPath && onExtract(extractPath)}
        >
          📤 解压
        </button>
      </div>

      {/* Header */}
      <div className="archive-list-header">
        <span />
        <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('name')}>名称{sortIcon('name')}</span>
        <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('size')}>大小{sortIcon('size')}</span>
        <span>压缩后</span>
        <span>修改时间</span>
      </div>

      {loading ? (
        <div className="loading">解析压缩包…</div>
      ) : error ? (
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <div style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sorted.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <div>无匹配项</div>
            </div>
          ) : sorted.map((e, i) => (
            <div key={i} className="archive-item">
              <span style={{ fontSize: 13, textAlign: 'center' }}>{e.is_dir ? '📁' : getFileIcon({ name: e.name, is_dir: false, extension: e.name.split('.').pop() ?? '' })}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: e.is_dir ? '#6ab7ff' : 'var(--text-primary)', fontSize: 12 }}>{e.path || e.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{e.is_dir ? '-' : formatSize(e.size)}</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{e.is_dir ? '-' : formatSize(e.compressed_size)}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.modified ? formatDate(e.modified) : '-'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
