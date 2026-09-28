import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useDocumentState } from './hooks/useDocumentState';
import { api } from './lib/api';
import AuthModal from './components/AuthModal';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Editor from './components/Editor';
import AiPanel from './components/AiPanel';
import AiPromptModal from './components/AiPromptModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import ShareModal from './components/ShareModal';
import BackgroundNetwork from './components/BackgroundNetwork';
import { triggerNetworkPulse } from './lib/networkPulse';
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
  const [showAiPromptModal, setShowAiPromptModal] = useState(false);
  const [aiPromptCursor, setAiPromptCursor] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [syncBotActive, setSyncBotActive] = useState(false);
  const [docRole, setDocRole] = useState(null); // 'OWNER' | 'WRITE' | 'READ' | null
  const [deleteTarget, setDeleteTarget] = useState(null); // document to delete
  const [shareTarget, setShareTarget] = useState(null); // document to share
  const [downloadTarget, setDownloadTarget] = useState(null); // document to download


  const {
    nodes,
    aiLog,
    applyOp,
    resetState,
    generateId,
    generatePosition,
    getText,
  } = useDocumentState();

  // Handle incoming WebSocket operations
  const handleOp = useCallback((op) => {
    if (op.type === 'PRESENCE_UPDATE') {
      setCollaborators(op.collaborators || []);
      return;
    }
    if (op.type === 'ERROR') {
      console.warn('[SyncSpace] Server error:', op.error);
      return;
    }
    if (op.type === 'INSERT_OP' || op.type === 'DELETE_OP') {
      triggerNetworkPulse(op.senderId === 'syncbot-agent-id' ? 1.5 : 1);
    }
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

  // Handle role received from INIT_STATE
  const handleRoleReceived = useCallback((role) => {
    setDocRole(role);
  }, []);

  const handleRoleReceivedRef = useRef(handleRoleReceived);
  useEffect(() => {
    handleRoleReceivedRef.current = handleRoleReceived;
  }, [handleRoleReceived]);

  const stableOnRoleReceived = useCallback((role) => {
    if (handleRoleReceivedRef.current) {
      handleRoleReceivedRef.current(role);
    }
  }, []);

  const { status, send } = useWebSocket({
    token: auth?.token,
    documentId: selectedDoc?.id,
    onOp: stableOnOp,
    onRoleReceived: stableOnRoleReceived,
  });

  // Verify stored token validity on initial load
  useEffect(() => {
    if (auth?.token) {
      api.getMe().catch(() => {
        handleLogout();
      });
    }
  }, []);

  // Fetch documents on auth and handle ?doc=<id>[/w|/r] URL parameter
  useEffect(() => {
    if (!auth) return;

    const urlParams = new URLSearchParams(window.location.search);
    const targetDocParam = urlParams.get('doc');

    api.getDocuments()
      .then(async (data) => {
        let docList = Array.isArray(data) ? data : data.documents || [];

        if (targetDocParam) {
          const cleanDocId = targetDocParam.split(/[\/:]/)[0];
          try {
            // Join document with provided path/role (e.g. /w for write or /r for read)
            const joinedDoc = await api.joinDocument(targetDocParam);
            if (joinedDoc) {
              const existingIdx = docList.findIndex((d) => d.id === joinedDoc.id);
              if (existingIdx >= 0) {
                docList[existingIdx] = joinedDoc;
              } else {
                docList = [joinedDoc, ...docList];
              }
              setDocuments(docList);
              setSelectedDoc(joinedDoc);
              if (joinedDoc.role) setDocRole(joinedDoc.role);
              return;
            }
          } catch (err) {
            console.error('[SyncSpace] Could not join URL doc:', err);
            const match = docList.find((d) => d.id === cleanDocId);
            setDocuments(docList);
            if (match) {
              setSelectedDoc(match);
              if (match.role) setDocRole(match.role);
              return;
            }
          }
        }

        setDocuments(docList);
        if (docList.length > 0 && !selectedDoc) {
          setSelectedDoc(docList[0]);
          if (docList[0].role) setDocRole(docList[0].role);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch documents:', err);
      });
  }, [auth]);

  // Auth handler
  const handleAuth = useCallback(({ token, user }) => {
    if (token) localStorage.setItem('syncspace_token', token);
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
    setCollaborators([]);
    setDocRole(null);
    resetState();
  }, [resetState]);

  // Listen for global auth expired events
  useEffect(() => {
    const onAuthExpired = () => handleLogout();
    window.addEventListener('syncspace:logout', onAuthExpired);
    return () => window.removeEventListener('syncspace:logout', onAuthExpired);
  }, [handleLogout]);

  // Select document and update URL query param
  const handleSelectDoc = useCallback((doc) => {
    if (doc?.id !== selectedDoc?.id) {
      resetState();
      setCollaborators([]);
      setDocRole(doc?.role || null); // Set initial role from document list data
    }
    setSelectedDoc(doc);
    if (doc?.id) {
      window.history.replaceState(null, '', `?doc=${doc.id}`);
    }
  }, [selectedDoc, resetState]);

  // New or joined document created
  const handleDocCreated = useCallback((doc) => {
    setDocuments((prev) => {
      const idx = prev.findIndex((d) => d.id === doc.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = doc;
        return next;
      }
      return [doc, ...prev];
    });
    handleSelectDoc(doc);
  }, [handleSelectDoc]);

  // ---- Document Actions ----

  const handleDeleteDoc = useCallback((doc) => {
    setDeleteTarget(doc);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteDocument(deleteTarget.id);
      setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      if (selectedDoc?.id === deleteTarget.id) {
        setSelectedDoc(null);
        setDocRole(null);
        resetState();
      }
      setDeleteTarget(null);
    } catch (err) {
      console.error('Delete failed:', err);
      throw err;
    }
  }, [deleteTarget, selectedDoc, resetState]);

  const handleRenameDoc = useCallback(async (doc, newTitle) => {
    try {
      await api.renameDocument(doc.id, newTitle);
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, title: newTitle } : d))
      );
      if (selectedDoc?.id === doc.id) {
        setSelectedDoc((prev) => prev ? { ...prev, title: newTitle } : prev);
      }
    } catch (err) {
      console.error('Rename failed:', err);
    }
  }, [selectedDoc]);

  const handleDuplicateDoc = useCallback(async (doc) => {
    try {
      const newDoc = await api.duplicateDocument(doc.id);
      setDocuments((prev) => [newDoc, ...prev]);
      handleSelectDoc(newDoc);
    } catch (err) {
      console.error('Duplicate failed:', err);
    }
  }, [handleSelectDoc]);

  const handleLeaveDoc = useCallback(async (doc) => {
    try {
      await api.leaveDocument(doc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      if (selectedDoc?.id === doc.id) {
        setSelectedDoc(null);
        setDocRole(null);
        resetState();
      }
    } catch (err) {
      console.error('Leave failed:', err);
    }
  }, [selectedDoc, resetState]);

  const handleShareDoc = useCallback((doc) => {
    setShareTarget(doc || selectedDoc);
  }, [selectedDoc]);

  // Compute visible text
  const text = getText();

  // Insert character at text position
  const handleInsert = useCallback((char, textPos) => {
    const visibleNodes = nodes.filter((n) => !n.deleted);
    const before = visibleNodes[textPos - 1];
    const after = visibleNodes[textPos];
    const position = generatePosition(before?.position, after?.position);
    const id = generateId(auth?.user?.id || 'local');
    const op = {
      type: 'INSERT_OP',
      id,
      char,
      position,
    };
    applyOp(op);
    send(op);
    triggerNetworkPulse(0.8);
  }, [nodes, generatePosition, generateId, auth, applyOp, send]);


  // Delete character at text position
  const handleDelete = useCallback((textPos) => {
    const visibleNodes = nodes.filter((n) => !n.deleted);
    const node = visibleNodes[textPos];
    if (!node) return;
    const op = { type: 'DELETE_OP', id: node.id };
    applyOp(op);
    send(op);
    triggerNetworkPulse(0.8);
  }, [nodes, applyOp, send]);

  // Dedicated AI Prompt trigger (supports prompt text and target insertion mode/position)
  const handleAiPrompt = useCallback((prompt, insertModeOrPos = 'end') => {
    const visibleNodes = nodes.filter((n) => !n.deleted);
    let basePos = 100;
    if (typeof insertModeOrPos === 'number') {
      if (insertModeOrPos < visibleNodes.length && insertModeOrPos >= 0) {
        basePos = visibleNodes[insertModeOrPos]?.position || 100;
      } else if (visibleNodes.length > 0) {
        basePos = visibleNodes[visibleNodes.length - 1].position;
      }
    } else if (insertModeOrPos === 'cursor' && aiPromptCursor != null) {
      if (aiPromptCursor < visibleNodes.length && aiPromptCursor >= 0) {
        basePos = visibleNodes[aiPromptCursor]?.position || 100;
      } else if (visibleNodes.length > 0) {
        basePos = visibleNodes[visibleNodes.length - 1].position;
      }
    } else {
      if (visibleNodes.length > 0) {
        basePos = visibleNodes[visibleNodes.length - 1].position;
      }
    }

    const sent = send({
      type: 'AI_PROMPT',
      prompt,
      insertAtPosition: basePos,
    });
    if (sent) {
      setShowAiPanel(true);
      setSyncBotActive(true);
    }
  }, [nodes, send, aiPromptCursor]);

  const handleOpenAiPrompt = useCallback((opts) => {
    if (opts?.cursorIndex != null) {
      setAiPromptCursor(opts.cursorIndex);
    }
    setShowAiPromptModal(true);
  }, []);

  if (!auth) {
    return <AuthModal onAuth={handleAuth} />;
  }

  return (
    <div className="flex h-screen overflow-hidden relative" style={{ background: 'var(--bg-primary)' }}>
      {/* 3D WebGL Background Network */}
      <BackgroundNetwork />

      {/* Sidebar */}
      <Sidebar
        user={auth.user}
        documents={documents}
        selectedDoc={selectedDoc}
        onSelectDoc={handleSelectDoc}
        onLogout={handleLogout}
        onDocCreated={handleDocCreated}
        onDeleteDoc={handleDeleteDoc}
        onShareDoc={handleShareDoc}
        onDownloadDoc={(doc) => {
          handleSelectDoc(doc);
          // Download triggers from navbar
        }}
        onRenameDoc={handleRenameDoc}
        onDuplicateDoc={handleDuplicateDoc}
        onLeaveDoc={handleLeaveDoc}
      />

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0">
        <Navbar
          document={selectedDoc}
          status={status}
          collaborators={collaborators}
          syncBotActive={syncBotActive}
          onOpenAiPrompt={handleOpenAiPrompt}
          docRole={docRole}
          currentUserId={auth.user?.id}
          getText={getText}
        />

        <div className="flex flex-1 min-h-0">
          <Editor
            text={text}
            nodes={nodes}
            syncBotActive={syncBotActive}
            onInsert={handleInsert}
            onDelete={handleDelete}
            onAiPrompt={handleAiPrompt}
            onOpenAiPrompt={handleOpenAiPrompt}
            disabled={status !== 'connected' || !selectedDoc}
            document={selectedDoc}
            docRole={docRole}
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

      {/* Dedicated AI Agent Writer Prompt Modal */}
      <AiPromptModal
        isOpen={showAiPromptModal}
        onClose={() => setShowAiPromptModal(false)}
        onSubmit={handleAiPrompt}
        isWriting={syncBotActive}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          document={deleteTarget}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Share Modal (triggered from sidebar menu) */}
      {shareTarget && (
        <ShareModal
          document={shareTarget}
          currentUserId={auth.user?.id}
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  );
}