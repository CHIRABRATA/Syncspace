import { motion } from 'framer-motion';
import { Crown, Pencil, Eye } from 'lucide-react';

const roleConfig = {
  OWNER: { icon: Crown, label: 'Owner', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.25)' },
  WRITE: { icon: Pencil, label: 'Can edit', color: '#4f8ef7', bg: 'rgba(79,142,247,0.1)', border: 'rgba(79,142,247,0.25)' },
  READ: { icon: Eye, label: 'Read only', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)' },
};

export default function PermissionBadge({ role, size = 'default' }) {
  const cfg = roleConfig[role] || roleConfig.READ;
  const Icon = cfg.icon;
  const isSmall = size === 'small';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`flex items-center gap-1.5 rounded-full font-semibold ${isSmall ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1.5 text-xs'}`}
      style={{
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
      }}
      aria-label={`Permission: ${cfg.label}`}
    >
      <Icon size={isSmall ? 10 : 12} />
      <span>{cfg.label}</span>
    </motion.div>
  );
}
