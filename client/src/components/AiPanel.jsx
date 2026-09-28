import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import SyncBotOrb from './SyncBotOrb';

export default function AiPanel({ aiLog, onClose, syncBotActive = false }) {
  if (aiLog.length === 0) return null;

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 288, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex-shrink-0 flex flex-col overflow-hidden relative z-10"
      style={{
        background: 'rgba(22, 27, 39, 0.85)',
        backdropFilter: 'blur(20px) saturate(1.3)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
        borderLeft: '1px solid rgba(42, 51, 82, 0.4)',
      }}
      role="complementary"
      aria-label="SyncBot AI panel"
    >
      {/* Panel Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3.5"
        style={{ borderBottom: '1px solid rgba(42, 51, 82, 0.3)' }}
      >
        <SyncBotOrb active={syncBotActive} size={28} />
        <div className="flex-1 ml-1">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>SyncBot AI</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Agentic AI Peer</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.06)' }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors cursor-pointer"
          aria-label="Close AI panel"
        >
          <X size={14} style={{ color: 'var(--text-muted)' }} />
        </motion.button>
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <AnimatePresence>
          {aiLog.map((entry, i) => (
            <motion.div
              key={entry.id || i}
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="rounded-xl p-3"
              style={{
                background: 'rgba(30, 36, 56, 0.6)',
                border: '1px solid rgba(42, 51, 82, 0.3)',
                boxShadow: entry.streaming ? '0 0 12px rgba(155,114,247,0.1)' : 'none',
              }}
            >
              {/* Entry header */}
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles size={11} style={{ color: 'var(--accent-purple)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--accent-purple)' }}>
                  SyncBot Response
                </span>
                {entry.streaming && (
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className="ml-auto flex items-center gap-1 text-xs"
                    style={{ color: 'var(--accent-cyan)' }}
                  >
                    <span>●</span>
                    <span>streaming</span>
                  </motion.span>
                )}
              </div>

              {/* Text content */}
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
                {entry.text}
                {entry.streaming && (
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="inline-block w-1.5 h-3 ml-0.5 rounded-sm"
                    style={{ background: 'var(--accent-cyan)' }}
                  />
                )}
              </p>

              {/* Timestamp */}
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                {new Date(entry.ts).toLocaleTimeString()}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* @SyncBot hint */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(42, 51, 82, 0.3)' }}>
        <div
          className="rounded-lg p-2.5 text-xs"
          style={{ background: 'rgba(155,114,247,0.06)', border: '1px solid rgba(155,114,247,0.15)' }}
        >
          <span style={{ color: 'var(--accent-purple)' }}>@SyncBot</span>
          <span style={{ color: 'var(--text-muted)' }}> trigger in editor to summon AI</span>
        </div>
      </div>
    </motion.aside>
  );
}
