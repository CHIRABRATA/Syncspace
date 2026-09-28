import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Share2, Sparkles, Download
} from 'lucide-react';
import ShareModal from './ShareModal';
import DownloadMenu from './DownloadMenu';
import ConnectionStatus from './ConnectionStatus';
import PermissionBadge from './PermissionBadge';
import CollaboratorAvatars from './CollaboratorAvatars';
import SyncBotOrb from './SyncBotOrb';

export default function Navbar({ document, status, collaborators = [], syncBotActive = false, onOpenAiPrompt, docRole, currentUserId, getText }) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const isOwner = docRole === 'OWNER';
  const canEdit = docRole === 'OWNER' || docRole === 'WRITE';

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="flex items-center gap-3 px-5 py-2.5 flex-shrink-0 relative z-10"
        style={{
          background: 'rgba(22, 27, 39, 0.72)',
          backdropFilter: 'blur(16px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
          borderBottom: '1px solid rgba(42, 51, 82, 0.5)',
          boxShadow: '0 1px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.03)',
        }}
        role="banner"
      >
        {/* Document Title */}
        <div className="flex-1 min-w-0">
          <h2
            className="font-semibold truncate"
            style={{ color: 'var(--text-primary)', fontSize: '15px' }}
          >
            {document?.title || 'Select a document'}
          </h2>
          {document && (
            <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--text-muted)' }}>
              <Users size={10} />
              {collaborators.length > 0
                ? `${collaborators.length} collaborator${collaborators.length !== 1 ? 's' : ''}`
                : 'Ready for live collaboration'}
            </p>
          )}
        </div>

        {/* Role Badge */}
        <AnimatePresence>
          {document && docRole && (
            <PermissionBadge role={docRole} />
          )}
        </AnimatePresence>

        {/* AI Writer Button - only for WRITE/OWNER */}
        <AnimatePresence>
          {document && canEdit && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onOpenAiPrompt}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-shadow cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #4f8ef7, #9b72f7)',
                boxShadow: syncBotActive
                  ? '0 2px 15px rgba(155, 114, 247, 0.5), 0 0 25px rgba(34, 211, 238, 0.2)'
                  : '0 2px 10px rgba(155, 114, 247, 0.3)',
              }}
              title="Ask AI to write into this document"
              aria-label="Open AI Writer"
              id="ai-writer-btn"
            >
              {syncBotActive ? (
                <SyncBotOrb active size={16} />
              ) : (
                <Sparkles size={13} />
              )}
              <span className="hidden sm:inline">{syncBotActive ? 'Writing...' : 'AI Writer'}</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Download Button */}
        <AnimatePresence>
          {document && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative"
            >
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                style={{
                  background: 'rgba(30, 36, 56, 0.6)',
                  color: 'var(--text-secondary)',
                  border: '1px solid rgba(42, 51, 82, 0.5)',
                  backdropFilter: 'blur(8px)',
                }}
                aria-label="Download document"
                id="download-btn"
              >
                <Download size={13} />
                <span className="hidden sm:inline">Download</span>
              </motion.button>
              <AnimatePresence>
                {showDownloadMenu && (
                  <DownloadMenu
                    document={document}
                    getText={getText}
                    onClose={() => setShowDownloadMenu(false)}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Share Button (Only for OWNER) */}
        <AnimatePresence>
          {document && isOwner && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ scale: 1.03, borderColor: 'rgba(79,142,247,0.4)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              style={{
                background: 'rgba(30, 36, 56, 0.6)',
                color: 'var(--accent-blue)',
                border: '1px solid rgba(42, 51, 82, 0.5)',
                backdropFilter: 'blur(8px)',
              }}
              aria-label="Share document"
              id="share-btn"
            >
              <Share2 size={13} />
              <span>Share</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Collaborator Avatars */}
        {collaborators.length > 0 && (
          <CollaboratorAvatars
            collaborators={collaborators}
            syncBotActive={syncBotActive}
          />
        )}

        {/* SyncBot Active Indicator (text) */}
        <AnimatePresence>
          {syncBotActive && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className="text-xs ai-shimmer font-medium hidden sm:inline"
            >
              SyncBot typing...
            </motion.span>
          )}
        </AnimatePresence>

        {/* Connection Status */}
        <ConnectionStatus status={status} />
      </motion.header>

      {/* Share Modal */}
      {showShareModal && document && (
        <ShareModal
          document={document}
          currentUserId={currentUserId}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  );
}
