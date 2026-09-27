import { Bot, Sparkles, X } from 'lucide-react';

export default function AiPanel({ aiLog, onClose }) {
  if (aiLog.length === 0) return null;

  return (
    <aside
      className="w-72 flex-shrink-0 flex flex-col border-l animate-slideIn"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
    >
      {/* Panel Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3.5 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #9b72f7, #4f8ef7)' }}
        >
          <Bot size={14} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>SyncBot AI</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Agentic AI Peer</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg transition-colors hover:bg-white/5"
        >
          <X size={14} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {aiLog.map((entry, i) => (
          <div
            key={entry.id || i}
            className="rounded-xl p-3 animate-fadeIn"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {/* Entry header */}
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles size={11} style={{ color: 'var(--accent-purple)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--accent-purple)' }}>
                SyncBot Response
              </span>
              {entry.streaming && (
                <span className="ml-auto flex items-center gap-1 text-xs" style={{ color: 'var(--accent-cyan)' }}>
                  <span className="syncbot-cursor">●</span>
                  <span>streaming</span>
                </span>
              )}
            </div>

            {/* Text content */}
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
              {entry.text}
              {entry.streaming && (
                <span className="inline-block w-1.5 h-3 ml-0.5 syncbot-cursor rounded-sm" style={{ background: 'var(--accent-cyan)' }} />
              )}
            </p>

            {/* Timestamp */}
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
              {new Date(entry.ts).toLocaleTimeString()}
            </p>
          </div>
        ))}
      </div>

      {/* @SyncBot hint */}
      <div
        className="p-3 border-t"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div
          className="rounded-lg p-2.5 text-xs"
          style={{ background: 'rgba(155,114,247,0.08)', border: '1px solid rgba(155,114,247,0.2)' }}
        >
          <span style={{ color: 'var(--accent-purple)' }}>@SyncBot</span>
          <span style={{ color: 'var(--text-muted)' }}> trigger in editor to summon AI</span>
        </div>
      </div>
    </aside>
  );
}
