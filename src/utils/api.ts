import { invoke } from '@tauri-apps/api/core';
import type { FileEntry, DirResult, ArchiveEntry, FileInfo, Drive, SearchResult } from '../types';

export const api = {
  listDirectory: (path: string, showHidden: boolean): Promise<DirResult> =>
    invoke('list_directory', { path, showHidden }),

  getDrives: (): Promise<Drive[]> =>
    invoke('get_drives'),

  readFileText: (path: string): Promise<string> =>
    invoke('read_file_text', { path }),

  writeFileText: (path: string, content: string): Promise<void> =>
    invoke('write_file_text', { path, content }),

  readFileBytes: (path: string, offset: number, length: number): Promise<number[]> =>
    invoke('read_file_bytes', { path, offset, length }),

  copyFile: (src: string, dst: string): Promise<void> =>
    invoke('copy_file', { src, dst }),

  moveFile: (src: string, dst: string): Promise<void> =>
    invoke('move_file', { src, dst }),

  deleteFile: (path: string): Promise<void> =>
    invoke('delete_file', { path }),

  createDir: (path: string): Promise<void> =>
    invoke('create_dir', { path }),

  createFile: (path: string): Promise<void> =>
    invoke('create_file', { path }),

  renameFile: (src: string, newName: string): Promise<string> =>
    invoke('rename_file', { src, newName }),

  searchFiles: (
    root: string,
    pattern: string,
    searchContent: boolean,
    contentPattern: string,
    maxResults: number,
  ): Promise<SearchResult> =>
    invoke('search_files', { root, pattern, searchContent, contentPattern, maxResults }),

  batchRename: (
    paths: string[],
    pattern: string,
    replacement: string,
    useRegex: boolean,
    addPrefix: string,
    addSuffix: string,
    startNumber: number,
    numberPadding: number,
  ): Promise<string[]> =>
    invoke('batch_rename', { paths, pattern, replacement, useRegex, addPrefix, addSuffix, startNumber, numberPadding }),

  listArchive: (path: string): Promise<ArchiveEntry[]> =>
    invoke('list_archive', { path }),

  extractArchive: (archivePath: string, destDir: string): Promise<void> =>
    invoke('extract_archive', { archivePath, destDir }),

  compressToZip: (files: string[], dest: string): Promise<void> =>
    invoke('compress_to_zip', { files, dest }),

  getFileInfo: (path: string): Promise<FileInfo> =>
    invoke('get_file_info', { path }),

  getHomeDir: (): Promise<string> =>
    invoke('get_home_dir'),

  pathExists: (path: string): Promise<boolean> =>
    invoke('path_exists', { path }),

  getParentPath: (path: string): Promise<string | null> =>
    invoke('get_parent_path', { path }),
};
