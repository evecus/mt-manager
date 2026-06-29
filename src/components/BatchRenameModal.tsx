import { useState, useMemo } from 'react';
import { basename } from '../utils/fileUtils';

interface BatchRenameParams {
  files: string[];
  pattern: string;
  replacement: string;
  useRegex: boolean;
  addPrefix: string;
  addSuffix: string;
  startNumber: number;
  numberPadding: number;
}

interface Props {
  files: string[];
  onClose: () => void;
  onRename: (params: BatchRenameParams) => void;
}

export function BatchRenameModal({ files, onClose, onRename }: Props) {
  const [pattern, setPattern] = useState('');
  const [replacement, setReplacement] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const [addPrefix, setAddPrefix] = useState('');
  const [addSuffix, setAddSuffix] = useState('');
  const [enableNumber, setEnableNumber] = useState(false);
  const [startNumber, setStartNumber] = useState(1);
  const [numberPadding, setNumberPadding] = useState(2);
  const [caseMode, setCaseMode] = useState<'none' | 'upper' | 'lower' | 'title'>('none');

  const preview = useMemo(() => {
    return files.map((f, i) => {
      const name = basename(f);
      const dotIdx = name.lastIndexOf('.');
      const stem = dotIdx > 0 ? name.slice(0, dotIdx) : name;
      const ext = dotIdx > 0 ? name.slice(dotIdx) : '';

      let newStem = stem;
      try {
        if (pattern) {
          if (useRegex) {
            const re = new RegExp(pattern, 'g');
            newStem = newStem.replace(re, replacement);
          } else {
            newStem = newStem.split(pattern).join(replacement);
          }
        }
      } catch {}

      if (caseMode === 'upper') newStem = newStem.toUpperCase();
      else if (caseMode === 'lower') newStem = newStem.toLowerCase();
      else if (caseMode === 'title') newStem = newStem.replace(/\b\w/g, c => c.toUpperCase());

      const numStr = enableNumber ? String(startNumber + i).padStart(numberPadding, '0') : '';
      return {
        old: name,
        new: `${addPrefix}${numStr}${newStem}${addSuffix}${ext}`,
      };
    });
  }, [files, pattern, replacement, useRegex, addPrefix, addSuffix, enableNumber, startNumber, numberPadding, caseMode]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ minWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">✏️ 批量重命名 ({files.length} 项)</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {/* Pattern replace */}
          <div className="form-group">
            <label className="label">查找 / 替换</label>
            <div className="form-row">
              <input className="input" placeholder="查找文本" value={pattern} onChange={e => setPattern(e.target.value)} style={{ fontFamily: useRegex ? 'var(--font-mono)' : 'inherit' }} />
              <input className="input" placeholder="替换为" value={replacement} onChange={e => setReplacement(e.target.value)} />
            </div>
            <label className="checkbox-row" style={{ marginTop: 6 }}>
              <input type="checkbox" checked={useRegex} onChange={e => setUseRegex(e.target.checked)} />
              使用正则表达式
            </label>
          </div>

          {/* Prefix/suffix */}
          <div className="form-group">
            <label className="label">添加前缀 / 后缀</label>
            <div className="form-row">
              <input className="input" placeholder="前缀" value={addPrefix} onChange={e => setAddPrefix(e.target.value)} />
              <input className="input" placeholder="后缀（扩展名前）" value={addSuffix} onChange={e => setAddSuffix(e.target.value)} />
            </div>
          </div>

          {/* Number */}
          <div className="form-group">
            <label className="checkbox-row" style={{ marginBottom: 6 }}>
              <input type="checkbox" checked={enableNumber} onChange={e => setEnableNumber(e.target.checked)} />
              添加序号
            </label>
            {enableNumber && (
              <div className="form-row">
                <div style={{ flex: 1 }}>
                  <label className="label">起始数字</label>
                  <input className="input" type="number" value={startNumber} onChange={e => setStartNumber(+e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="label">补零位数</label>
                  <input className="input" type="number" value={numberPadding} min={1} max={8} onChange={e => setNumberPadding(+e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* Case */}
          <div className="form-group">
            <label className="label">大小写</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['none', 'upper', 'lower', 'title'] as const).map(m => (
                <button
                  key={m}
                  className={`btn${caseMode === m ? ' btn-primary' : ''}`}
                  style={{ height: 28, padding: '0 12px', fontSize: 12 }}
                  onClick={() => setCaseMode(m)}
                >
                  {{ none: '不变', upper: '全大写', lower: '全小写', title: '首字母大写' }[m]}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label">预览（共 {files.length} 项）</label>
            <div className="batch-rename-list">
              {preview.map((p, i) => (
                <div key={i} className="br-row">
                  <span className="br-old">{p.old}</span>
                  <span className="br-arrow">→</span>
                  <span className="br-new">{p.new}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={() => onRename({
            files, pattern, replacement, useRegex, addPrefix, addSuffix,
            startNumber: enableNumber ? startNumber : -1,
            numberPadding,
          })}>
            执行重命名
          </button>
        </div>
      </div>
    </div>
  );
}
