export function formatSize(bytes: number): string {
  if (bytes === 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function formatDate(timestamp: number): string {
  if (!timestamp) return '-';
  const d = new Date(timestamp * 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function getFileIcon(entry: { is_dir: boolean; extension: string; name: string }): string {
  if (entry.is_dir) return '📁';
  const ext = entry.extension.toLowerCase();
  const icons: Record<string, string> = {
    // Images
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', bmp: '🖼️', webp: '🖼️', svg: '🖼️', ico: '🖼️', tiff: '🖼️',
    // Video
    mp4: '🎬', mkv: '🎬', avi: '🎬', mov: '🎬', wmv: '🎬', flv: '🎬', webm: '🎬', m4v: '🎬',
    // Audio
    mp3: '🎵', wav: '🎵', flac: '🎵', aac: '🎵', ogg: '🎵', m4a: '🎵', wma: '🎵',
    // Archives
    zip: '🗜️', rar: '🗜️', '7z': '🗜️', tar: '🗜️', gz: '🗜️', bz2: '🗜️', xz: '🗜️', tgz: '🗜️', tbz2: '🗜️',
    // Code
    js: '📜', ts: '📜', jsx: '📜', tsx: '📜', vue: '📜', py: '📜', rs: '📜', go: '📜',
    java: '📜', kt: '📜', swift: '📜', cpp: '📜', c: '📜', h: '📜', cs: '📜', php: '📜',
    rb: '📜', dart: '📜', lua: '📜', sh: '📜', bat: '📜', ps1: '📜',
    // Web
    html: '🌐', htm: '🌐', css: '🌐', scss: '🌐', less: '🌐',
    // Data
    json: '📋', xml: '📋', yaml: '📋', yml: '📋', toml: '📋', ini: '📋', cfg: '📋', conf: '📋', env: '📋',
    // Docs
    pdf: '📄', doc: '📄', docx: '📄', xls: '📄', xlsx: '📄', ppt: '📄', pptx: '📄', odt: '📄', ods: '📄',
    // Text
    txt: '📝', md: '📝', log: '📝', csv: '📝', rtf: '📝',
    // Executables
    exe: '⚙️', msi: '⚙️', dmg: '⚙️', deb: '⚙️', rpm: '⚙️', appimage: '⚙️',
    // System
    dll: '🔧', so: '🔧', lib: '🔧',
    // Database
    db: '🗃️', sqlite: '🗃️', sql: '🗃️',
    // Font
    ttf: '🔤', otf: '🔤', woff: '🔤', woff2: '🔤',
  };
  return icons[ext] || '📄';
}

export function isTextFile(extension: string): boolean {
  const textExts = new Set([
    'txt', 'md', 'markdown', 'log', 'csv', 'tsv',
    'js', 'ts', 'jsx', 'tsx', 'vue', 'svelte',
    'py', 'rb', 'php', 'java', 'kt', 'swift', 'go', 'rs', 'c', 'cpp', 'h', 'hpp', 'cs',
    'html', 'htm', 'css', 'scss', 'less', 'sass',
    'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'env',
    'sh', 'bash', 'zsh', 'fish', 'bat', 'cmd', 'ps1',
    'sql', 'graphql', 'lua', 'dart', 'r', 'scala', 'pl', 'ex', 'exs',
    'gitignore', 'gitattributes', 'dockerfile', 'makefile', 'cmake',
    'properties', 'lock', 'editorconfig', 'eslintrc', 'babelrc',
    'vue', 'astro', 'svelte',
  ]);
  return textExts.has(extension.toLowerCase());
}

export function isImageFile(extension: string): boolean {
  return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'avif'].includes(extension.toLowerCase());
}

export function isArchiveFile(extension: string): boolean {
  return ['zip', 'tar', 'gz', 'tgz', 'bz2', 'tbz2', 'xz', '7z', 'rar'].includes(extension.toLowerCase());
}

export function getMonacoLanguage(extension: string): string {
  const map: Record<string, string> = {
    js: 'javascript', mjs: 'javascript', cjs: 'javascript',
    ts: 'typescript', mts: 'typescript', cts: 'typescript',
    jsx: 'javascript', tsx: 'typescript',
    py: 'python', rb: 'ruby', php: 'php',
    java: 'java', kt: 'kotlin', swift: 'swift',
    go: 'go', rs: 'rust', c: 'c', cpp: 'cpp', h: 'cpp', hpp: 'cpp', cs: 'csharp',
    html: 'html', htm: 'html', css: 'css', scss: 'scss', less: 'less',
    json: 'json', xml: 'xml', yaml: 'yaml', yml: 'yaml', toml: 'toml',
    sql: 'sql', graphql: 'graphql', md: 'markdown', markdown: 'markdown',
    sh: 'shell', bash: 'shell', zsh: 'shell', bat: 'bat', ps1: 'powershell',
    lua: 'lua', dart: 'dart', r: 'r', scala: 'scala',
    vue: 'html', svelte: 'html', astro: 'html',
    dockerfile: 'dockerfile',
    ini: 'ini', cfg: 'ini', conf: 'ini',
    txt: 'plaintext', log: 'plaintext', csv: 'plaintext',
  };
  return map[extension.toLowerCase()] || 'plaintext';
}

export function joinPath(base: string, name: string): string {
  const sep = base.includes('\\') ? '\\' : '/';
  if (base.endsWith(sep)) return base + name;
  return base + sep + name;
}

export function basename(path: string): string {
  return path.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || path;
}

export function dirname(path: string): string {
  const parts = path.replace(/[/\\]+$/, '').split(/[/\\]/);
  parts.pop();
  if (parts.length === 1 && parts[0] === '') return '/';
  return parts.join(path.includes('\\') ? '\\' : '/') || '/';
}

export function pathBreadcrumbs(path: string): Array<{ name: string; path: string }> {
  const sep = path.includes('\\') ? '\\' : '/';
  const parts = path.replace(/[/\\]+$/, '').split(/[/\\]/).filter(Boolean);
  const crumbs: Array<{ name: string; path: string }> = [];

  if (path.startsWith('/')) {
    crumbs.push({ name: '/', path: '/' });
    let cur = '';
    for (const p of parts) {
      cur += '/' + p;
      crumbs.push({ name: p, path: cur });
    }
  } else {
    let cur = '';
    for (const p of parts) {
      cur = cur ? cur + sep + p : p;
      crumbs.push({ name: p, path: cur + (cur.endsWith(':') ? sep : '') });
    }
  }
  return crumbs;
}
