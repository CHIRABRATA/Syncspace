import { motion, AnimatePresence } from 'framer-motion';
import { Bot } from 'lucide-react';

export default function SyncBotOrb({ active = false, size = 28 }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Ambient glow ring */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.15, 0.4] }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: -6,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(155,114,247,0.35) 0%, transparent 70%)',
            }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Rotating ring (active state) */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, rotate: 0 }}
            animate={{ opacity: 1, rotate: 360 }}
            exit={{ opacity: 0 }}
            transition={{ rotate: { duration: 3, repeat: Infinity, ease: 'linear' }, opacity: { duration: 0.3 } }}
            style={{
              position: 'absolute',
              inset: -3,
              borderRadius: '50%',
              border: '1.5px solid transparent',
              borderTopColor: 'rgba(34,211,238,0.6)',
              borderRightColor: 'rgba(155,114,247,0.3)',
            }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Core orb */}
      <motion.div
        animate={{
          scale: active ? [1, 1.08, 1] : 1,
          boxShadow: active
            ? ['0 0 8px rgba(155,114,247,0.4)', '0 0 18px rgba(34,211,238,0.5)', '0 0 8px rgba(155,114,247,0.4)']
            : '0 0 4px rgba(155,114,247,0.2)',
        }}
        transition={{ duration: 1.5, repeat: active ? Infinity : 0, ease: 'easeInOut' }}
        className="flex items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          background: active
            ? 'linear-gradient(135deg, #9b72f7, #22d3ee)'
            : 'linear-gradient(135deg, #9b72f7, #4f8ef7)',
        }}
      >
        <Bot size={size * 0.5} className="text-white" />
      </motion.div>

      {/* LIVE badge */}
      <AnimatePresence>
        {active && (
          <motion.span
            initial={{ opacity: 0, scale: 0.7, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 4 }}
            className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 text-[7px] font-bold tracking-wider px-1.5 py-0.5 rounded-full"
            style={{
              background: 'rgba(34,211,238,0.2)',
              color: '#22d3ee',
              border: '1px solid rgba(34,211,238,0.3)',
              whiteSpace: 'nowrap',
            }}
          >
            LIVE
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
