import { useRef, useCallback, useEffect } from 'react';
import { Bot, FileText } from 'lucide-react';

const SYNCBOT_REGEX = /^@SyncBot\s+(.+)$/im;

export default function Editor({ text, onInsert, onDelete, onAiPrompt, disabled, document }) {
  const textareaRef = useRef(null);
  // Track previous text to compute diffs
  const prevTextRef = useRef(text);
  // Track node positions for accurate CRDT ops
  const nodesRef = useRef([]);

  // Keep prevText in sync when text changes from outside (remote ops)
  useEffect(() => {
    prevTextRef.current = text;
  }, [text]);

  const handleKeyDown = useCallback((e) => {
    if (disabled) return;

    const ta = textareaRef.current;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;

    if (e.key === 'Backspace') {
      if (start === end && start > 0) {
        // Single char delete
        e.preventDefault();
        onDelete(start - 1);
      } else if (start !== end) {
        // Range delete - delete from end to start
        e.preventDefault();
        for (let i = end - 1; i >= start; i--) {
          onDelete(i);
        }
      }
    }
  }, [disabled, onDelete]);

  const handleKeyPress = useCallback((e) => {
    if (disabled || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length !== 1) return; // Ignore control keys

    e.preventDefault();
    const ta = textareaRef.current;
    const pos = ta.selectionStart;

    onInsert(e.key, pos);

    // Move caret forward
    requestAnimationFrame(() => {
      if (ta) {
        ta.selectionStart = pos + 1;
        ta.selectionEnd = pos + 1;
      }
    });
  }, [disabled, onInsert]);

  const handlePaste = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    const pasteText = e.clipboardData.getData('text');
    const ta = textareaRef.current;
    const pos = ta.selectionStart;
    [...pasteText].forEach((char, i) => {
      onInsert(char, pos + i);
    });
  }, [disabled, onInsert]);

  // Detect @SyncBot trigger on Enter
  const handleKeyUp = useCallback((e) => {
    if (e.key !== 'Enter') return;
    const ta = textareaRef.current;
    const val = ta.value;
    const lines = val.split('\n');
    for (const line of lines) {
      const match = line.match(SYNCBOT_REGEX);
      if (match) {
        onAiPrompt(match[1].trim());
        break;
      }
    }
  }, [onAiPrompt]);

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
            <span>Tip: Type <strong>@SyncBot [prompt]</strong> and press Enter to invoke AI</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="flex-1 overflow-auto p-8 md:p-12"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div
        className="doc-paper max-w-4xl mx-auto min-h-full p-10 md:p-16 rounded-lg relative"
        style={{ minHeight: 'calc(100vh - 140px)' }}
      >
        {/* @SyncBot hint badge */}
        <div
          className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs opacity-60 hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(155,114,247,0.12)', color: '#9b72f7', border: '1px solid rgba(155,114,247,0.2)' }}
        >
          <Bot size={11} />
          <span>@SyncBot</span>
        </div>

        <textarea
          ref={textareaRef}
          value={text}
          readOnly // We handle all input via keyDown/keyPress
          onKeyDown={handleKeyDown}
          onKeyPress={handleKeyPress}
          onKeyUp={handleKeyUp}
          onPaste={handlePaste}
          disabled={disabled}
          className="w-full h-full resize-none outline-none bg-transparent editor-font"
          style={{
            color: '#1a1a2e',
            fontSize: '16px',
            lineHeight: '1.8',
            minHeight: 'calc(100vh - 200px)',
            caretColor: '#4f8ef7',
            cursor: disabled ? 'not-allowed' : 'text',
          }}
          placeholder="Start typing here...&#10;&#10;Tip: Type @SyncBot followed by a prompt and press Enter to summon the AI collaborator."
          spellCheck
        />
      </div>
    </main>
  );
}
