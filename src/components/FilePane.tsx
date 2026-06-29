import { useEffect, useRef, useState, useCallback } from 'react';
import type { PaneState, FileEntry, ClipboardState, SortBy, SortOrder, ViewMode } from '../types';
import { formatSize, formatDate, getFileIcon, pathBreadcrumbs, basename } from '../utils/fileUtils';

interface FilePaneProps {
  pane: PaneState;
  side: 'left' | 'right';
  focused: boolean;
  clipboard: ClipboardState | null;
  onFocus: () => void;
  onNavigate: (path: string) => void;
  onBack: () => void;
  onForward: () => void;
  onRefresh: () => void;
  onOpen: (entry: FileEntry) => void;
  onSelect: (selected: Set<string>) => void;
  onViewMode: (mode: ViewMode) => void;
  onSort: (by: SortBy, order: SortOrder) => void;
  onContextMenu: (x: number, y: number) => void;
  onCopy: (files: string[]) => void;
  onCut: (files: string[]) => void;
  onPaste: () => void;
  onDelete: (files: string[]) => void;
  onRename: (src: string, newName: string) => void;
  showToast: (msg: string, type?: any) => void;
}

export function FilePane({
  pane, side: _side, focused, clipboard,
  onFocus, onNavigate, onBack, onForward, onRefresh,
  onOpen, onSelect, onViewMode, onSort, onContextMenu,
  onCopy, onCut, onPaste, onDelete, onRename, showToast,
}: FilePaneProps) {
  const [addressEdit, setAddressEdit] = useState(false);
  const [addressVal, setAddressVal] = useState('');
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [lastSelected, setLastSelected] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (pane.selected.has(e.detail)) startRename(e.detail);
    };
    window.addEventListener('start-rename', handler as EventListener);
    return () => window.removeEventListener('start-rename', handler as EventListener);
  }, [pane.selected]);

  useEffect(() => {
    if (renamingPath && renameRef.current) {
      renameRef.current.focus();
      const dot = renameVal.lastIndexOf('.');
      renameRef.current.setSelectionRange(0, dot > 0 ? dot : renameVal.length);
    }
  }, [renamingPath]);

  const startRename = (path: string) => {
    setRenamingPath(path);
    setRenameVal(basename(path));
  };

  const commitRename = () => {
    if (renamingPath && renameVal.trim()) {
      onRename(renamingPath, renameVal.trim());
    }
    setRenamingPath(null);
  };

  const sortedEntries = [...pane.entries].sort((a, b) => {
    if (a.is_dir !== b.is_dir) return b.is_dir ? 1 : -1;
    let cmp = 0;
    switch (pane.sortBy) {
      case 'name': cmp = a.name.toLowerCase().localeCompare(b.name.toLowerCase()); break;
      case 'size': cmp = a.size - b.size; break;
      case 'modified': cmp = a.modified - b.modified; break;
      case 'type': cmp = a.extension.localeCompare(b.extension); break;
    }
    return pane.sortOrder === 'asc' ? cmp : -cmp;
  });

  const handleClick = useCallback((e: React.MouseEvent, entry: FileEntry) => {
    e.stopPropagation();
    onFocus();
    const path = entry.path;

    if (e.ctrlKey || e.metaKey) {
      const next = new Set(pane.selected);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      onSelect(next);
      setLastSelected(path);
    } else if (e.shiftKey && lastSelected) {
      const paths = sortedEntries.map(e => e.path);
      const a = paths.indexOf(lastSelected);
      const b = paths.indexOf(path);
      const [lo, hi] = a < b ? [a, b] : [b, a];
      onSelect(new Set(paths.slice(lo, hi + 1)));
    } else {
      onSelect(new Set([path]));
      setLastSelected(path);
    }
  }, [pane.selected, sortedEntries, lastSelected, onFocus, onSelect]);

  const handleDoubleClick = (e: React.MouseEvent, entry: FileEntry) => {
    e.stopPropagation();
    if (renamingPath) return;
    onOpen(entry);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (renamingPath) return;
    const sel = [...pane.selected];
    const paths = sortedEntries.map(e => e.path);

    if (e.key === 'Enter' && sel.length === 1) {
      const entry = sortedEntries.find(e => e.path === sel[0]);
      if (entry) onOpen(entry);
    } else if (e.key === 'F2' && sel.length === 1) {
      startRename(sel[0]);
    } else if (e.key === 'Delete') {
      if (sel.length) onDelete(sel);
    } else if (e.key === 'Backspace') {
      onBack();
    } else if (e.key === 'F5') {
      onRefresh();
    } else if (e.ctrlKey && e.key === 'c') {
      if (sel.length) onCopy(sel);
    } else if (e.ctrlKey && e.key === 'x') {
      if (sel.length) onCut(sel);
    } else if (e.ctrlKey && e.key === 'v') {
      onPaste();
    } else if (e.ctrlKey && e.key === 'a') {
      onSelect(new Set(paths));
      e.preventDefault();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const cur = sel.length > 0 ? paths.indexOf(sel[sel.length - 1]) : -1;
      const next = e.key === 'ArrowDown'
        ? Math.min(cur + 1, paths.length - 1)
        : Math.max(cur - 1, 0);
      if (e.shiftKey && cur >= 0) {
        const [lo, hi] = cur < next ? [cur, next] : [next, cur];
        onSelect(new Set(paths.slice(lo, hi + 1)));
      } else {
        onSelect(new Set([paths[next]]));
        setLastSelected(paths[next]);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFocus();
    onContextMenu(e.clientX, e.clientY);
  };

  const handleItemContextMenu = (e: React.MouseEvent, entry: FileEntry) => {
    e.preventDefault();
    e.stopPropagation();
    onFocus();
    if (!pane.selected.has(entry.path)) {
      onSelect(new Set([entry.path]));
    }
    onContextMenu(e.clientX, e.clientY);
  };

  const handleSort = (col: SortBy) => {
    if (pane.sortBy === col) {
      onSort(col, pane.sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(col, 'asc');
    }
  };

  const sortIcon = (col: SortBy) => {
    if (pane.sortBy !== col) return '';
    return pane.sortOrder === 'asc' ? ' ▲' : ' ▼';
  };

  const crumbs = pathBreadcrumbs(pane.path);

  return (
    <div
      className={`pane${focused ? ' focused' : ''}${dragOver ? ' drag-over' : ''}`}
      tabIndex={0}
      onFocus={onFocus}
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer.files).map(f => (f as any).path || f.name);
        if (files.length) showToast('拖拽导入暂不支持，请使用复制粘贴', 'info');
      }}
    >
      {/* Pane header */}
      <div className="pane-header">
        <button className="pane-nav-btn" onClick={onBack} disabled={pane.historyIndex <= 0} title="后退">‹</button>
        <button className="pane-nav-btn" onClick={onForward} disabled={pane.historyIndex >= pane.history.length - 1} title="前进">›</button>
        <button className="pane-nav-btn" onClick={() => {
          const parent = pane.path.replace(/[/\\][^/\\]+[/\\]?$/, '') || pane.path;
          if (parent !== pane.path) onNavigate(parent);
        }} title="上级目录">↑</button>

        {addressEdit ? (
          <input
            className="address-input"
            value={addressVal}
            autoFocus
            onChange={e => setAddressVal(e.target.value)}
            onBlur={() => setAddressEdit(false)}
            onKeyDown={e => {
              if (e.key === 'Enter') { onNavigate(addressVal); setAddressEdit(false); }
              if (e.key === 'Escape') setAddressEdit(false);
            }}
          />
        ) : (
          <div
            className="breadcrumbs"
            onClick={() => { setAddressVal(pane.path); setAddressEdit(true); }}
            title={pane.path}
          >
            {crumbs.map((c, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: i === crumbs.length - 1 ? 1 : 0, overflow: i === crumbs.length - 1 ? 'hidden' : 'visible' }}>
                {i > 0 && <span className="bc-sep">›</span>}
                <span
                  className={`bc-item${i === crumbs.length - 1 ? ' last' : ''}`}
                  onClick={e => { e.stopPropagation(); onNavigate(c.path); }}
                  style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
                >{c.name}</span>
              </span>
            ))}
          </div>
        )}

        <button className="pane-nav-btn" onClick={onRefresh} title="刷新">⟳</button>
        <button
          className="pane-nav-btn"
          title={pane.viewMode === 'list' ? '切换网格视图' : '切换列表视图'}
          onClick={() => onViewMode(pane.viewMode === 'list' ? 'grid' : 'list')}
        >{pane.viewMode === 'list' ? '⊞' : '☰'}</button>
      </div>

      {/* File list header (list mode only) */}
      {pane.viewMode === 'list' && (
        <div className="file-list-header">
          <span />
          <span className="file-list-header-cell" onClick={() => handleSort('name')}>名称{sortIcon('name')}</span>
          <span className="file-list-header-cell" onClick={() => handleSort('size')}>大小{sortIcon('size')}</span>
          <span className="file-list-header-cell" onClick={() => handleSort('modified')}>修改时间{sortIcon('modified')}</span>
          <span className="file-list-header-cell" onClick={() => handleSort('type')}>类型{sortIcon('type')}</span>
        </div>
      )}

      {/* Content */}
      {pane.loading ? (
        <div className="loading">⟳ 加载中…</div>
      ) : pane.error ? (
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <div style={{ color: 'var(--danger)', fontSize: 12 }}>{pane.error}</div>
        </div>
      ) : pane.viewMode === 'list' ? (
        <div
          className="file-list"
          ref={listRef}
          onClick={e => { if (e.target === listRef.current) onSelect(new Set()); }}
        >
          {sortedEntries.length === 0 ? (
            <div className="empty-state" style={{ flex: 'none', paddingTop: 48 }}>
              <div className="empty-icon">📂</div>
              <div>空目录</div>
            </div>
          ) : sortedEntries.map(entry => (
            <div
              key={entry.path}
              className={`file-item${pane.selected.has(entry.path) ? ' selected' : ''}${clipboard?.operation === 'cut' && clipboard.files.includes(entry.path) ? ' cut' : ''}`}
              onClick={e => handleClick(e, entry)}
              onDoubleClick={e => handleDoubleClick(e, entry)}
              onContextMenu={e => handleItemContextMenu(e, entry)}
            >
              <span className="fi-icon">{getFileIcon(entry)}</span>
              <span className={`fi-name${entry.is_dir ? ' is-dir' : ''}`}>
                {renamingPath === entry.path ? (
                  <input
                    ref={renameRef}
                    className="inline-rename"
                    value={renameVal}
                    onClick={e => e.stopPropagation()}
                    onChange={e => setRenameVal(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') setRenamingPath(null);
                      e.stopPropagation();
                    }}
                  />
                ) : entry.name}
              </span>
              <span className="fi-size">{entry.is_dir ? '' : formatSize(entry.size)}</span>
              <span className="fi-date">{formatDate(entry.modified)}</span>
              <span className="fi-ext">{entry.extension}</span>
            </div>
          ))}
        </div>
      ) : (
        /* Grid view */
        <div
          className="file-grid"
          onClick={() => onSelect(new Set())}
        >
          {sortedEntries.map(entry => (
            <div
              key={entry.path}
              className={`fg-item${pane.selected.has(entry.path) ? ' selected' : ''}`}
              onClick={e => handleClick(e, entry)}
              onDoubleClick={e => handleDoubleClick(e, entry)}
              onContextMenu={e => handleItemContextMenu(e, entry)}
            >
              <span className="fg-icon">{getFileIcon(entry)}</span>
              <span className="fg-name" style={entry.is_dir ? { color: '#6ab7ff' } : {}}>
                {entry.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Selection bar */}
      {pane.selected.size > 0 && (
        <div className="selection-bar">
          <span>已选 {pane.selected.size} 项</span>
          {pane.selected.size > 0 && (() => {
            const sizes = [...pane.selected]
              .map(p => pane.entries.find(e => e.path === p)?.size ?? 0)
              .reduce((a, b) => a + b, 0);
            return sizes > 0 ? <span>{formatSize(sizes)}</span> : null;
          })()}
          <span style={{ marginLeft: 'auto', cursor: 'pointer', opacity: 0.7, fontSize: 11 }} onClick={() => onSelect(new Set())}>清除</span>
        </div>
      )}
    </div>
  );
}
