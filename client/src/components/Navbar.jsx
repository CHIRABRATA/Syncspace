import { useState } from 'react';
import { Wifi, WifiOff, Loader2, Bot, Users, Share2, Copy, Check, Mail, X, Sparkles } from 'lucide-react';
import { api } from '../lib/api';


function StatusBadge({ status }) {
  const configs = {
    connected: { icon: Wifi, label: 'Connected', color: 'var(--accent-green)', bg: 'rgba(34,197,94,0.12)' },
    connecting: { icon: Loader2, label: 'Connecting...', color: 'var(--accent-amber)', bg: 'rgba(251,191,36,0.12)' },
    disconnected: { icon: WifiOff, label: 'Disconnected', color: 'var(--accent-red)', bg: 'rgba(248,113,113,0.12)' },
  };
  const cfg = configs[status] || configs.disconnected;
  const Icon = cfg.icon;

  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <Icon size={12} className={status === 'connecting' ? 'animate-spin' : ''} />
      <span className="hidden sm:inline">{cfg.label}</span>
    </div>
  );
}

function CollaboratorAvatar({ email, isSyncBot = false, index = 0 }) {
  const colors = ['#4f8ef7', '#9b72f7', '#22d3ee', '#f87171', '#fbbf24', '#22c55e'];
  const color = isSyncBot ? '#9b72f7' : colors[index % colors.length];

  const emailStr = typeof email === 'string' ? email : (email?.email || '');
  const initials = isSyncBot
    ? '🤖'
    : (emailStr.length >= 2 ? emailStr.slice(0, 2).toUpperCase() : (emailStr[0]?.toUpperCase() || 'U'));

  return (
    <div className="relative group" title={isSyncBot ? 'SyncBot AI' : emailStr}>

      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-transform hover:scale-110"
        style={{
          background: isSyncBot
            ? 'linear-gradient(135deg, #9b72f7, #4f8ef7)'
            : `${color}22`,
          color: isSyncBot ? 'white' : color,
          borderColor: color,
          fontSize: isSyncBot ? '14px' : undefined,
        }}
      >
        {isSyncBot ? <Bot size={14} /> : initials}
      </div>
      {isSyncBot && (
        <span
          className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full pulse-dot border"
          style={{ background: 'var(--accent-purple)', borderColor: 'var(--bg-secondary)' }}
        />
      )}
    </div>
  );
}

export default function Navbar({ document, status, collaborators = [], syncBotActive = false, onOpenAiPrompt }) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [shareMsg, setShareMsg] = useState(null);

  const shareUrl = document ? `${window.location.origin}/?doc=${document.id}` : '';

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyId = () => {
    if (!document?.id) return;
    navigator.clipboard.writeText(document.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !document?.id) return;
    setInviting(true);
    setShareMsg(null);
    try {
      const res = await api.shareDocument(document.id, inviteEmail.trim());
      setShareMsg({ type: 'success', text: res.message || 'Shared successfully!' });
      setInviteEmail('');
    } catch (err) {
      setShareMsg({ type: 'error', text: err.message || 'Failed to share document' });
    } finally {
      setInviting(false);
    }
  };

  return (
    <>
      <header
        className="flex items-center gap-3 px-5 py-3 border-b flex-shrink-0"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        {/* Document Title */}
        <div className="flex-1 min-w-0">
          <h2
            className="font-semibold truncate"
            style={{ color: 'var(--text-primary)', fontSize: '15px' }}
          >
            {document?.title || 'Select a document'}
          </h2>
          {document && (
            <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--text-muted)' }}>
              <Users size={10} />
              {collaborators.length > 0 ? `${collaborators.length} collaborator${collaborators.length !== 1 ? 's' : ''}` : 'Ready for live collaboration'}
            </p>
          )}
        </div>

        {/* Dedicated AI Agent Writer Button */}
        {document && (
          <button
            onClick={onOpenAiPrompt}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all shadow-sm hover:opacity-95 hover:scale-[1.02] cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #4f8ef7, #9b72f7)',
              boxShadow: '0 2px 10px rgba(155, 114, 247, 0.35)',
            }}
            title="Ask AI to write into this document"
          >
            <Sparkles size={13} className={syncBotActive ? 'animate-spin' : ''} />
            <span>AI Writer</span>
          </button>
        )}

        {/* Share Button (Active when document is selected) */}
        {document && (
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--accent-blue)',
              border: '1px solid var(--border)',
            }}
          >
            <Share2 size={13} />
            <span>Share</span>
          </button>
        )}


        {/* Collaborator Avatars */}
        {collaborators.length > 0 && (
          <div className="flex items-center -space-x-2">
            {collaborators.slice(0, 5).map((c, i) => (
              <CollaboratorAvatar key={c.email || i} email={c.email} index={i} />
            ))}
            {collaborators.length > 5 && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', borderColor: 'var(--border)' }}
              >
                +{collaborators.length - 5}
              </div>
            )}
          </div>
        )}

        {/* SyncBot Avatar (when active) */}
        {syncBotActive && (
          <div className="flex items-center gap-1.5">
            <CollaboratorAvatar isSyncBot email="SyncBot AI" />
            <span className="text-xs ai-shimmer font-medium hidden sm:inline">SyncBot typing...</span>
          </div>
        )}

        {/* Connection Status */}
        <StatusBadge status={status} />
      </header>

      {/* Share / Collaboration Modal */}
      {showShareModal && document && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div
            className="w-full max-w-md rounded-2xl p-6 border shadow-2xl relative animate-scaleIn"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <button
              onClick={() => { setShowShareModal(false); setShareMsg(null); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Share2 size={18} style={{ color: 'var(--accent-blue)' }} />
              <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                Share "{document.title}"
              </h3>
            </div>

            <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
              Anyone with this link or document ID can join and edit simultaneously in real time.
            </p>

            {/* Share Link */}
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Direct Share Link
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="input-field py-2 flex-1 text-xs truncate select-all"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all"
                  style={{
                    background: copiedLink ? 'var(--accent-green)' : 'var(--accent-blue)',
                    color: 'white',
                  }}
                >
                  {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Document ID */}
            <div className="mb-5">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Document UUID
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={document.id}
                  className="input-field py-2 flex-1 font-mono text-xs select-all"
                />
                <button
                  onClick={handleCopyId}
                  className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: copiedId ? 'var(--accent-green)' : 'var(--text-primary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {copiedId ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedId ? 'Copied!' : 'Copy ID'}</span>
                </button>
              </div>
            </div>

            {/* Invite by Email */}
            <div className="pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Invite Collaborator by Email
              </label>
              <form onSubmit={handleInvite} className="flex gap-2">
                <input
                  type="email"
                  placeholder="collaborator@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="input-field py-2 flex-1 text-xs"
                />
                <button
                  type="submit"
                  disabled={!inviteEmail.trim() || inviting}
                  className="px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5"
                  style={{
                    background: 'linear-gradient(135deg, #4f8ef7, #9b72f7)',
                    color: 'white',
                    opacity: !inviteEmail.trim() || inviting ? 0.6 : 1,
                  }}
                >
                  {inviting ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                  <span>Invite</span>
                </button>
              </form>

              {shareMsg && (
                <p
                  className="text-xs mt-2.5"
                  style={{
                    color: shareMsg.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)',
                  }}
                >
                  {shareMsg.text}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
