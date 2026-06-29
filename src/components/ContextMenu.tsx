import { useEffect, useRef } from 'react';
import type { PaneState, ClipboardState, FileEntry } from '../types';
import { isTextFile, isImageFile, isArchiveFile, basename } from '../utils/fileUtils';
import { api } from '../utils/api';

interface ContextMenuProps {
  x: number;
  y: number;
  pane: 'left' | 'right';
  selectedFiles: string[];
  paneState: PaneState;
  clipboard: ClipboardState | null;
  onClose: () => void;
  onOpen: (entry: FileEntry) => void;
  onCopy: (files: string[]) => void;
  onCut: (files: string[]) => void;
  onPaste: () => void;
  onDelete: (files: string[]) => void;
  onRename: (src: string, newName: string) => void;
  onNewFile: () => void;
  onProperties: (path: string) => void;
  onBatchRename: () => void;
  onRefresh: () => void;
  showToast: (msg: string, type?: any) => void;
}

export function ContextMenu({
  x, y, selectedFiles, paneState, clipboard,
  onClose, onOpen, onCopy, onCut, onPaste, onDelete, onRename,
  onNewFile, onProperties, onBatchRename, onRefresh, showToast,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Adjust position to stay in viewport
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 320);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 10);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const single = selectedFiles.length === 1 ? selectedFiles[0] : null;
  const entry = single ? paneState.entries.find(e => e.path === single) : null;
  const hasSelected = selectedFiles.length > 0;

  const item = (icon: string, label: string, action: () => void, shortcut?: string, danger = false) => (
    <div className={`ctx-item${danger ? ' danger' : ''}`} onClick={() => { action(); onClose(); }}>
      <span className="ctx-item-icon">{icon}</span>
      <span>{label}</span>
      {shortcut && <span className="ctx-shortcut">{shortcut}</span>}
    </div>
  );

  return (
    <div
      ref={ref}
      className="context-menu"
      style={{ left: adjustedX, top: adjustedY }}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Open actions */}
      {entry && !entry.is_dir && isTextFile(entry.extension) &&
        item('📝', '编辑', () => onOpen(entry))}
      {entry && !entry.is_dir && isImageFile(entry.extension) &&
        item('🖼️', '查看图片', () => onOpen(entry))}
      {entry && !entry.is_dir && isArchiveFile(entry.extension) &&
        item('🗜️', '查看压缩包', () => onOpen(entry))}
      {entry && !entry.is_dir && !isTextFile(entry.extension) && !isImageFile(entry.extension) && !isArchiveFile(entry.extension) &&
        item('⬡', 'HEX查看', () => onOpen(entry))}
      {entry && entry.is_dir &&
        item('📂', '打开', () => onOpen(entry))}

      {hasSelected && <div className="ctx-sep" />}

      {/* File operations */}
      {hasSelected && item('📋', `复制 (${selectedFiles.length})`, () => onCopy(selectedFiles), 'Ctrl+C')}
      {hasSelected && item('✂️', `剪切 (${selectedFiles.length})`, () => onCut(selectedFiles), 'Ctrl+X')}
      {clipboard && item('📌', '粘贴', onPaste, 'Ctrl+V')}

      <div className="ctx-sep" />

      {/* Archive operations */}
      {hasSelected && item('🗜️', '压缩为ZIP', async () => {
        const dest = paneState.path + '\\archive.zip';
        try {
          await api.compressToZip(selectedFiles, dest);
          showToast('压缩完成', 'success');
          onRefresh();
        } catch (e: any) {
          showToast('压缩失败: ' + e, 'error');
        }
      })}
      {single && entry && isArchiveFile(entry.extension) &&
        item('📤', '解压到此处', async () => {
          try {
            await api.extractArchive(single, paneState.path);
            showToast('解压完成', 'success');
            onRefresh();
          } catch (e: any) {
            showToast('解压失败: ' + e, 'error');
          }
        })}

      <div className="ctx-sep" />

      {/* Rename / delete */}
      {single && item('✏️', '重命名', () => {
        window.dispatchEvent(new CustomEvent('start-rename', { detail: single }));
      }, 'F2')}
      {selectedFiles.length >= 2 && item('✏️', '批量重命名…', onBatchRename)}
      {hasSelected && item('🗑️', `删除 (${selectedFiles.length})`, () => onDelete(selectedFiles), 'Del', true)}

      <div className="ctx-sep" />

      {/* New */}
      {item('📁', '新建文件夹…', onNewFile)}
      {item('📄', '新建文件…', onNewFile)}

      <div className="ctx-sep" />

      {/* Info */}
      {single && item('ℹ️', '属性', () => onProperties(single))}
      {item('🔄', '刷新', onRefresh, 'F5')}
    </div>
  );
}
