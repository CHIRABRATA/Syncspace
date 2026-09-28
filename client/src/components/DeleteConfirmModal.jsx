import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-sm rounded-2xl p-6 border shadow-2xl relative"
        style={{
          background: 'rgba(22, 27, 39, 0.95)',
          backdropFilter: 'blur(20px)',
          borderColor: 'rgba(248, 113, 113, 0.3)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(248, 113, 113, 0.12)',
        }}
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5 cursor-pointer"
          disabled={deleting}
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(248, 113, 113, 0.15)',
              border: '1px solid rgba(248, 113, 113, 0.25)',
            }}
          >
            <AlertTriangle size={20} style={{ color: 'var(--accent-red)' }} />
          </div>
          <div>
            <h3 id="delete-dialog-title" className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
              Delete "{document.title || 'Untitled Document'}"?
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>This action cannot be undone.</p>
          </div>
        </div>

        <div
          className="rounded-xl px-3.5 py-3 mb-5 border"
          style={{ background: 'rgba(30, 36, 56, 0.6)', borderColor: 'rgba(42, 51, 82, 0.5)' }}
        >
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {document.title || 'Untitled Document'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            All collaborators will permanently lose access to this document.
          </p>
        </div>

        <div className="flex gap-2.5">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer"
            style={{
              background: 'rgba(30, 36, 56, 0.8)',
              color: 'var(--text-secondary)',
              border: '1px solid rgba(42, 51, 82, 0.5)',
            }}
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            style={{
              background: deleting ? '#555' : 'linear-gradient(135deg, #ef4444, #dc2626)',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.35)',
              opacity: deleting ? 0.7 : 1,
            }}
            id="confirm-delete-btn"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            <span>{deleting ? 'Deleting...' : 'Delete'}</span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
