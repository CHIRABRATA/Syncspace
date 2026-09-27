import { useState, useRef, useEffect } from 'react';
import {
  MoreVertical, Edit3, Share2, Download, Copy, Trash2, LogOut, X
} from 'lucide-react';

export default function DocumentMenu({ document, docRole, onRename, onShare, onDownload, onDuplicate, onDelete, onLeave }) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
        setRenaming(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!document) return null;

  const isOwner = docRole === 'OWNER';

  const handleRenameStart = () => {
    setNewTitle(document.title || '');
    setRenaming(true);
  };

  const handleRenameSubmit = (e) => {
    e?.preventDefault();
    if (newTitle.trim() && newTitle.trim() !== document.title) {
      onRename?.(newTitle.trim());
    }
    setRenaming(false);
    setOpen(false);
  };

  const menuItems = [];

  if (isOwner) {
    menuItems.push(
      { label: 'Rename', icon: Edit3, action: handleRenameStart },
      { label: 'Share', icon: Share2, action: () => { setOpen(false); onShare?.(); } },
      { label: 'Download', icon: Download, action: () => { setOpen(false); onDownload?.(); } },
      { label: 'Duplicate', icon: Copy, action: () => { setOpen(false); onDuplicate?.(); } },
      { divider: true },
      { label: 'Delete', icon: Trash2, action: () => { setOpen(false); onDelete?.(); }, danger: true },
    );
  } else {
    menuItems.push(
      { label: 'Download', icon: Download, action: () => { setOpen(false); onDownload?.(); } },
      { divider: true },
      { label: 'Leave document', icon: LogOut, action: () => { setOpen(false); onLeave?.(); }, danger: true },
    );
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-white/5"
        style={{ color: 'var(--text-muted)' }}
      >
        <MoreVertical size={14} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-44 rounded-xl border shadow-2xl z-50 overflow-hidden animate-scaleIn"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {renaming ? (
            <form onSubmit={handleRenameSubmit} className="p-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="input-field py-1.5 text-xs mb-2"
                placeholder="New title..."
                autoFocus
              />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setRenaming(false)}
                  className="flex-1 px-2 py-1 rounded text-xs"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="flex-1 px-2 py-1 rounded text-xs font-medium text-white"
                  style={{ background: 'var(--accent-blue)' }}
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            menuItems.map((item, i) => {
              if (item.divider) {
                return <div key={i} className="border-t my-0.5" style={{ borderColor: 'var(--border-subtle)' }} />;
              }
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-all hover:bg-white/5"
                  style={{
                    color: item.danger ? 'var(--accent-red)' : 'var(--text-primary)',
                  }}
                >
                  <Icon size={13} />
                  <span>{item.label}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
