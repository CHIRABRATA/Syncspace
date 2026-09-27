import { useState, useCallback, useRef } from 'react';

export function useDocumentState() {
  // nodes: [{ id, char, position, deleted }]
  const [nodes, setNodes] = useState([]);
  const [aiLog, setAiLog] = useState([]); // SyncBot activity log
  const counterRef = useRef(0);

  // Generate fractional position cleanly without precision blowout
  const generatePosition = useCallback((beforePos, afterPos) => {
    if (beforePos == null && afterPos == null) return 100;
    if (beforePos == null) return afterPos / 2;
    if (afterPos == null) return beforePos + 100;
    return (beforePos + afterPos) / 2;
  }, []);

  // Generate a unique local op ID
  const generateId = useCallback((userId) => {
    counterRef.current += 1;
    return `${userId || 'anon'}_${Date.now()}_${counterRef.current}`;
  }, []);

  // Apply incoming INSERT_OP from server
  const applyInsert = useCallback((op) => {
    setNodes((prev) => {
      if (prev.some((n) => n.id === op.id)) return prev; // idempotent
      const newNode = { id: op.id, char: op.char, position: op.position, deleted: false };
      const insertIdx = prev.findIndex((n) => n.position > op.position);
      if (insertIdx === -1) return [...prev, newNode];
      const next = [...prev];
      next.splice(insertIdx, 0, newNode);
      return next;
    });

    // Track SyncBot activity
    if (op.senderId === 'syncbot-agent-id') {
      setAiLog((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.streaming) {
          return prev.map((e, i) =>
            i === prev.length - 1 ? { ...e, text: e.text + op.char } : e
          );
        }
        return [...prev, { id: op.id, text: op.char, streaming: true, ts: Date.now() }];
      });
    }
  }, []);

  // Apply incoming DELETE_OP from server
  const applyDelete = useCallback((op) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === op.id ? { ...n, deleted: true } : n))
    );
  }, []);

  // Handle INIT_STATE event from server (either raw nodes or text string)
  const applyInitState = useCallback((content, incomingNodes) => {
    if (incomingNodes && Array.isArray(incomingNodes) && incomingNodes.length > 0) {
      const sorted = [...incomingNodes].sort((a, b) => a.position - b.position);
      setNodes(sorted.map((n) => ({ id: n.id, char: n.char, position: n.position, deleted: !!n.deleted })));
      return;
    }

    if (!content) {
      setNodes([]);
      return;
    }

    const built = content.split('').map((char, i) => ({
      id: `init_${i}`,
      char,
      position: (i + 1) * 100,
      deleted: false,
    }));
    setNodes(built);
  }, []);

  // Reset state for new document selection
  const resetState = useCallback(() => {
    setNodes([]);
    setAiLog([]);
  }, []);

  // Dispatch incoming WebSocket op
  const applyOp = useCallback((op) => {
    if (op.type === 'INIT_STATE') applyInitState(op.content, op.nodes);
    else if (op.type === 'INSERT_OP') applyInsert(op);
    else if (op.type === 'DELETE_OP') applyDelete(op);
  }, [applyInitState, applyInsert, applyDelete]);

  // Get plain text
  const getText = useCallback(() => {
    return nodes.filter((n) => !n.deleted).map((n) => n.char).join('');
  }, [nodes]);

  // Get all visible nodes sorted
  const getVisibleNodes = useCallback(() => {
    return nodes.filter((n) => !n.deleted);
  }, [nodes]);

  // Finalize an AI streaming entry
  const finalizeAiStream = useCallback(() => {
    setAiLog((prev) =>
      prev.map((e) => (e.streaming ? { ...e, streaming: false } : e))
    );
  }, []);

  return {
    nodes,
    aiLog,
    applyOp,
    applyInsert,
    applyDelete,
    applyInitState,
    resetState,
    generatePosition,
    generateId,
    getText,
    getVisibleNodes,
    finalizeAiStream,
  };
}

