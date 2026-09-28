import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, FileText, Sparkles, Lock, Copy, Check, FileCheck } from 'lucide-react';
import PermissionBadge from './PermissionBadge';
import SyncBotOrb from './SyncBotOrb';

const SYNCBOT_REGEX = /^@SyncBot\s+(.+)$/im;

export default function Editor({
  text = '',
  nodes = [],
  syncBotActive = false,
  onInsert,
  onDelete,
  onAiPrompt,
  disabled,
  document,
  onOpenAiPrompt,
  docRole,
}) {
  const textareaRef = useRef(null);
  const mirrorRef = useRef(null);
  const selectionRef = useRef({ start: 0, end: 0 });
  const [copied, setCopied] = useState(false);

  const isReadOnly = docRole === 'READ';
  const canEdit = docRole === 'OWNER' || docRole === 'WRITE';
  const isFullyDisabled = disabled || isReadOnly;

  // Track selection
  const handleSelect = useCallback(() => {
    if (textareaRef.current) {
      selectionRef.current = {
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd,
      };
    }
  }, []);

  // Sync scrolling between textarea and mirror overlay
  const handleScroll = useCallback((e) => {
    if (mirrorRef.current) {
      mirrorRef.current.scrollTop = e.target.scrollTop;
      mirrorRef.current.scrollLeft = e.target.scrollLeft;
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

  // Keyboard operations
  const handleKeyDown = useCallback((e) => {
    if (isFullyDisabled) return;
    const ta = textareaRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;

    // Handle Enter key (including @SyncBot invocation and newlines)
    if (e.key === 'Enter') {
      e.preventDefault();

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

    // Handle regular printable characters
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

  // Copy full document text
  const handleCopyText = useCallback(() => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  // Calculate statistics
  const stats = useMemo(() => {
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return { chars, words };
  }, [text]);

  // Visible nodes for SyncBot highlight presentation layer
  const visibleNodes = useMemo(() => {
    return nodes.filter((n) => !n.deleted);
  }, [nodes]);

  const hasRecentSyncBotNodes = useMemo(() => {
    const now = Date.now();
    return visibleNodes.some((n) => n.fromSyncBot && now - (n.ts || 0) < 3000);
  }, [visibleNodes]);

  // Empty state when no document is selected
  if (!document) {
    return (
      <main className="flex-1 flex items-center justify-center relative z-10" style={{ background: 'transparent' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-center space-y-4 max-w-sm px-6"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
            style={{
              background: 'rgba(30, 36, 56, 0.6)',
              border: '1px solid rgba(42, 51, 82, 0.4)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <FileText size={28} style={{ color: 'var(--text-muted)' }} />
          </motion.div>
          <div>
            <h3 className="font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              No document selected
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Pick one from the sidebar or create a new document to begin real-time collaboration.
            </p>
          </div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs"
            style={{
              background: 'rgba(155,114,247,0.08)',
              color: 'var(--accent-purple)',
              border: '1px solid rgba(155,114,247,0.2)',
            }}
          >
            <Bot size={12} />
            <span>Tip: Click <strong>AI Writer</strong> or type <strong>@SyncBot</strong> to write with AI</span>
          </motion.div>
        </motion.div>
      </main>
    );
  }

  return (
    <main
      className="flex-1 overflow-auto p-6 md:p-10 relative z-10"
      style={{ background: 'transparent' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="doc-paper max-w-4xl mx-auto min-h-full p-8 md:p-14 rounded-xl relative shadow-2xl"
        style={{ minHeight: 'calc(100vh - 130px)' }}
      >
        {/* Role indicator badge */}
        <div className="absolute top-4 left-4 z-20">
          <AnimatePresence>
            {docRole && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <PermissionBadge role={docRole} size="small" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SyncBot / AI summon trigger button - only for users with edit access */}
        {canEdit && (
          <motion.div
            whileHover={{ scale: 1.04, opacity: 1 }}
            className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium opacity-80 hover:opacity-100 cursor-pointer select-none transition-all"
            style={{
              background: syncBotActive ? 'rgba(34,211,238,0.15)' : 'rgba(155,114,247,0.1)',
              color: syncBotActive ? '#22d3ee' : '#9b72f7',
              border: `1px solid ${syncBotActive ? 'rgba(34,211,238,0.35)' : 'rgba(155,114,247,0.25)'}`,
            }}
            onClick={() => {
              const ta = textareaRef.current;
              onOpenAiPrompt?.({ cursorIndex: ta ? ta.selectionStart : null });
            }}
            title="Open AI Writer"
            role="button"
            tabIndex={0}
            aria-label="Open AI Writer"
          >
            {syncBotActive ? (
              <SyncBotOrb active size={14} />
            ) : (
              <Sparkles size={12} />
            )}
            <span>{syncBotActive ? 'SyncBot Writing...' : 'Ask SyncBot'}</span>
          </motion.div>
        )}

        {/* Read-only lock badge */}
        {isReadOnly && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}
          >
            <Lock size={12} />
            <span>Viewing only</span>
          </motion.div>
        )}

        {/* Editor Container with Mirror Highlight Layer */}
        <div className="relative w-full mt-4" style={{ minHeight: 'calc(100vh - 220px)' }}>
          {/* Visual Presentation Layer: SyncBot Character Insertion Glow */}
          {(syncBotActive || hasRecentSyncBotNodes) && (
            <div
              ref={mirrorRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 select-none overflow-hidden"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '16px',
                lineHeight: '1.8',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                padding: '0px',
                margin: '0px',
                border: 'none',
                color: 'transparent',
                zIndex: 5,
              }}
            >
              {visibleNodes.map((node) => {
                const isFresh = node.fromSyncBot && (Date.now() - (node.ts || 0) < 1800);
                return (
                  <span
                    key={node.id}
                    className={isFresh ? 'syncbot-highlight' : undefined}
                  >
                    {node.char}
                  </span>
                );
              })}
            </div>
          )}

          {/* Core Textarea - Always responsive and unblocked */}
          <textarea
            ref={textareaRef}
            value={text}
            onScroll={handleScroll}
            onSelect={handleSelect}
            onClick={handleSelect}
            onKeyUp={handleSelect}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            readOnly={isReadOnly}
            disabled={disabled && !isReadOnly}
            className="w-full h-full resize-none outline-none bg-transparent relative z-10"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: '#1a1a2e',
              fontSize: '16px',
              lineHeight: '1.8',
              minHeight: 'calc(100vh - 220px)',
              caretColor: isReadOnly ? 'transparent' : '#4f8ef7',
              cursor: isReadOnly ? 'default' : (disabled ? 'not-allowed' : 'text'),
              userSelect: isReadOnly ? 'text' : undefined,
              padding: '0px',
              margin: '0px',
              border: 'none',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
            placeholder={
              isReadOnly
                ? 'This document is read-only. You can view and download, but not edit.'
                : "Start typing here...\n\nTip: Click 'Ask SyncBot' or type '@SyncBot <prompt>' to automatically generate content!"
            }
            spellCheck={!isReadOnly}
            aria-label="Document editor"
            id="document-editor"
          />
        </div>

        {/* Floating Glassmorphism Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 rounded-2xl select-none"
          style={{
            background: 'rgba(15, 20, 35, 0.78)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45), 0 0 20px rgba(155, 114, 247, 0.15)',
          }}
          role="toolbar"
          aria-label="Editor controls"
        >
          {/* Document stats */}
          <div className="flex items-center gap-2 text-xs font-mono pr-2 border-r" style={{ color: 'var(--text-muted)', borderColor: 'rgba(255,255,255,0.08)' }}>
            <span>{stats.words} words</span>
            <span>·</span>
            <span>{stats.chars} chars</span>
          </div>

          {/* Quick copy text */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopyText}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors"
            style={{
              background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
              color: copied ? '#22c55e' : 'var(--text-secondary)',
              border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.05)'}`,
            }}
            title="Copy document text"
            aria-label="Copy document text"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </motion.button>

          {/* Ask AI Writer Button (only when editable) */}
          {canEdit && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const ta = textareaRef.current;
                onOpenAiPrompt?.({ cursorIndex: ta ? ta.selectionStart : null });
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-white cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #4f8ef7, #9b72f7)',
                boxShadow: syncBotActive
                  ? '0 0 15px rgba(155, 114, 247, 0.6), 0 0 25px rgba(34, 211, 238, 0.3)'
                  : '0 2px 8px rgba(155, 114, 247, 0.35)',
              }}
              title="Ask AI to write into this document"
              aria-label="Ask AI to write"
              id="toolbar-ai-btn"
            >
              {syncBotActive ? (
                <SyncBotOrb active size={14} />
              ) : (
                <Sparkles size={12} />
              )}
              <span>{syncBotActive ? 'Writing...' : 'Ask AI'}</span>
            </motion.button>
          )}

          {/* Read only tag */}
          {isReadOnly && (
            <div className="flex items-center gap-1 text-xs" style={{ color: '#22c55e' }}>
              <Lock size={11} />
              <span>Read only</span>
            </div>
          )}
        </motion.div>
      </motion.div>
    </main>
  );
}
