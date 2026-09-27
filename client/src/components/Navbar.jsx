import { Wifi, WifiOff, Loader2, Bot, Users } from 'lucide-react';

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

  const initials = isSyncBot
    ? '🤖'
    : (email?.slice(0, 2).toUpperCase() || 'U');

  return (
    <div className="relative group" title={isSyncBot ? 'SyncBot AI' : email}>
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

export default function Navbar({ document, status, collaborators = [], syncBotActive = false }) {
  return (
    <header
      className="flex items-center gap-4 px-5 py-3 border-b flex-shrink-0"
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
            {collaborators.length} collaborator{collaborators.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

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
  );
}
