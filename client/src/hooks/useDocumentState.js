import { useState, useCallback, useRef } from 'react';

const POSITION_START = 0;
const POSITION_END = 1e9;

export function useDocumentState() {
  // nodes: [{ id, char, position, deleted }]
  const [nodes, setNodes] = useState([]);
  const [aiLog, setAiLog] = useState([]); // SyncBot activity log
  const counterRef = useRef(0);

  // Generate a new unique position between two positions
  const generatePosition = useCallback((after = POSITION_START, before = POSITION_END) => {
    return (after + before) / 2;
  }, []);

  // Generate a unique local op ID
  const generateId = useCallback((userId) => {
    counterRef.current += 1;
    return `${userId}_${Date.now()}_${counterRef.current}`;
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

  // Handle INIT_STATE event by rebuilding nodes from content string
  const applyInitState = useCallback((content) => {
    if (!content) {
      setNodes([]);
      return;
    }
    const built = content.split('').map((char, i) => ({
      id: `init_${i}`,
      char,
      position: i + 1,
      deleted: false,
    }));
    setNodes(built);
  }, []);

  // Dispatch incoming WebSocket op
  const applyOp = useCallback((op) => {
    if (op.type === 'INIT_STATE') applyInitState(op.content);
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
    generatePosition,
    generateId,
    getText,
    getVisibleNodes,
    finalizeAiStream,
    POSITION_START,
    POSITION_END,
  };
}
