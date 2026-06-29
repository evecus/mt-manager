import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { api } from '../utils/api';
import { getMonacoLanguage, basename } from '../utils/fileUtils';

interface EditorPanelProps {
  filePath: string;
  onSave: () => void;
  showToast: (msg: string, type?: any) => void;
}

export function EditorPanel({ filePath, onSave, showToast }: EditorPanelProps) {
  const [content, setContent] = useState('');
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [encoding, setEncoding] = useState('UTF-8');
  const [lineCount, setLineCount] = useState(0);
  const [colCount, setColCount] = useState(0);
  const editorRef = useRef<any>(null);

  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  const lang = getMonacoLanguage(ext);
  const modified = content !== original;

  useEffect(() => {
    setLoading(true);
    api.readFileText(filePath)
      .then(text => {
        setContent(text);
        setOriginal(text);
        setLineCount(text.split('\n').length);
      })
      .catch(e => showToast('读取失败: ' + e, 'error'))
      .finally(() => setLoading(false));
  }, [filePath]);

  const save = async () => {
    setSaving(true);
    try {
      await api.writeFileText(filePath, content);
      setOriginal(content);
      onSave();
      showToast('已保存', 'success');
    } catch (e: any) {
      showToast('保存失败: ' + e, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      save();
    }
  };

  return (
    <div className="editor-panel" onKeyDown={handleKeyDown}>
      <div className="editor-toolbar">
        {modified && <span className="editor-modified" title="未保存" />}
        <span className="editor-filename">{basename(filePath)}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '2px 7px', borderRadius: 3 }}>{lang}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>行 {lineCount}</span>
        <button
          className="btn btn-primary"
          style={{ height: 25, padding: '0 12px', fontSize: 12 }}
          onClick={save}
          disabled={!modified || saving}
        >
          {saving ? '保存中…' : '保存'}
        </button>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{encoding}</span>
      </div>

      {loading ? (
        <div className="loading">加载中…</div>
      ) : (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Editor
            height="100%"
            language={lang}
            value={content}
            theme="vs-dark"
            onChange={val => {
              setContent(val ?? '');
              setLineCount((val ?? '').split('\n').length);
            }}
            onMount={(editor) => { editorRef.current = editor; }}
            options={{
              fontSize: 13,
              fontFamily: "'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
              fontLigatures: true,
              minimap: { enabled: true, scale: 1 },
              scrollBeyondLastLine: false,
              wordWrap: 'off',
              lineNumbers: 'on',
              renderLineHighlight: 'line',
              cursorBlinking: 'smooth',
              smoothScrolling: true,
              formatOnPaste: false,
              tabSize: 4,
              insertSpaces: true,
              folding: true,
              bracketPairColorization: { enabled: true },
              guides: { bracketPairs: true },
              padding: { top: 8 },
              scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
            }}
          />
        </div>
      )}
    </div>
  );
}
