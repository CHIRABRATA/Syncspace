import { useState, useRef, useEffect } from 'react';
import { Bot, Sparkles, Send, X, ArrowDownRight, CornerDownLeft } from 'lucide-react';

const PRESETS = [
  { label: '📝 Introduction', prompt: 'Write a comprehensive and engaging introduction for this document.' },
  { label: '📋 Summary', prompt: 'Summarize the core takeaways and main ideas of this document in bullet points.' },
  { label: '💡 Elaborate', prompt: 'Expand upon the ideas in this document with detailed explanations and real-world examples.' },
  { label: '📌 Action Items', prompt: 'Generate a structured list of actionable next steps, deadlines, and responsibilities.' },
  { label: '✨ Conclusion', prompt: 'Write a strong closing summary and concluding thoughts for this document.' },
];

export default function AiPromptModal({ isOpen, onClose, onSubmit, isWriting = false }) {
  const [prompt, setPrompt] = useState('');
  const [insertMode, setInsertMode] = useState('end'); // 'end' | 'cursor'
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setPrompt('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!prompt.trim() || isWriting) return;
    onSubmit(prompt.trim(), insertMode);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(5, 7, 15, 0.75)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-xl rounded-2xl border p-6 shadow-2xl animate-scaleIn relative overflow-hidden"
        style={{
          background: 'var(--bg-card, #121526)',
          borderColor: 'var(--border, #2a2f45)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(155, 114, 247, 0.15)',
        }}
      >
        {/* Glow ambient background effect */}
        <div
          className="absolute -top-24 -right-24 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(155, 114, 247, 0.25) 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(79, 142, 247, 0.2) 0%, transparent 70%)' }}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
            style={{ background: 'linear-gradient(135deg, #4f8ef7, #9b72f7)' }}
          >
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary, #ffffff)' }}>
              SyncBot AI Writer
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider" style={{ background: 'rgba(155, 114, 247, 0.18)', color: '#b794f6' }}>
                Automated
              </span>
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-muted, #8b949e)' }}>
              Instruct the AI what to write, and watch it draft directly inside the document.
            </p>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="mb-3">
          <p className="text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-muted, #8b949e)' }}>
            Quick Presets
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setPrompt(p.prompt)}
                className="text-xs px-2.5 py-1 rounded-lg transition-all"
                style={{
                  background: prompt === p.prompt ? 'rgba(155, 114, 247, 0.2)' : 'var(--bg-tertiary, #1a1e36)',
                  color: prompt === p.prompt ? '#b794f6' : 'var(--text-secondary, #cbd5e1)',
                  border: prompt === p.prompt ? '1px solid rgba(155, 114, 247, 0.4)' : '1px solid var(--border-subtle, #252a40)',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt Input Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <textarea
              ref={inputRef}
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Write a 3-paragraph executive summary highlighting our quarterly goals and milestones..."
              className="w-full rounded-xl p-3.5 text-sm resize-none outline-none transition-all"
              style={{
                background: 'var(--bg-primary, #0c0e1a)',
                color: 'var(--text-primary, #ffffff)',
                border: '1px solid var(--border, #2a2f45)',
                lineHeight: '1.6',
              }}
            />
          </div>

          {/* Insert Placement Toggle */}
          <div className="flex items-center justify-between text-xs px-1">
            <span style={{ color: 'var(--text-muted, #8b949e)' }}>Write destination:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setInsertMode('end')}
                className="px-2.5 py-1 rounded-md transition-all text-xs font-medium"
                style={{
                  background: insertMode === 'end' ? 'rgba(79, 142, 247, 0.2)' : 'transparent',
                  color: insertMode === 'end' ? '#4f8ef7' : 'var(--text-muted, #8b949e)',
                  border: insertMode === 'end' ? '1px solid rgba(79, 142, 247, 0.3)' : '1px solid transparent',
                }}
              >
                End of document
              </button>
              <button
                type="button"
                onClick={() => setInsertMode('cursor')}
                className="px-2.5 py-1 rounded-md transition-all text-xs font-medium"
                style={{
                  background: insertMode === 'cursor' ? 'rgba(79, 142, 247, 0.2)' : 'transparent',
                  color: insertMode === 'cursor' ? '#4f8ef7' : 'var(--text-muted, #8b949e)',
                  border: insertMode === 'cursor' ? '1px solid rgba(79, 142, 247, 0.3)' : '1px solid transparent',
                }}
              >
                Current cursor position
              </button>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--text-muted, #8b949e)' }}>
              Press <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px]">Ctrl+Enter</kbd> to write
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-xs font-medium transition-colors hover:bg-white/5"
                style={{ color: 'var(--text-secondary, #cbd5e1)' }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!prompt.trim() || isWriting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-lg cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #4f8ef7, #9b72f7)',
                  opacity: !prompt.trim() || isWriting ? 0.5 : 1,
                  boxShadow: '0 4px 15px rgba(155, 114, 247, 0.4)',
                }}
              >
                <Sparkles size={14} />
                <span>{isWriting ? 'Writing...' : 'Write into Document'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
