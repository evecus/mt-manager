import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { api } from './utils/api';
import { FilePane } from './components/FilePane';
import { EditorPanel } from './components/EditorPanel';
import { HexViewer } from './components/HexViewer';
import { ArchiveViewer } from './components/ArchiveViewer';
import { SearchPanel } from './components/SearchPanel';
import { ImageViewer } from './components/ImageViewer';
import { PropertiesPanel } from './components/PropertiesPanel';
import { BatchRenameModal } from './components/BatchRenameModal';
import { NewItemModal } from './components/NewItemModal';
import { ContextMenu } from './components/ContextMenu';
import { ToastContainer } from './components/ToastContainer';
import { useToast } from './hooks/useToast';
import type { PaneState, ClipboardState, TabState, FileEntry, Drive } from './types';
import { isTextFile, isImageFile, isArchiveFile, joinPath, basename, formatSize } from './utils/fileUtils';

const DEFAULT_PANE = (path: string): PaneState => ({
  path,
  history: [path],
  historyIndex: 0,
  entries: [],
  selected: new Set(),
  viewMode: 'list',
  sortBy: 'name',
  sortOrder: 'asc',
  showHidden: false,
  loading: false,
});

export default function App() {
  const [homeDir, setHomeDir] = useState('');
  const [drives, setDrives] = useState<Drive[]>([]);
  const [leftPane, setLeftPane] = useState<PaneState | null>(null);
  const [rightPane, setRightPane] = useState<PaneState | null>(null);
  const [focusedPane, setFocusedPane] = useState<'left' | 'right'>('left');
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
  const [tabs, setTabs] = useState<TabState[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; pane: 'left' | 'right' } | null>(null);
  const [showBatchRename, setShowBatchRename] = useState(false);
  const [showNewItem, setShowNewItem] = useState<{ pane: 'left' | 'right' } | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const { toasts, show: showToast } = useToast();

  // Init
  useEffect(() => {
    api.getHomeDir().then(home => {
      setHomeDir(home);
      setLeftPane(DEFAULT_PANE(home));
      setRightPane(DEFAULT_PANE(home));
      loadDir(home, 'left', true);
      loadDir(home, 'right', true);
    });
    api.getDrives().then(setDrives);
  }, []);

  const loadDir = useCallback(async (path: string, side: 'left' | 'right', init = false) => {
    const setter = side === 'left' ? setLeftPane : setRightPane;
    setter(prev => {
      if (!prev) return prev;
      const p: PaneState = init
        ? { ...DEFAULT_PANE(path), loading: true }
        : { ...prev, path, loading: true, selected: new Set(), error: undefined };
      if (!init && prev.path !== path) {
        const newHistory = prev.history.slice(0, prev.historyIndex + 1);
        newHistory.push(path);
        p.history = newHistory;
        p.historyIndex = newHistory.length - 1;
      }
      return p;
    });
    try {
      const res = await api.listDirectory(path, false);
      setter(prev => prev ? { ...prev, entries: res.entries, loading: false, error: res.error } : prev);
    } catch (e: any) {
      setter(prev => prev ? { ...prev, loading: false, error: e.toString() } : prev);
    }
  }, []);

  const navigate = useCallback((path: string, side?: 'left' | 'right') => {
    const s = side || focusedPane;
    loadDir(path, s);
  }, [focusedPane, loadDir]);

  const goBack = useCallback((side: 'left' | 'right') => {
    const p = side === 'left' ? leftPane : rightPane;
    if (!p || p.historyIndex <= 0) return;
    const newIdx = p.historyIndex - 1;
    const path = p.history[newIdx];
    const setter = side === 'left' ? setLeftPane : setRightPane;
    setter(prev => prev ? { ...prev, historyIndex: newIdx, path, selected: new Set() } : prev);
    api.listDirectory(path, p.showHidden).then(res => {
      setter(prev => prev ? { ...prev, entries: res.entries, loading: false } : prev);
    });
  }, [leftPane, rightPane]);

  const goForward = useCallback((side: 'left' | 'right') => {
    const p = side === 'left' ? leftPane : rightPane;
    if (!p || p.historyIndex >= p.history.length - 1) return;
    const newIdx = p.historyIndex + 1;
    const path = p.history[newIdx];
    const setter = side === 'left' ? setLeftPane : setRightPane;
    setter(prev => prev ? { ...prev, historyIndex: newIdx, path, selected: new Set() } : prev);
    api.listDirectory(path, p.showHidden).then(res => {
      setter(prev => prev ? { ...prev, entries: res.entries, loading: false } : prev);
    });
  }, [leftPane, rightPane]);

  const refreshPane = useCallback((side?: 'left' | 'right') => {
    const s = side || focusedPane;
    const p = s === 'left' ? leftPane : rightPane;
    if (p) loadDir(p.path, s, false);
  }, [focusedPane, leftPane, rightPane, loadDir]);

  const openFile = useCallback(async (entry: FileEntry, pane: 'left' | 'right') => {
    if (entry.is_dir) {
      navigate(entry.path, pane);
      return;
    }
    const ext = entry.extension.toLowerCase();
    let tabType: TabState['type'] = 'editor';
    if (isImageFile(ext)) tabType = 'image';
    else if (isArchiveFile(ext)) tabType = 'archive';
    else if (!isTextFile(ext)) tabType = 'hex';

    const existingTab = tabs.find(t => t.filePath === entry.path);
    if (existingTab) {
      setActiveTab(existingTab.id);
      return;
    }
    const id = Math.random().toString(36).slice(2);
    const newTab: TabState = {
      id,
      label: entry.name,
      type: tabType,
      filePath: entry.path,
      paneId: pane,
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTab(id);
  }, [tabs, navigate]);

  const closeTab = useCallback((id: string) => {
    setTabs(prev => {
      const idx = prev.findIndex(t => t.id === id);
      const next = prev.filter(t => t.id !== id);
      if (activeTab === id) {
        const newActive = next[Math.min(idx, next.length - 1)]?.id ?? null;
        setActiveTab(newActive);
      }
      return next;
    });
  }, [activeTab]);

  const openSearch = useCallback(() => {
    const existing = tabs.find(t => t.type === 'search');
    if (existing) { setActiveTab(existing.id); return; }
    const id = 'search-' + Date.now();
    const p = focusedPane === 'left' ? leftPane : rightPane;
    setTabs(prev => [...prev, { id, label: '搜索', type: 'search', searchQuery: p?.path }]);
    setActiveTab(id);
    setShowSearch(false);
  }, [tabs, focusedPane, leftPane, rightPane]);

  // Clipboard ops
  const copy = useCallback((files: string[]) => {
    setClipboard({ files, operation: 'copy' });
    showToast(`已复制 ${files.length} 个项目`, 'info');
  }, [showToast]);

  const cut = useCallback((files: string[]) => {
    setClipboard({ files, operation: 'cut' });
    showToast(`已剪切 ${files.length} 个项目`, 'info');
  }, [showToast]);

  const paste = useCallback(async (destDir: string) => {
    if (!clipboard) return;
    try {
      for (const src of clipboard.files) {
        const name = basename(src);
        const dst = joinPath(destDir, name);
        if (clipboard.operation === 'copy') {
          await api.copyFile(src, dst);
        } else {
          await api.moveFile(src, dst);
        }
      }
      if (clipboard.operation === 'cut') setClipboard(null);
      refreshPane('left');
      refreshPane('right');
      showToast(`粘贴完成`, 'success');
    } catch (e: any) {
      showToast('粘贴失败: ' + e, 'error');
    }
  }, [clipboard, refreshPane, showToast]);

  const deleteFiles = useCallback(async (files: string[]) => {
    if (!window.confirm(`确定删除 ${files.length} 个项目？`)) return;
    try {
      for (const f of files) await api.deleteFile(f);
      refreshPane('left');
      refreshPane('right');
      showToast(`已删除 ${files.length} 个项目`, 'success');
    } catch (e: any) {
      showToast('删除失败: ' + e, 'error');
    }
  }, [refreshPane, showToast]);

  const getSelectedFiles = useCallback((side?: 'left' | 'right') => {
    const s = side || focusedPane;
    const p = s === 'left' ? leftPane : rightPane;
    if (!p) return [];
    return p.selected.size > 0
      ? [...p.selected]
      : [];
  }, [focusedPane, leftPane, rightPane]);

  // Toolbar actions
  const toolbarCopy = () => {
    const files = getSelectedFiles();
    if (files.length) copy(files);
  };
  const toolbarCut = () => {
    const files = getSelectedFiles();
    if (files.length) cut(files);
  };
  const toolbarPaste = () => {
    const p = focusedPane === 'left' ? leftPane : rightPane;
    if (p) paste(p.path);
  };
  const toolbarDelete = () => {
    const files = getSelectedFiles();
    if (files.length) deleteFiles(files);
  };
  const toolbarProperties = () => {
    const files = getSelectedFiles();
    const path = files[0];
    if (!path) return;
    const name = basename(path);
    const id = 'props-' + path;
    const existing = tabs.find(t => t.id === id);
    if (existing) { setActiveTab(existing.id); return; }
    setTabs(prev => [...prev, { id, label: name + ' 属性', type: 'properties', filePath: path }]);
    setActiveTab(id);
  };

  const currentPane = focusedPane === 'left' ? leftPane : rightPane;
  const selectedCount = currentPane?.selected.size ?? 0;
  const selectedFiles = getSelectedFiles();

  // Active tab content
  const activeTabData = tabs.find(t => t.id === activeTab);

  return (
    <div className="app-root" onClick={() => setContextMenu(null)}>
      {/* Title bar */}
      <div className="title-bar">
        <div className="title-bar-logo">MT</div>
        <span className="title-bar-title">MT管理器</span>
        <div className="title-bar-spacer" />
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <button className="tb-btn" onClick={() => setShowNewItem({ pane: focusedPane })}>
          <span>📁</span> 新建
        </button>
        <div className="tb-sep" />
        <button className="tb-btn" onClick={toolbarCopy} disabled={!selectedCount}>
          <span>📋</span> 复制
        </button>
        <button className="tb-btn" onClick={toolbarCut} disabled={!selectedCount}>
          <span>✂️</span> 剪切
        </button>
        <button className="tb-btn" onClick={toolbarPaste} disabled={!clipboard}>
          <span>📌</span> 粘贴
        </button>
        <div className="tb-sep" />
        <button className="tb-btn danger" onClick={toolbarDelete} disabled={!selectedCount}>
          <span>🗑️</span> 删除
        </button>
        <button className="tb-btn" onClick={() => {
          const files = getSelectedFiles();
          if (files.length >= 2) setShowBatchRename(true);
          else if (files.length === 1) {
            // trigger inline rename via event
            window.dispatchEvent(new CustomEvent('start-rename', { detail: files[0] }));
          }
        }} disabled={!selectedCount}>
          <span>✏️</span> 重命名
        </button>
        <div className="tb-sep" />
        <button className="tb-btn" onClick={() => {
          const p = focusedPane === 'left' ? leftPane : rightPane;
          const files = getSelectedFiles();
          if (!p) return;
          const dest = joinPath(p.path, 'archive.zip');
          api.compressToZip(files.length ? files : [p.path], dest)
            .then(() => { refreshPane(); showToast('压缩完成', 'success'); })
            .catch(e => showToast('压缩失败: ' + e, 'error'));
        }}>
          <span>🗜️</span> 压缩
        </button>
        <div className="tb-sep" />
        <button className="tb-btn" onClick={openSearch}>
          <span>🔍</span> 搜索
        </button>
        <button className="tb-btn" onClick={toolbarProperties} disabled={!selectedCount}>
          <span>ℹ️</span> 属性
        </button>
        <div className="tb-sep" />
        <button className="tb-btn" onClick={() => refreshPane()}>
          <span>🔄</span> 刷新
        </button>
      </div>

      <div className="main-content">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-label">快速访问</div>
          <div className="sidebar-item" onClick={() => navigate(homeDir)}>
            <span className="sidebar-item-icon">🏠</span>
            <span className="sidebar-item-label">主目录</span>
          </div>
          <div className="sidebar-item" onClick={() => navigate(homeDir + '/Desktop' || homeDir + '\\Desktop')}>
            <span className="sidebar-item-icon">🖥️</span>
            <span className="sidebar-item-label">桌面</span>
          </div>
          <div className="sidebar-item" onClick={() => navigate(homeDir + '/Downloads' || homeDir + '\\Downloads')}>
            <span className="sidebar-item-icon">⬇️</span>
            <span className="sidebar-item-label">下载</span>
          </div>
          <div className="sidebar-item" onClick={() => navigate(homeDir + '/Documents' || homeDir + '\\Documents')}>
            <span className="sidebar-item-icon">📄</span>
            <span className="sidebar-item-label">文档</span>
          </div>
          <div className="sidebar-item" onClick={() => navigate(homeDir + '/Pictures' || homeDir + '\\Pictures')}>
            <span className="sidebar-item-icon">🖼️</span>
            <span className="sidebar-item-label">图片</span>
          </div>

          {drives.length > 0 && (
            <>
              <div className="sidebar-label">磁盘</div>
              {drives.map(d => (
                <div key={d.path} className="sidebar-item" onClick={() => navigate(d.path)}>
                  <span className="sidebar-item-icon">💾</span>
                  <span className="sidebar-item-label">{d.name}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Panes */}
        <div className="panes-container">
          {leftPane && (
            <FilePane
              pane={leftPane}
              side="left"
              focused={focusedPane === 'left'}
              clipboard={clipboard}
              onFocus={() => setFocusedPane('left')}
              onNavigate={(path) => navigate(path, 'left')}
              onBack={() => goBack('left')}
              onForward={() => goForward('left')}
              onRefresh={() => refreshPane('left')}
              onOpen={(entry) => openFile(entry, 'left')}
              onSelect={(selected) => setLeftPane(prev => prev ? { ...prev, selected } : prev)}
              onViewMode={(mode) => setLeftPane(prev => prev ? { ...prev, viewMode: mode } : prev)}
              onSort={(by, order) => setLeftPane(prev => prev ? { ...prev, sortBy: by, sortOrder: order } : prev)}
              onContextMenu={(x, y) => { setFocusedPane('left'); setContextMenu({ x, y, pane: 'left' }); }}
              onCopy={copy}
              onCut={cut}
              onPaste={() => paste(leftPane.path)}
              onDelete={deleteFiles}
              onRename={(src, name) => api.renameFile(src, name).then(() => refreshPane('left')).catch(e => showToast('重命名失败: ' + e, 'error'))}
              showToast={showToast}
            />
          )}
          <div className="pane-divider" />
          {rightPane && (
            <FilePane
              pane={rightPane}
              side="right"
              focused={focusedPane === 'right'}
              clipboard={clipboard}
              onFocus={() => setFocusedPane('right')}
              onNavigate={(path) => navigate(path, 'right')}
              onBack={() => goBack('right')}
              onForward={() => goForward('right')}
              onRefresh={() => refreshPane('right')}
              onOpen={(entry) => openFile(entry, 'right')}
              onSelect={(selected) => setRightPane(prev => prev ? { ...prev, selected } : prev)}
              onViewMode={(mode) => setRightPane(prev => prev ? { ...prev, viewMode: mode } : prev)}
              onSort={(by, order) => setRightPane(prev => prev ? { ...prev, sortBy: by, sortOrder: order } : prev)}
              onContextMenu={(x, y) => { setFocusedPane('right'); setContextMenu({ x, y, pane: 'right' }); }}
              onCopy={copy}
              onCut={cut}
              onPaste={() => paste(rightPane.path)}
              onDelete={deleteFiles}
              onRename={(src, name) => api.renameFile(src, name).then(() => refreshPane('right')).catch(e => showToast('重命名失败: ' + e, 'error'))}
              showToast={showToast}
            />
          )}
        </div>
      </div>

      {/* Editor/Viewer area (tabs) */}
      {tabs.length > 0 && (
        <div style={{ height: '45%', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div className="tab-bar">
            {tabs.map(tab => (
              <div
                key={tab.id}
                className={`tab${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-label">{tab.label}</span>
                <span className="tab-close" onClick={e => { e.stopPropagation(); closeTab(tab.id); }}>×</span>
              </div>
            ))}
          </div>
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {activeTabData && activeTabData.type === 'editor' && activeTabData.filePath && (
              <EditorPanel
                filePath={activeTabData.filePath}
                onSave={() => showToast('保存成功', 'success')}
                showToast={showToast}
              />
            )}
            {activeTabData && activeTabData.type === 'hex' && activeTabData.filePath && (
              <HexViewer filePath={activeTabData.filePath} />
            )}
            {activeTabData && activeTabData.type === 'image' && activeTabData.filePath && (
              <ImageViewer filePath={activeTabData.filePath} />
            )}
            {activeTabData && activeTabData.type === 'archive' && activeTabData.filePath && (
              <ArchiveViewer
                filePath={activeTabData.filePath}
                onExtract={(dest) => {
                  const p = activeTabData.filePath!;
                  api.extractArchive(p, dest)
                    .then(() => { showToast('解压完成', 'success'); refreshPane(); })
                    .catch(e => showToast('解压失败: ' + e, 'error'));
                }}
              />
            )}
            {activeTabData && activeTabData.type === 'search' && (
              <SearchPanel
                initialPath={activeTabData.searchQuery || homeDir}
                onOpen={(entry) => openFile(entry, focusedPane)}
                onNavigate={(path) => navigate(path, focusedPane)}
              />
            )}
            {activeTabData && activeTabData.type === 'properties' && activeTabData.filePath && (
              <PropertiesPanel filePath={activeTabData.filePath} />
            )}
          </div>
        </div>
      )}

      {/* Status bar */}
      <div className="status-bar">
        <span>📁 {currentPane?.entries.length ?? 0} 项</span>
        {selectedCount > 0 && <span style={{ color: 'var(--accent)' }}>已选 {selectedCount} 项</span>}
        <span style={{ flex: 1 }} />
        {clipboard && (
          <span style={{ color: 'var(--warning)' }}>
            剪贴板: {clipboard.operation === 'copy' ? '复制' : '剪切'} {clipboard.files.length} 项
          </span>
        )}
        <span style={{ color: 'var(--text-muted)' }}>{currentPane?.path}</span>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          pane={contextMenu.pane}
          selectedFiles={getSelectedFiles(contextMenu.pane)}
          paneState={contextMenu.pane === 'left' ? leftPane! : rightPane!}
          clipboard={clipboard}
          onClose={() => setContextMenu(null)}
          onOpen={(entry) => openFile(entry, contextMenu.pane)}
          onCopy={copy}
          onCut={cut}
          onPaste={() => {
            const p = contextMenu.pane === 'left' ? leftPane : rightPane;
            if (p) paste(p.path);
          }}
          onDelete={deleteFiles}
          onRename={(src, name) => {
            const side = contextMenu.pane;
            api.renameFile(src, name)
              .then(() => refreshPane(side))
              .catch(e => showToast('失败: ' + e, 'error'));
          }}
          onNewFile={() => setShowNewItem({ pane: contextMenu.pane })}
          onProperties={(path) => {
            const name = basename(path);
            const id = 'props-' + path;
            setTabs(prev => prev.find(t => t.id === id) ? prev : [...prev, { id, label: name + ' 属性', type: 'properties', filePath: path }]);
            setActiveTab(id);
          }}
          onBatchRename={() => setShowBatchRename(true)}
          showToast={showToast}
          onRefresh={() => refreshPane(contextMenu.pane)}
        />
      )}

      {/* Batch rename modal */}
      {showBatchRename && (
        <BatchRenameModal
          files={getSelectedFiles()}
          onClose={() => setShowBatchRename(false)}
          onRename={async (params) => {
            try {
              await api.batchRename(
                params.files,
                params.pattern,
                params.replacement,
                params.useRegex,
                params.addPrefix,
                params.addSuffix,
                params.startNumber,
                params.numberPadding,
              );
              refreshPane('left');
              refreshPane('right');
              showToast('批量重命名完成', 'success');
              setShowBatchRename(false);
            } catch (e: any) {
              showToast('失败: ' + e, 'error');
            }
          }}
        />
      )}

      {/* New item modal */}
      {showNewItem && (
        <NewItemModal
          onClose={() => setShowNewItem(null)}
          onCreate={async (name, isDir) => {
            const p = showNewItem.pane === 'left' ? leftPane : rightPane;
            if (!p) return;
            const full = joinPath(p.path, name);
            try {
              if (isDir) await api.createDir(full);
              else await api.createFile(full);
              refreshPane(showNewItem.pane);
              showToast('创建成功', 'success');
              setShowNewItem(null);
            } catch (e: any) {
              showToast('创建失败: ' + e, 'error');
            }
          }}
        />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}
