import { useRef, useCallback, useEffect } from 'react';
import { Bot, FileText, Sparkles, Lock, Crown, Pencil, Eye } from 'lucide-react';

const SYNCBOT_REGEX = /^@SyncBot\s+(.+)$/im;

export default function Editor({ text, onInsert, onDelete, onAiPrompt, disabled, document, onOpenAiPrompt, docRole }) {
  const textareaRef = useRef(null);
  const selectionRef = useRef({ start: 0, end: 0 });

  const isReadOnly = docRole === 'READ';
  const canEdit = docRole === 'OWNER' || docRole === 'WRITE';
  const isFullyDisabled = disabled || isReadOnly;

  const handleSelect = useCallback(() => {
    if (textareaRef.current) {
      selectionRef.current = {
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd,
      };
    }
  }, []);

  // Preserve cursor position across external/remote updates
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta && window.document.activeElement === ta) {
      const { start, end } = selectionRef.current;
      const safeStart = Math.min(start, text.length);
      const safeEnd = Math.min(end, text.length);
      ta.setSelectionRange(safeStart, safeEnd);
    }
  }, [text]);

  const handleKeyDown = useCallback((e) => {
    if (isFullyDisabled) return;
    const ta = textareaRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;

    // Handle Enter key (including @SyncBot invocation and newlines)
    if (e.key === 'Enter') {
      e.preventDefault();

      // Check if current line contains @SyncBot prompt
      const val = ta.value;
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = val.indexOf('\n', start);
      const currentLine = val.substring(lineStart, lineEnd === -1 ? val.length : lineEnd);
      const match = currentLine.match(SYNCBOT_REGEX);
      if (match) {
        onAiPrompt(match[1].trim());
      }

      if (start !== end) {
        for (let i = end - 1; i >= start; i--) {
          onDelete(i);
        }
      }
      onInsert('\n', start);
      const nextPos = start + 1;
      selectionRef.current = { start: nextPos, end: nextPos };
      requestAnimationFrame(() => {
        if (ta) ta.setSelectionRange(nextPos, nextPos);
      });
      return;
    }

    // Handle Backspace
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (start === end) {
        if (start > 0) {
          onDelete(start - 1);
          const nextPos = start - 1;
          selectionRef.current = { start: nextPos, end: nextPos };
          requestAnimationFrame(() => {
            if (ta) ta.setSelectionRange(nextPos, nextPos);
          });
        }
      } else {
        for (let i = end - 1; i >= start; i--) {
          onDelete(i);
        }
        selectionRef.current = { start, end: start };
        requestAnimationFrame(() => {
          if (ta) ta.setSelectionRange(start, start);
        });
      }
      return;
    }

    // Handle Forward Delete
    if (e.key === 'Delete') {
      e.preventDefault();
      if (start === end) {
        if (start < ta.value.length) {
          onDelete(start);
          selectionRef.current = { start, end: start };
          requestAnimationFrame(() => {
            if (ta) ta.setSelectionRange(start, start);
          });
        }
      } else {
        for (let i = end - 1; i >= start; i--) {
          onDelete(i);
        }
        selectionRef.current = { start, end: start };
        requestAnimationFrame(() => {
          if (ta) ta.setSelectionRange(start, start);
        });
      }
      return;
    }

    // Handle regular printable characters (letters, numbers, symbols, space)
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      if (start !== end) {
        for (let i = end - 1; i >= start; i--) {
          onDelete(i);
        }
      }
      onInsert(e.key, start);
      const nextPos = start + 1;
      selectionRef.current = { start: nextPos, end: nextPos };
      requestAnimationFrame(() => {
        if (ta) ta.setSelectionRange(nextPos, nextPos);
      });
      return;
    }
  }, [isFullyDisabled, onDelete, onInsert, onAiPrompt]);

  const handlePaste = useCallback((e) => {
    if (isFullyDisabled) return;
    e.preventDefault();
    const pasteText = e.clipboardData?.getData('text') || '';
    if (!pasteText) return;

    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;

    if (start !== end) {
      for (let i = end - 1; i >= start; i--) {
        onDelete(i);
      }
    }

    [...pasteText].forEach((char, i) => {
      onInsert(char, start + i);
    });

    const nextPos = start + pasteText.length;
    selectionRef.current = { start: nextPos, end: nextPos };
    requestAnimationFrame(() => {
      if (ta) ta.setSelectionRange(nextPos, nextPos);
    });
  }, [isFullyDisabled, onDelete, onInsert]);

  if (!document) {
    return (
      <main className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center space-y-4 animate-fadeIn">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
          >
            <FileText size={28} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div>
            <h3 className="font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              No document selected
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Pick one from the sidebar or create a new document.
            </p>
          </div>
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs"
            style={{ background: 'rgba(155,114,247,0.08)', color: 'var(--accent-purple)', border: '1px solid rgba(155,114,247,0.2)' }}
          >
            <Bot size={12} />
            <span>Tip: Click <strong>AI Writer</strong> or type <strong>@SyncBot</strong> to write automatically</span>
          </div>
        </div>
      </main>
    );
  }

  // Role indicator for the document paper
  const roleIndicator = () => {
    if (isReadOnly) {
      return (
        <div
          className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}
        >
          <Eye size={12} />
          <span>Read only</span>
        </div>
      );
    }
    if (docRole === 'OWNER') {
      return (
        <div
          className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}
        >
          <Crown size={12} />
          <span>Owner</span>
        </div>
      );
    }
    if (docRole === 'WRITE') {
      return (
        <div
          className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(79,142,247,0.12)', color: '#4f8ef7', border: '1px solid rgba(79,142,247,0.25)' }}
        >
          <Pencil size={12} />
          <span>Can edit</span>
        </div>
      );
    }
    return null;
  };

  return (
    <main
      className="flex-1 overflow-auto p-8 md:p-12 relative"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div
        className="doc-paper max-w-4xl mx-auto min-h-full p-10 md:p-16 rounded-lg relative"
        style={{ minHeight: 'calc(100vh - 140px)' }}
      >
        {/* Role indicator badge */}
        {roleIndicator()}

        {/* @SyncBot hint badge - only show for editable users */}
        {canEdit && (
          <div
            className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium opacity-80 hover:opacity-100 transition-all cursor-pointer select-none"
            style={{ background: 'rgba(155,114,247,0.12)', color: '#9b72f7', border: '1px solid rgba(155,114,247,0.3)' }}
            onClick={() => {
              const ta = textareaRef.current;
              onOpenAiPrompt?.({ cursorIndex: ta ? ta.selectionStart : null });
            }}
            title="Open AI Writer"
          >
            <Sparkles size={12} />
            <span>Ask SyncBot</span>
          </div>
        )}

        {/* Read-only lock indicator at top right for read-only users */}
        {isReadOnly && (
          <div
            className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}
          >
            <Lock size={12} />
            <span>Viewing only</span>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={text}
          onSelect={handleSelect}
          onClick={handleSelect}
          onKeyUp={handleSelect}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          readOnly={isReadOnly}
          disabled={disabled && !isReadOnly}
          className="w-full h-full resize-none outline-none bg-transparent editor-font"
          style={{
            color: '#1a1a2e',
            fontSize: '16px',
            lineHeight: '1.8',
            minHeight: 'calc(100vh - 200px)',
            caretColor: isReadOnly ? 'transparent' : '#4f8ef7',
            cursor: isReadOnly ? 'default' : (disabled ? 'not-allowed' : 'text'),
            userSelect: isReadOnly ? 'text' : undefined,
          }}
          placeholder={isReadOnly
            ? 'This document is read-only. You can view and download, but not edit.'
            : "Start typing here...\n\nTip: Click the 'AI Writer' button in the toolbar to automatically generate text inside this document!"
          }
          spellCheck={!isReadOnly}
        />

        {/* Floating AI Prompt Button at bottom right of document paper - only for editors */}
        {canEdit && (
          <button
            onClick={() => {
              const ta = textareaRef.current;
              onOpenAiPrompt?.({ cursorIndex: ta ? ta.selectionStart : null });
            }}
            className="absolute bottom-6 right-6 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-white shadow-xl transition-all hover:scale-105 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #4f8ef7, #9b72f7)',
              boxShadow: '0 4px 15px rgba(155, 114, 247, 0.4)',
            }}
            title="Ask AI to write into this document"
          >
            <Sparkles size={13} />
            <span>Ask AI to Write</span>
          </button>
        )}
      </div>
    </main>
  );
}
