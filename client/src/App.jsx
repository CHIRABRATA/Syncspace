import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useDocumentState } from './hooks/useDocumentState';
import { api } from './lib/api';
import AuthModal from './components/AuthModal';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Editor from './components/Editor';
import AiPanel from './components/AiPanel';
import './index.css';

export default function App() {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('syncspace_token');
    const user = localStorage.getItem('syncspace_user');
    return token ? { token, user: user ? JSON.parse(user) : null } : null;
  });

  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [collaborators] = useState([]);
  const [syncBotActive, setSyncBotActive] = useState(false);

  const {
    nodes,
    aiLog,
    applyOp,
    generateId,
    generatePosition,
    getText,
    POSITION_START,
    POSITION_END,
  } = useDocumentState();

  // Handle incoming WebSocket operations
  const handleOp = useCallback((op) => {
    if (op.type === 'INSERT_OP' && op.senderId === 'syncbot-agent-id') {
      setSyncBotActive(true);
      setShowAiPanel(true);
      
      clearTimeout(window._syncbotTimer);
      window._syncbotTimer = setTimeout(() => setSyncBotActive(false), 3000);
    }
    applyOp(op);
  }, [applyOp]);

  // Keep a stable ref to handleOp so useWebSocket doesn't reconnect on state changes
  const handleOpRef = useRef(handleOp);
  useEffect(() => {
    handleOpRef.current = handleOp;
  }, [handleOp]);

  const stableOnOp = useCallback((op) => {
    if (handleOpRef.current) {
      handleOpRef.current(op);
    }
  }, []);

  const { status, send } = useWebSocket({
    token: auth?.token,
    documentId: selectedDoc?.id,
    onOp: stableOnOp,
  });

  // Fetch documents on auth and handle ?doc=<id> URL parameter
  useEffect(() => {
    if (!auth) return;

    const urlParams = new URLSearchParams(window.location.search);
    const targetDocId = urlParams.get('doc');

    api.getDocuments()
      .then(async (data) => {
        let docList = Array.isArray(data) ? data : data.documents || [];

        if (targetDocId) {
          let match = docList.find((d) => d.id === targetDocId);
          if (!match) {
            try {
              const joinedDoc = await api.joinDocument(targetDocId);
              if (joinedDoc) {
                docList = [joinedDoc, ...docList];
                match = joinedDoc;
              }
            } catch (err) {
              console.error('[SyncSpace] Could not auto-join URL doc:', err);
            }
          }
          setDocuments(docList);
          if (match) {
            setSelectedDoc(match);
            return;
          }
        }

        setDocuments(docList);
        if (docList.length > 0 && !selectedDoc) {
          setSelectedDoc(docList[0]);
        }
      })
      .catch(console.error);
  }, [auth]);

  // Auth handler
  const handleAuth = useCallback(({ token, user }) => {
    localStorage.setItem('syncspace_token', token);
    if (user) localStorage.setItem('syncspace_user', JSON.stringify(user));
    setAuth({ token, user });
  }, []);

  // Logout
  const handleLogout = useCallback(() => {
    localStorage.removeItem('syncspace_token');
    localStorage.removeItem('syncspace_user');
    window.history.replaceState(null, '', window.location.pathname);
    setAuth(null);
    setSelectedDoc(null);
    setDocuments([]);
  }, []);

  // Select document and update URL query param
  const handleSelectDoc = useCallback((doc) => {
    setSelectedDoc(doc);
    if (doc?.id) {
      window.history.replaceState(null, '', `?doc=${doc.id}`);
    }
  }, []);

  // New or joined document created
  const handleDocCreated = useCallback((doc) => {
    setDocuments((prev) => {
      if (prev.some((d) => d.id === doc.id)) return prev;
      return [doc, ...prev];
    });
    handleSelectDoc(doc);
  }, [handleSelectDoc]);

  // Compute visible text
  const text = getText();

  // Insert character at text position
  const handleInsert = useCallback((char, textPos) => {
    const visibleNodes = nodes.filter((n) => !n.deleted);
    const before = visibleNodes[textPos - 1];
    const after = visibleNodes[textPos];
    const position = generatePosition(
      before?.position ?? POSITION_START,
      after?.position ?? POSITION_END
    );
    const id = generateId(auth?.user?.id || 'local');
    const op = {
      type: 'INSERT_OP',
      id,
      char,
      position,
    };
    applyOp(op);
    send(op);
  }, [nodes, generatePosition, generateId, auth, applyOp, send, POSITION_START, POSITION_END]);

  // Delete character at text position
  const handleDelete = useCallback((textPos) => {
    const visibleNodes = nodes.filter((n) => !n.deleted);
    const node = visibleNodes[textPos];
    if (!node) return;
    const op = { type: 'DELETE_OP', id: node.id };
    applyOp(op);
    send(op);
  }, [nodes, applyOp, send]);

  // AI Prompt trigger
  const handleAiPrompt = useCallback((prompt) => {
    const sent = send({ type: 'AI_PROMPT', prompt });
    if (sent) {
      setShowAiPanel(true);
      setSyncBotActive(true);
    }
  }, [send]);

  if (!auth) {
    return <AuthModal onAuth={handleAuth} />;
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <Sidebar
        user={auth.user}
        documents={documents}
        selectedDoc={selectedDoc}
        onSelectDoc={handleSelectDoc}
        onLogout={handleLogout}
        onDocCreated={handleDocCreated}
      />

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0">
        <Navbar
          document={selectedDoc}
          status={status}
          collaborators={collaborators}
          syncBotActive={syncBotActive}
        />

        <div className="flex flex-1 min-h-0">
          <Editor
            text={text}
            onInsert={handleInsert}
            onDelete={handleDelete}
            onAiPrompt={handleAiPrompt}
            disabled={status !== 'connected' || !selectedDoc}
            document={selectedDoc}
          />

          {/* AI Panel */}
          {showAiPanel && aiLog.length > 0 && (
            <AiPanel
              aiLog={aiLog}
              onClose={() => setShowAiPanel(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}