import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

const configs = {
  connected: {
    icon: Wifi,
    label: 'Connected',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.1)',
    border: 'rgba(34,197,94,0.2)',
    dotColor: '#22c55e',
  },
  connecting: {
    icon: Loader2,
    label: 'Reconnecting',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.1)',
    border: 'rgba(251,191,36,0.2)',
    dotColor: '#fbbf24',
  },
  disconnected: {
    icon: WifiOff,
    label: 'Disconnected',
    color: '#f87171',
    bg: 'rgba(248,113,113,0.1)',
    border: 'rgba(248,113,113,0.2)',
    dotColor: '#f87171',
  },
};

export default function ConnectionStatus({ status }) {
  const cfg = configs[status] || configs.disconnected;
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium"
      style={{
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
      }}
      aria-label={`Connection status: ${cfg.label}`}
    >
      {/* Animated status dot */}
      <motion.span
        animate={{
          scale: status === 'connected' ? [1, 1.3, 1] : 1,
          opacity: status === 'connecting' ? [1, 0.4, 1] : 1,
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="w-1.5 h-1.5 rounded-full inline-block"
        style={{ background: cfg.dotColor }}
        aria-hidden="true"
      />

      <AnimatePresence mode="wait">
        <motion.span
          key={status}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className="hidden sm:inline"
        >
          {cfg.label}
        </motion.span>
      </AnimatePresence>

      {status === 'connecting' && (
        <Loader2 size={10} className="animate-spin" />
      )}
    </motion.div>
  );
}
