import type { Toast } from '../hooks/useToast';

const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };

export function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span style={{ fontSize: 14 }}>{icons[t.type]}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
