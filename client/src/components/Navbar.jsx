import { useState } from 'react';
import {
  Wifi, WifiOff, Loader2, Bot, Users, Share2, Sparkles,
  Download, Crown, Pencil, Eye
} from 'lucide-react';
import ShareModal from './ShareModal';
import DownloadMenu from './DownloadMenu';

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

function RoleBadge({ role }) {
  const configs = {
    OWNER: { icon: Crown, label: 'Owner', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
    WRITE: { icon: Pencil, label: 'Can edit', color: '#4f8ef7', bg: 'rgba(79,142,247,0.12)' },
    READ: { icon: Eye, label: 'Read only', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  };
  const cfg = configs[role] || configs.READ;
  const Icon = cfg.icon;

  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <Icon size={12} />
      <span className="hidden sm:inline">{cfg.label}</span>
    </div>
  );
}

function CollaboratorAvatar({ email, isSyncBot = false, index = 0, role }) {
  const colors = ['#4f8ef7', '#9b72f7', '#22d3ee', '#f87171', '#fbbf24', '#22c55e'];
  const color = isSyncBot ? '#9b72f7' : colors[index % colors.length];

  const emailStr = typeof email === 'string' ? email : (email?.email || '');
  const initials = isSyncBot
    ? '🤖'
    : (emailStr.length >= 2 ? emailStr.slice(0, 2).toUpperCase() : (emailStr[0]?.toUpperCase() || 'U'));

  const roleLabel = role === 'OWNER' ? '👑' : role === 'WRITE' ? '✏️' : '👁️';
  const titleText = isSyncBot ? 'SyncBot AI' : `${emailStr} (${role || 'Collaborator'})`;

  return (
    <div className="relative group" title={titleText}>
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
      {/* Role indicator dot */}
      {!isSyncBot && role && (
        <span
          className="absolute -bottom-0.5 -right-0.5 text-xs leading-none"
          style={{ fontSize: '8px' }}
        >
          {roleLabel}
        </span>
      )}
    </div>
  );
}

export default function Navbar({ document, status, collaborators = [], syncBotActive = false, onOpenAiPrompt, docRole, currentUserId, getText }) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const isOwner = docRole === 'OWNER';
  const canEdit = docRole === 'OWNER' || docRole === 'WRITE';

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

        {/* Role Badge */}
        {document && docRole && (
          <RoleBadge role={docRole} />
        )}

        {/* Dedicated AI Agent Writer Button - only for WRITE/OWNER */}
        {document && canEdit && (
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

        {/* Download Button - available to all with access */}
        {document && (
          <div className="relative">
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              <Download size={13} />
              <span className="hidden sm:inline">Download</span>
            </button>
            {showDownloadMenu && (
              <DownloadMenu
                document={document}
                getText={getText}
                onClose={() => setShowDownloadMenu(false)}
              />
            )}
          </div>
        )}

        {/* Share Button (Only for OWNER) */}
        {document && isOwner && (
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
              <CollaboratorAvatar key={c.email || i} email={c.email} index={i} role={c.role} />
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

      {/* Share Modal */}
      {showShareModal && document && (
        <ShareModal
          document={document}
          currentUserId={currentUserId}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  );
}
