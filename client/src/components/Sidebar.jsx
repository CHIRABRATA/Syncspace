import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, LogOut,
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
  const [activeTab, setActiveTab] = useState('create');
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
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col h-full w-64 flex-shrink-0 relative z-10"
      style={{
        background: 'rgba(22, 27, 39, 0.85)',
        backdropFilter: 'blur(20px) saturate(1.3)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
        borderRight: '1px solid rgba(42, 51, 82, 0.4)',
      }}
      role="navigation"
      aria-label="Document sidebar"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b" style={{ borderColor: 'rgba(42, 51, 82, 0.3)' }}>
        <motion.div
          whileHover={{ scale: 1.05, rotate: 5 }}
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #4f8ef7, #9b72f7)',
            boxShadow: '0 2px 10px rgba(79, 142, 247, 0.3)',
          }}
        >
          <Sparkles size={15} className="text-white" />
        </motion.div>
        <div>
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>SyncSpace</span>
          <p className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>Collaborative Editor</p>
        </div>
      </div>

      {/* Action Tabs */}
      <div className="px-4 pt-3 pb-2 flex gap-1 border-b" style={{ borderColor: 'rgba(42, 51, 82, 0.3)' }}>
        {[
          { key: 'create', label: 'New Document', icon: null },
          { key: 'join', label: 'Join Existing', icon: Link2 },
        ].map(({ key, label, icon: Icon }) => (
          <motion.button
            key={key}
            whileTap={{ scale: 0.97 }}
            onClick={() => { setActiveTab(key); setErrorMessage(''); }}
            className="flex-1 py-1.5 text-xs font-medium rounded-md transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
            style={{
              background: activeTab === key ? 'rgba(30, 36, 56, 0.8)' : 'transparent',
              color: activeTab === key ? 'var(--text-primary)' : 'var(--text-muted)',
              border: activeTab === key ? '1px solid rgba(42, 51, 82, 0.4)' : '1px solid transparent',
            }}
          >
            {Icon && <Icon size={11} />}
            {label}
          </motion.button>
        ))}
      </div>

      {/* Creation / Join Form */}
      <div className="px-4 py-2.5">
        <AnimatePresence mode="wait">
          {activeTab === 'create' ? (
            <motion.form
              key="create"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              onSubmit={handleCreate}
              className="flex gap-2"
            >
              <input
                type="text"
                className="input-field py-2 flex-1"
                placeholder="Document title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                style={{ fontSize: '12px' }}
                aria-label="New document title"
                id="new-doc-title"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={!newTitle.trim() || creating}
                className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                style={{
                  background: newTitle.trim() ? 'linear-gradient(135deg, #4f8ef7, #9b72f7)' : 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                }}
                aria-label="Create document"
                id="create-doc-btn"
              >
                {creating ? (
                  <Loader2 size={14} className="animate-spin text-white" />
                ) : (
                  <Plus size={14} style={{ color: newTitle.trim() ? 'white' : 'var(--text-muted)' }} />
                )}
              </motion.button>
            </motion.form>
          ) : (
            <motion.form
              key="join"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              onSubmit={handleJoin}
              className="flex gap-2"
            >
              <input
                type="text"
                className="input-field py-2 flex-1 font-mono text-xs"
                placeholder="Paste Doc ID / Link"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                style={{ fontSize: '11px' }}
                aria-label="Document ID or link"
                id="join-doc-input"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={!joinInput.trim() || joining}
                className="flex-shrink-0 px-2.5 h-9 rounded-lg text-xs font-medium flex items-center justify-center transition-all cursor-pointer"
                style={{
                  background: joinInput.trim() ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                  color: joinInput.trim() ? 'white' : 'var(--text-muted)',
                  border: '1px solid var(--border)',
                }}
                aria-label="Join document"
                id="join-doc-btn"
              >
                {joining ? <Loader2 size={13} className="animate-spin" /> : 'Join'}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex items-center gap-1.5 mt-2 text-xs text-red-400"
            >
              <AlertCircle size={12} className="flex-shrink-0" />
              <span className="truncate">{errorMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
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
            aria-label="Search documents"
            id="search-docs"
          />
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 mb-2 border-t" style={{ borderColor: 'rgba(42, 51, 82, 0.3)' }} />

      {/* Document Label */}
      <div className="px-4 mb-1.5 flex items-center gap-1.5">
        <FileText size={11} style={{ color: 'var(--text-muted)' }} />
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Documents
        </span>
        <span
          className="ml-auto text-xs px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(30, 36, 56, 0.6)', color: 'var(--text-muted)' }}
        >
          {documents.length}
        </span>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 px-4"
          >
            <FileText size={28} className="mx-auto mb-2 opacity-20" style={{ color: 'var(--text-muted)' }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {search ? 'No documents found' : 'No documents yet'}
            </p>
            {!search && (
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                Create your first document above
              </p>
            )}
          </motion.div>
        ) : (
          <AnimatePresence>
            {filtered.map((doc, idx) => {
              const isSelected = selectedDoc?.id === doc.id;
              const docRole = doc.role || (doc.owner_id === user?.id ? 'OWNER' : null);
              return (
                <motion.button
                  key={doc.id}
                  layout
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ delay: idx * 0.02, type: 'spring', stiffness: 500, damping: 35 }}
                  whileHover={{
                    backgroundColor: isSelected ? undefined : 'rgba(30, 36, 56, 0.5)',
                  }}
                  onClick={() => onSelectDoc(doc)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all group cursor-pointer"
                  style={{
                    background: isSelected ? 'rgba(30, 36, 56, 0.8)' : 'transparent',
                    border: isSelected ? '1px solid rgba(79, 142, 247, 0.25)' : '1px solid transparent',
                    boxShadow: isSelected ? '0 0 15px rgba(79, 142, 247, 0.08), inset 0 1px 0 rgba(255,255,255,0.02)' : 'none',
                  }}
                  aria-label={`Open ${doc.title || 'Untitled'}`}
                  aria-current={isSelected ? 'page' : undefined}
                >
                  <motion.div
                    animate={{
                      background: isSelected
                        ? 'linear-gradient(135deg, #4f8ef7, #9b72f7)'
                        : 'var(--bg-tertiary)',
                    }}
                    className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                  >
                    <FileText size={12} style={{ color: isSelected ? 'white' : 'var(--text-muted)' }} />
                  </motion.div>
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
                </motion.button>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* User Info / Logout */}
      <div
        className="p-3 flex items-center gap-2.5"
        style={{ borderTop: '1px solid rgba(42, 51, 82, 0.3)' }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #4f8ef7, #9b72f7)',
            boxShadow: '0 2px 8px rgba(79, 142, 247, 0.25)',
          }}
        >
          {initials(user?.email || 'User')}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {user?.email || 'Collaborator'}
          </p>
          <p className="text-xs truncate flex items-center gap-1" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#22c55e' }} />
            Online
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: 'rgba(248,113,113,0.1)' }}
          whileTap={{ scale: 0.95 }}
          onClick={onLogout}
          title="Sign Out"
          className="p-1.5 rounded-lg transition-colors cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Sign out"
          id="logout-btn"
        >
          <LogOut size={15} />
        </motion.button>
      </div>
    </motion.aside>
  );
}
