import { useState } from 'react';
import {
  FileText, Plus, ChevronRight, LogOut, User,
  Loader2, Sparkles, Clock, Search
} from 'lucide-react';
import { api } from '../lib/api';

export default function Sidebar({ user, documents, selectedDoc, onSelectDoc, onLogout, onDocCreated }) {
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [search, setSearch] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const doc = await api.createDocument(newTitle.trim());
      onDocCreated(doc);
      setNewTitle('');
      setCreating(false);
    } catch {
      setCreating(false);
    }
  };

  const filtered = documents.filter((d) =>
    d.title?.toLowerCase().includes(search.toLowerCase())
  );

  const initials = (name) =>
    name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <aside
      className="flex flex-col h-full w-64 flex-shrink-0 border-r"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #4f8ef7, #9b72f7)' }}
        >
          <Sparkles size={14} className="text-white" />
        </div>
        <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>SyncSpace</span>
      </div>

      {/* Search */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-2.5" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-field pl-8 py-2 text-sm"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ fontSize: '12px' }}
          />
        </div>
      </div>

      {/* New Document */}
      <div className="px-4 pb-3">
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            className="input-field py-2 flex-1"
            placeholder="New document title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            style={{ fontSize: '12px' }}
          />
          <button
            type="submit"
            disabled={!newTitle.trim() || creating}
            className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all"
            style={{
              background: newTitle.trim() ? 'linear-gradient(135deg, #4f8ef7, #9b72f7)' : 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              cursor: newTitle.trim() ? 'pointer' : 'default',
            }}
          >
            {creating ? (
              <Loader2 size={14} className="animate-spin text-white" />
            ) : (
              <Plus size={14} style={{ color: newTitle.trim() ? 'white' : 'var(--text-muted)' }} />
            )}
          </button>
        </form>
      </div>

      {/* Divider */}
      <div className="mx-4 mb-3 border-t" style={{ borderColor: 'var(--border-subtle)' }} />

      {/* Document Label */}
      <div className="px-4 mb-2 flex items-center gap-1.5">
        <FileText size={11} style={{ color: 'var(--text-muted)' }} />
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Documents
        </span>
        <span
          className="ml-auto text-xs px-1.5 py-0.5 rounded"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
        >
          {documents.length}
        </span>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 px-4">
            <FileText size={28} className="mx-auto mb-2 opacity-20" style={{ color: 'var(--text-muted)' }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {search ? 'No documents found' : 'No documents yet'}
            </p>
          </div>
        ) : (
          filtered.map((doc) => {
            const isSelected = selectedDoc?.id === doc.id;
            return (
              <button
                key={doc.id}
                onClick={() => onSelectDoc(doc)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all group animate-slideIn"
                style={{
                  background: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                  border: isSelected ? '1px solid var(--border)' : '1px solid transparent',
                }}
              >
                <div
                  className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                  style={{ background: isSelected ? 'var(--accent-blue)' : 'var(--bg-tertiary)' }}
                >
                  <FileText size={12} style={{ color: isSelected ? 'white' : 'var(--text-muted)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-medium truncate"
                    style={{ color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                  >
                    {doc.title || 'Untitled'}
                  </p>
                  {doc.updated_at && (
                    <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                      <Clock size={9} />
                      {formatDate(doc.updated_at)}
                    </p>
                  )}
                </div>
                <ChevronRight
                  size={12}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--text-muted)' }}
                />
              </button>
            );
          })
        )}
      </div>

      {/* User Account */}
      <div
        className="p-4 border-t flex items-center gap-3"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #4f8ef7, #9b72f7)', color: 'white' }}
        >
          {initials(user?.email || '')}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {user?.email || 'User'}
          </p>
          <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
            <User size={9} /> Member
          </p>
        </div>
        <button
          onClick={onLogout}
          className="p-1.5 rounded-lg transition-all hover:bg-red-500/10"
          title="Sign out"
        >
          <LogOut size={14} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>
    </aside>
  );
}
