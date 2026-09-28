import { motion, AnimatePresence } from 'framer-motion';
import { Bot } from 'lucide-react';

const AVATAR_COLORS = ['#4f8ef7', '#9b72f7', '#22d3ee', '#f87171', '#fbbf24', '#22c55e', '#fb923c', '#a78bfa'];

function getInitials(email) {
  if (!email || typeof email !== 'string') return 'U';
  return email.length >= 2 ? email.slice(0, 2).toUpperCase() : (email[0]?.toUpperCase() || 'U');
}

function AvatarItem({ email, index = 0, role, isSyncBot = false }) {
  const color = isSyncBot ? '#9b72f7' : AVATAR_COLORS[index % AVATAR_COLORS.length];
  const initials = isSyncBot ? null : getInitials(email);
  const roleEmoji = role === 'OWNER' ? '👑' : role === 'WRITE' ? '✏️' : '👁️';
  const title = isSyncBot ? 'SyncBot AI' : `${email || 'User'} (${role || 'Collaborator'})`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.5, x: -8 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.5, x: 8 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="relative group"
      title={title}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-transform duration-150 hover:scale-110 hover:z-10 cursor-default"
        style={{
          background: isSyncBot
            ? 'linear-gradient(135deg, #9b72f7, #4f8ef7)'
            : `${color}18`,
          color: isSyncBot ? 'white' : color,
          borderColor: `${color}60`,
        }}
      >
        {isSyncBot ? <Bot size={14} /> : initials}
      </div>

      {/* Online indicator */}
      <span
        className="absolute -bottom-0 -right-0 w-2.5 h-2.5 rounded-full border-2"
        style={{
          background: isSyncBot ? 'var(--accent-purple)' : 'var(--accent-green)',
          borderColor: 'var(--bg-secondary)',
        }}
        aria-hidden="true"
      />

      {/* Role indicator */}
      {!isSyncBot && role && (
        <span
          className="absolute -top-0.5 -right-0.5 text-[8px] leading-none"
          aria-hidden="true"
        >
          {roleEmoji}
        </span>
      )}

      {/* Hover tooltip */}
      <div
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150"
        style={{
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}
      >
        {isSyncBot ? 'SyncBot AI' : email}
      </div>
    </motion.div>
  );
}

export default function CollaboratorAvatars({ collaborators = [], syncBotActive = false, maxVisible = 5 }) {
  const visible = collaborators.slice(0, maxVisible);
  const overflow = collaborators.length - maxVisible;

  return (
    <div className="flex items-center -space-x-2" role="group" aria-label="Active collaborators">
      <AnimatePresence mode="popLayout">
        {visible.map((c, i) => (
          <AvatarItem
            key={c.email || c.id || i}
            email={c.email}
            index={i}
            role={c.role}
          />
        ))}

        {syncBotActive && (
          <AvatarItem key="syncbot" isSyncBot email="SyncBot AI" />
        )}
      </AnimatePresence>

      {overflow > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-muted)',
            borderColor: 'var(--border)',
          }}
        >
          +{overflow}
        </motion.div>
      )}
    </div>
  );
}
