import { useState, useRef } from 'react';
import { api } from '../utils/api';
import { formatSize, formatDate, getFileIcon, basename } from '../utils/fileUtils';
import type { FileEntry } from '../types';

interface SearchPanelProps {
  initialPath: string;
  onOpen: (entry: FileEntry) => void;
  onNavigate: (path: string) => void;
}

export function SearchPanel({ initialPath, onOpen, onNavigate }: SearchPanelProps) {
  const [searchPath, setSearchPath] = useState(initialPath);
  const [pattern, setPattern] = useState('');
  const [searchContent, setSearchContent] = useState(false);
  const [contentPattern, setContentPattern] = useState('');
  const [results, setResults] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const abortRef = useRef(false);

  const doSearch = async () => {
    if (!pattern.trim() && !contentPattern.trim()) return;
    setLoading(true);
    setResults([]);
    setSearched(false);
    abortRef.current = false;
    const start = Date.now();
    try {
      const res = await api.searchFiles(
        searchPath,
        pattern.trim(),
        searchContent,
        contentPattern.trim(),
        500,
      );
      setResults(res.entries);
      setElapsed(Date.now() - start);
      setSearched(true);
    } catch (e) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const getParent = (path: string) => path.replace(/[/\\][^/\\]+$/, '') || path;

  return (
    <div className="search-panel">
      {/* Search form */}
      <div className="search-form">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>搜索目录</span>
          <input
            className="input"
            style={{ flex: 1, height: 27, fontSize: 11.5, fontFamily: 'var(--font-mono)' }}
            value={searchPath}
            onChange={e => setSearchPath(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="input"
            style={{ flex: 1, height: 28 }}
            placeholder="🔍 文件名（支持正则）"
            value={pattern}
            onChange={e => setPattern(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            autoFocus
          />
          <button
            className="btn btn-primary"
            style={{ height: 28, padding: '0 18px', fontSize: 12.5, flexShrink: 0 }}
            onClick={doSearch}
            disabled={loading}
          >
            {loading ? '搜索中…' : '搜索'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label className="checkbox-row">
            <input type="checkbox" checked={searchContent} onChange={e => setSearchContent(e.target.checked)} />
            搜索文件内容
          </label>
          {searchContent && (
            <input
              className="input"
              style={{ flex: 1, height: 26, fontSize: 12 }}
              placeholder="内容关键词（正则）"
              value={contentPattern}
              onChange={e => setContentPattern(e.target.value)}
            />
          )}
        </div>
      </div>

      {/* Results */}
      {loading && <div className="loading">🔍 搜索中…</div>}
      {!loading && searched && (
        <div style={{ padding: '6px 10px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)', fontSize: 11.5, color: 'var(--text-muted)', flexShrink: 0 }}>
          找到 <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{results.length}</span> 项 · 耗时 {elapsed}ms
        </div>
      )}
      {!loading && searched && results.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <div>未找到匹配项</div>
        </div>
      )}

      <div className="search-results">
        {results.map((entry, i) => (
          <div
            key={i}
            className="file-item"
            style={{ gridTemplateColumns: '22px 1fr 80px 130px 80px' }}
            onDoubleClick={() => onOpen(entry)}
          >
            <span className="fi-icon">{getFileIcon(entry)}</span>
            <span className="fi-name" style={{ fontSize: 12 }} title={entry.path}>
              <span style={{ color: 'var(--text-primary)' }}>{entry.name}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 6 }}>
                {getParent(entry.path)}
              </span>
            </span>
            <span className="fi-size">{entry.is_dir ? '-' : formatSize(entry.size)}</span>
            <span className="fi-date">{formatDate(entry.modified)}</span>
            <span
              style={{ fontSize: 11, color: 'var(--accent)', cursor: 'pointer', padding: '0 4px' }}
              onClick={() => onNavigate(getParent(entry.path))}
              title="在文件管理器中打开所在目录"
            >
              打开位置
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
