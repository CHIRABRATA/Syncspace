import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Share2, Copy, Check, Mail, X, Loader2, Crown,
  Pencil, Eye, ChevronDown, UserMinus, Shield
} from 'lucide-react';
import { api } from '../lib/api';

export default function ShareModal({ document, currentUserId, onClose }) {
  const [linkRole, setLinkRole] = useState('r'); // 'r' for Read, 'w' for Write
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('READ');
  const [inviting, setInviting] = useState(false);
  const [shareMsg, setShareMsg] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [owner, setOwner] = useState(null);
  const [loadingPerms, setLoadingPerms] = useState(true);
  const [roleDropdown, setRoleDropdown] = useState(null); // userId of open dropdown

  const shareUrl = document ? `${window.location.origin}/?doc=${document.id}/${linkRole}` : '';
  const shareUuid = document ? `${document.id}/${linkRole}` : '';

  // Fetch permissions on mount
  useEffect(() => {
    if (!document?.id) return;
    setLoadingPerms(true);
    api.getPermissions(document.id)
      .then((data) => {
        setOwner(data.owner);
        setPermissions(data.permissions || []);
      })
      .catch((err) => {
        console.error('Failed to load permissions:', err);
      })
      .finally(() => setLoadingPerms(false));
  }, [document?.id]);

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyId = () => {
    if (!shareUuid) return;
    navigator.clipboard.writeText(shareUuid);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !document?.id) return;
    setInviting(true);
    setShareMsg(null);
    try {
      const res = await api.addPermission(document.id, inviteEmail.trim(), inviteRole);
      setShareMsg({ type: 'success', text: res.message || 'Shared successfully!' });
      setInviteEmail('');
      // Refresh permissions
      const data = await api.getPermissions(document.id);
      setPermissions(data.permissions || []);
    } catch (err) {
      setShareMsg({ type: 'error', text: err.message || 'Failed to share document' });
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await api.updatePermission(document.id, userId, newRole);
      setPermissions((prev) =>
        prev.map((p) => (p.user_id === userId ? { ...p, role: newRole } : p))
      );
      setRoleDropdown(null);
    } catch (err) {
      setShareMsg({ type: 'error', text: err.message || 'Failed to update permission' });
    }
  };

  const handleRevoke = async (userId) => {
    try {
      await api.revokePermission(document.id, userId);
      setPermissions((prev) => prev.filter((p) => p.user_id !== userId));
    } catch (err) {
      setShareMsg({ type: 'error', text: err.message || 'Failed to revoke access' });
    }
  };

  if (!document) return null;

  const roleBadge = (role) => {
    const styles = {
      OWNER: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', icon: Crown, label: 'Owner' },
      WRITE: { bg: 'rgba(79,142,247,0.15)', color: '#4f8ef7', icon: Pencil, label: 'Write' },
      READ: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', icon: Eye, label: 'Read' },
    };
    const s = styles[role] || styles.READ;
    const Icon = s.icon;
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ background: s.bg, color: s.color }}
      >
        <Icon size={10} />
        {s.label}
      </span>
    );
  };

  const initials = (email) => {
    if (!email) return '?';
    return email.length >= 2 ? email.slice(0, 2).toUpperCase() : email[0]?.toUpperCase() || '?';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-lg rounded-2xl p-6 border shadow-2xl relative"
        style={{
          background: 'rgba(22, 27, 39, 0.94)',
          backdropFilter: 'blur(20px)',
          borderColor: 'rgba(42, 51, 82, 0.6)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(79, 142, 247, 0.1)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5 cursor-pointer"
          aria-label="Close share dialog"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Share2 size={18} style={{ color: 'var(--accent-blue)' }} />
          <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
            Share "{document.title}"
          </h3>
        </div>

        {/* Link / UUID Access Role Toggle */}
        <div
          className="flex items-center justify-between mb-3 px-3 py-2 rounded-xl"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Direct Share Permission:
            </span>
          </div>
          <div className="flex rounded-lg p-0.5" style={{ background: 'var(--bg-secondary)' }}>
            <button
              type="button"
              onClick={() => setLinkRole('r')}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all"
              style={{
                background: linkRole === 'r' ? 'rgba(34,197,94,0.2)' : 'transparent',
                color: linkRole === 'r' ? 'var(--accent-green)' : 'var(--text-muted)',
                fontWeight: linkRole === 'r' ? 600 : 400,
              }}
            >
              <Eye size={12} />
              <span>Read (/r)</span>
            </button>
            <button
              type="button"
              onClick={() => setLinkRole('w')}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all"
              style={{
                background: linkRole === 'w' ? 'rgba(79,142,247,0.2)' : 'transparent',
                color: linkRole === 'w' ? 'var(--accent-blue)' : 'var(--text-muted)',
                fontWeight: linkRole === 'w' ? 600 : 400,
              }}
            >
              <Pencil size={12} />
              <span>Write (/w)</span>
            </button>
          </div>
        </div>

        {/* Share Link */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Direct Share Link
            </label>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded" style={{ background: linkRole === 'w' ? 'rgba(79,142,247,0.15)' : 'rgba(34,197,94,0.15)', color: linkRole === 'w' ? '#4f8ef7' : '#22c55e' }}>
              {linkRole === 'w' ? '✏️ write mode (/w)' : '👁 read mode (/r)'}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              className="input-field py-2 flex-1 text-xs truncate select-all font-mono"
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all"
              style={{
                background: copiedLink ? 'var(--accent-green)' : 'var(--accent-blue)',
                color: 'white',
              }}
            >
              {copiedLink ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Document UUID */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Document UUID
            </label>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded" style={{ background: linkRole === 'w' ? 'rgba(79,142,247,0.15)' : 'rgba(34,197,94,0.15)', color: linkRole === 'w' ? '#4f8ef7' : '#22c55e' }}>
              {linkRole === 'w' ? 'path: /w' : 'path: /r'}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUuid}
              className="input-field py-2 flex-1 font-mono text-xs select-all"
            />
            <button
              onClick={handleCopyId}
              className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all"
              style={{
                background: 'var(--bg-tertiary)',
                color: copiedId ? 'var(--accent-green)' : 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
            >
              {copiedId ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedId ? 'Copied!' : 'Copy ID'}</span>
            </button>
          </div>
        </div>

        {/* Invite by Email */}
        <div className="pt-4 border-t mb-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Invite Collaborator
          </label>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              type="email"
              placeholder="collaborator@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="input-field py-2 flex-1 text-xs"
            />
            {/* Role selector */}
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="rounded-lg text-xs font-medium px-2 py-2 outline-none cursor-pointer"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
            >
              <option value="READ">Read</option>
              <option value="WRITE">Write</option>
            </select>
            <button
              type="submit"
              disabled={!inviteEmail.trim() || inviting}
              className="px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5"
              style={{
                background: 'linear-gradient(135deg, #4f8ef7, #9b72f7)',
                color: 'white',
                opacity: !inviteEmail.trim() || inviting ? 0.6 : 1,
              }}
            >
              {inviting ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
              <span>Give Access</span>
            </button>
          </form>
          {shareMsg && (
            <p
              className="text-xs mt-2"
              style={{ color: shareMsg.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)' }}
            >
              {shareMsg.text}
            </p>
          )}
        </div>

        {/* Existing Permissions */}
        <div className="pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-1.5 mb-3">
            <Shield size={13} style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              People with access
            </span>
          </div>

          {loadingPerms ? (
            <div className="flex justify-center py-4">
              <Loader2 size={18} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {/* Owner */}
              {owner && (
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
                  >
                    {initials(owner.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {owner.email}
                    </p>
                  </div>
                  {roleBadge('OWNER')}
                </div>
              )}

              {/* Shared users */}
              {permissions.map((p) => (
                <div
                  key={p.user_id}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg group"
                  style={{ background: 'var(--bg-tertiary)' }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: 'rgba(79,142,247,0.2)', color: '#4f8ef7' }}
                  >
                    {initials(p.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {p.email}
                    </p>
                  </div>

                  {/* Role dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setRoleDropdown(roleDropdown === p.user_id ? null : p.user_id)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all hover:bg-white/5"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {roleBadge(p.role)}
                      <ChevronDown size={10} />
                    </button>
                    {roleDropdown === p.user_id && (
                      <div
                        className="absolute right-0 top-full mt-1 w-36 rounded-lg border shadow-xl z-10 overflow-hidden"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                      >
                        <button
                          onClick={() => handleChangeRole(p.user_id, 'READ')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-all hover:bg-white/5"
                          style={{ color: p.role === 'READ' ? 'var(--accent-green)' : 'var(--text-primary)' }}
                        >
                          <Eye size={12} /> Read
                          {p.role === 'READ' && <Check size={10} className="ml-auto" />}
                        </button>
                        <button
                          onClick={() => handleChangeRole(p.user_id, 'WRITE')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-all hover:bg-white/5"
                          style={{ color: p.role === 'WRITE' ? 'var(--accent-blue)' : 'var(--text-primary)' }}
                        >
                          <Pencil size={12} /> Write
                          {p.role === 'WRITE' && <Check size={10} className="ml-auto" />}
                        </button>
                        <div className="border-t" style={{ borderColor: 'var(--border-subtle)' }} />
                        <button
                          onClick={() => handleRevoke(p.user_id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-all hover:bg-red-500/10"
                          style={{ color: 'var(--accent-red)' }}
                        >
                          <UserMinus size={12} /> Remove access
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {permissions.length === 0 && (
                <p className="text-xs text-center py-3" style={{ color: 'var(--text-muted)' }}>
                  No collaborators yet. Invite someone above!
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
