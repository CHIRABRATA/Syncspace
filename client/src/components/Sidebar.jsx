import { useState } from 'react';
import {
  FileText, Plus, ChevronRight, LogOut, User,
  Loader2, Sparkles, Clock, Search, Link2, AlertCircle,
  Crown, Pencil, Eye
} from 'lucide-react';
import { api } from '../lib/api';
import DocumentMenu from './DocumentMenu';

export default function Sidebar({
  user, documents, selectedDoc, onSelectDoc, onLogout, onDocCreated,
  onDeleteDoc, onShareDoc, onDownloadDoc, onRenameDoc, onDuplicateDoc, onLeaveDoc
}) {
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'join'
  const [errorMessage, setErrorMessage] = useState('');
  const [search, setSearch] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    setErrorMessage('');
    try {
      const doc = await api.createDocument(newTitle.trim());
      onDocCreated(doc);
      setNewTitle('');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create document');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    let input = joinInput.trim();
    if (!input) return;

    // Support pasted full URLs (e.g. http://localhost:5173/?doc=uuid/w), query params, or raw UUIDs with /w or /r
    const match = input.match(/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})(?:[\/:]([rwRW]))?/i);
    let docId = input;
    if (match) {
      docId = match[2] ? `${match[1]}/${match[2].toLowerCase()}` : match[1];
    }

    setJoining(true);
    setErrorMessage('');
    try {
      const doc = await api.joinDocument(docId);
      onDocCreated(doc);
      onSelectDoc(doc);
      setJoinInput('');
    } catch (err) {
      setErrorMessage(err.message || 'Invalid or non-existent document ID');
    } finally {
      setJoining(false);
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

  const getRoleMiniIcon = (doc) => {
    const role = doc.role;
    if (role === 'OWNER') return <Crown size={9} style={{ color: '#fbbf24' }} />;
    if (role === 'WRITE') return <Pencil size={9} style={{ color: '#4f8ef7' }} />;
    if (role === 'READ') return <Eye size={9} style={{ color: '#22c55e' }} />;
    return null;
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

      {/* Action Tabs: New Doc vs Join */}
      <div className="px-4 pt-3 pb-2 flex gap-1 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <button
          onClick={() => { setActiveTab('create'); setErrorMessage(''); }}
          className="flex-1 py-1.5 text-xs font-medium rounded-md transition-all text-center"
          style={{
            background: activeTab === 'create' ? 'var(--bg-tertiary)' : 'transparent',
            color: activeTab === 'create' ? 'var(--text-primary)' : 'var(--text-muted)',
          }}
        >
          New Document
        </button>
        <button
          onClick={() => { setActiveTab('join'); setErrorMessage(''); }}
          className="flex-1 py-1.5 text-xs font-medium rounded-md transition-all text-center flex items-center justify-center gap-1"
          style={{
            background: activeTab === 'join' ? 'var(--bg-tertiary)' : 'transparent',
            color: activeTab === 'join' ? 'var(--text-primary)' : 'var(--text-muted)',
          }}
        >
          <Link2 size={11} />
          Join Existing
        </button>
      </div>

      {/* Creation / Join Form */}
      <div className="px-4 py-2.5">
        {activeTab === 'create' ? (
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              className="input-field py-2 flex-1"
              placeholder="Document title..."
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
        ) : (
          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              type="text"
              className="input-field py-2 flex-1 font-mono text-xs"
              placeholder="Paste Doc ID / Link"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              style={{ fontSize: '11px' }}
            />
            <button
              type="submit"
              disabled={!joinInput.trim() || joining}
              className="flex-shrink-0 px-2.5 h-9 rounded-lg text-xs font-medium flex items-center justify-center transition-all"
              style={{
                background: joinInput.trim() ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                color: joinInput.trim() ? 'white' : 'var(--text-muted)',
                border: '1px solid var(--border)',
                cursor: joinInput.trim() ? 'pointer' : 'default',
              }}
            >
              {joining ? <Loader2 size={13} className="animate-spin" /> : 'Join'}
            </button>
          </form>
        )}

        {errorMessage && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-red-400">
            <AlertCircle size={12} className="flex-shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="px-4 pb-2">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-2.5" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-field pl-8 py-1.5 text-sm"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ fontSize: '12px' }}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 mb-2 border-t" style={{ borderColor: 'var(--border-subtle)' }} />

      {/* Document Label */}
      <div className="px-4 mb-1.5 flex items-center gap-1.5">
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
            const docRole = doc.role || (doc.owner_id === user?.id ? 'OWNER' : null);
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
                    className="text-xs font-medium truncate flex items-center gap-1"
                    style={{ color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                  >
                    <span className="truncate">{doc.title || 'Untitled'}</span>
                    {getRoleMiniIcon(doc)}
                  </p>
                  {doc.updated_at && (
                    <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                      <Clock size={9} />
                      {formatDate(doc.updated_at)}
                    </p>
                  )}
                </div>

                {/* Three-dot menu */}
                <DocumentMenu
                  document={doc}
                  docRole={docRole}
                  onRename={(newTitle) => onRenameDoc?.(doc, newTitle)}
                  onShare={() => onShareDoc?.(doc)}
                  onDownload={() => onDownloadDoc?.(doc)}
                  onDuplicate={() => onDuplicateDoc?.(doc)}
                  onDelete={() => onDeleteDoc?.(doc)}
                  onLeave={() => onLeaveDoc?.(doc)}
                />
              </button>
            );
          })
        )}
      </div>

      {/* User Info / Logout */}
      <div className="p-3 border-t flex items-center gap-2.5" style={{ borderColor: 'var(--border)' }}>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #4f8ef7, #9b72f7)' }}
        >
          {initials(user?.email || 'User')}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {user?.email || 'Collaborator'}
          </p>
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
            Online
          </p>
        </div>
        <button
          onClick={onLogout}
          title="Sign Out"
          className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 hover:text-red-400"
          style={{ color: 'var(--text-muted)' }}
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}
