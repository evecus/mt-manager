import { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { formatSize, basename } from '../utils/fileUtils';

const PAGE = 512; // bytes per page

interface HexViewerProps {
  filePath: string;
}

export function HexViewer({ filePath }: HexViewerProps) {
  const [bytes, setBytes] = useState<number[]>([]);
  const [offset, setOffset] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchHex, setSearchHex] = useState('');
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [highlightBytes, setHighlightBytes] = useState<Set<number>>(new Set());

  useEffect(() => {
    api.getFileInfo(filePath).then(info => setTotalSize(info.size)).catch(() => {});
    loadPage(0);
  }, [filePath]);

  const loadPage = async (off: number) => {
    setLoading(true);
    try {
      const data = await api.readFileBytes(filePath, off, PAGE);
      setBytes(data);
      setOffset(off);
    } catch (e) {
      setBytes([]);
    } finally {
      setLoading(false);
    }
  };

  const doSearch = () => {
    if (!searchHex.trim()) return;
    const pattern = searchHex.trim().split(/\s+/).map(h => parseInt(h, 16)).filter(n => !isNaN(n));
    if (!pattern.length) return;
    const matches: number[] = [];
    for (let i = 0; i <= bytes.length - pattern.length; i++) {
      if (pattern.every((b, j) => bytes[i + j] === b)) matches.push(i);
    }
    setSearchMatches(matches);
    const hl = new Set<number>();
    matches.forEach(m => { for (let j = 0; j < pattern.length; j++) hl.add(m + j); });
    setHighlightBytes(hl);
  };

  const rows: number[][] = [];
  for (let i = 0; i < bytes.length; i += 16) rows.push(bytes.slice(i, i + 16));

  const toChar = (b: number) => (b >= 0x20 && b < 0x7f) ? String.fromCharCode(b) : '·';

  return (
    <div className="editor-panel">
      <div className="editor-toolbar">
        <span className="editor-filename">{basename(filePath)}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '2px 7px', borderRadius: 3 }}>HEX</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatSize(totalSize)}</span>

        <input
          style={{ width: 160, height: 24, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-primary)', padding: '0 7px', fontSize: 11.5, fontFamily: 'monospace', outline: 'none' }}
          placeholder="搜索 HEX (如: FF D8 FF)"
          value={searchHex}
          onChange={e => setSearchHex(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doSearch()}
        />
        <button className="btn" style={{ height: 25, padding: '0 10px', fontSize: 12 }} onClick={doSearch}>搜索</button>
        {searchMatches.length > 0 && (
          <span style={{ fontSize: 11, color: 'var(--success)' }}>找到 {searchMatches.length} 处</span>
        )}
      </div>

      {loading ? <div className="loading">加载中…</div> : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Column header */}
          <div style={{ display: 'flex', gap: 16, padding: '4px 14px', background: 'var(--bg-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
            <span style={{ minWidth: 80 }}>偏移量</span>
            <span style={{ minWidth: 370 }}>
              {Array.from({ length: 16 }, (_, i) => (
                <span key={i} style={{ minWidth: 22, display: 'inline-block', textAlign: 'center' }}>{i.toString(16).toUpperCase().padStart(2, '0')}</span>
              ))}
            </span>
            <span>ASCII</span>
          </div>

          <div className="hex-viewer">
            {rows.map((row, ri) => {
              const rowOffset = offset + ri * 16;
              return (
                <div key={ri} className="hex-row">
                  <span className="hex-offset">{(rowOffset).toString(16).toUpperCase().padStart(8, '0')}</span>
                  <span className="hex-bytes">
                    {row.map((b, bi) => {
                      const absIdx = ri * 16 + bi;
                      const isHighlight = highlightBytes.has(absIdx);
                      return (
                        <span
                          key={bi}
                          className={`hex-byte${b === 0 ? ' zero' : ''}`}
                          style={isHighlight ? { background: 'var(--accent)', color: 'white', borderRadius: 2 } : {}}
                        >
                          {b.toString(16).toUpperCase().padStart(2, '0')}
                        </span>
                      );
                    })}
                    {row.length < 16 && Array.from({ length: 16 - row.length }, (_, i) => (
                      <span key={`pad${i}`} className="hex-byte zero">  </span>
                    ))}
                  </span>
                  <span className="hex-ascii">
                    {row.map(toChar).join('')}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', flexShrink: 0, fontSize: 12 }}>
            <button className="btn" style={{ height: 25, padding: '0 12px', fontSize: 12 }} onClick={() => loadPage(Math.max(0, offset - PAGE))} disabled={offset === 0}>‹ 上一页</button>
            <span style={{ color: 'var(--text-muted)' }}>偏移 {offset.toString(16).toUpperCase().padStart(8, '0')} / {totalSize.toString(16).toUpperCase().padStart(8, '0')}</span>
            <button className="btn" style={{ height: 25, padding: '0 12px', fontSize: 12 }} onClick={() => loadPage(offset + PAGE)} disabled={offset + PAGE >= totalSize}>下一页 ›</button>
            <div style={{ flex: 1 }} />
            <span style={{ color: 'var(--text-muted)' }}>每页 {PAGE} 字节</span>
          </div>
        </div>
      )}
    </div>
  );
}
