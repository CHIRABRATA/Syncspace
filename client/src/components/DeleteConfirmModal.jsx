import { useState } from 'react';
import { Trash2, AlertTriangle, Loader2, X } from 'lucide-react';

export default function DeleteConfirmModal({ document, onConfirm, onCancel }) {
  const [deleting, setDeleting] = useState(false);

  if (!document) return null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 border shadow-2xl relative animate-scaleIn"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          disabled={deleting}
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(248,113,113,0.15)' }}
          >
            <AlertTriangle size={20} style={{ color: 'var(--accent-red)' }} />
          </div>
          <div>
            <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
              Delete this document?
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>This action cannot be undone.</p>
          </div>
        </div>

        <div
          className="rounded-lg px-3 py-2.5 mb-5 border"
          style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-subtle)' }}
        >
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {document.title || 'Untitled Document'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            All collaborators will lose access.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all flex items-center justify-center gap-1.5"
            style={{
              background: deleting ? '#666' : '#ef4444',
              opacity: deleting ? 0.7 : 1,
            }}
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            <span>{deleting ? 'Deleting...' : 'Delete permanently'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
