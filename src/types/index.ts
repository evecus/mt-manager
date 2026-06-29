export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified: number;
  extension: string;
  is_hidden: boolean;
  is_symlink: boolean;
}

export interface DirResult {
  entries: FileEntry[];
  path: string;
  error?: string;
}

export interface ArchiveEntry {
  name: string;
  path: string;
  size: number;
  compressed_size: number;
  is_dir: boolean;
  modified: number;
}

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  modified: number;
  created: number;
  is_dir: boolean;
  extension: string;
  mime_type: string;
  md5: string;
  sha256: string;
  permissions: string;
}

export interface Drive {
  name: string;
  path: string;
  letter: string;
}

export interface SearchResult {
  entries: FileEntry[];
  total: number;
}

export type ViewMode = 'list' | 'grid';
export type SortBy = 'name' | 'size' | 'modified' | 'type';
export type SortOrder = 'asc' | 'desc';

export interface PaneState {
  path: string;
  history: string[];
  historyIndex: number;
  entries: FileEntry[];
  selected: Set<string>;
  viewMode: ViewMode;
  sortBy: SortBy;
  sortOrder: SortOrder;
  showHidden: boolean;
  loading: boolean;
  error?: string;
}

export interface TabState {
  id: string;
  label: string;
  type: 'file' | 'editor' | 'hex' | 'image' | 'archive' | 'search' | 'properties';
  filePath?: string;
  paneId?: 'left' | 'right';
  archivePath?: string;
  searchQuery?: string;
}

export interface ClipboardState {
  files: string[];
  operation: 'copy' | 'cut';
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'auto';
  showHidden: boolean;
  defaultViewMode: ViewMode;
  confirmDelete: boolean;
  showSizeInKB: boolean;
  dateFormat: string;
  fontSize: number;
  editorTheme: string;
}
