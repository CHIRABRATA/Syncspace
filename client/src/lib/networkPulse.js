/**
 * Lightweight event-driven network pulse system.
 * Communicates WebSocket operations to the WebGL layer
 * without triggering React state updates or re-renders.
 * 
 * Uses a simple pub/sub pattern with ref-based consumers.
 */

let _pulseIntensity = 0;
let _lastPulseTime = 0;
const THROTTLE_MS = 50; // Batch rapid ops into single pulses

const listeners = new Set();

/**
 * Trigger a network pulse from a WebSocket operation.
 * Throttled to prevent expensive WebGL updates on every keystroke.
 */
export function triggerNetworkPulse(intensity = 1) {
  const now = Date.now();
  if (now - _lastPulseTime < THROTTLE_MS) {
    // Accumulate intensity for batched ops
    _pulseIntensity = Math.min(_pulseIntensity + intensity * 0.3, 3);
    return;
  }
  _lastPulseTime = now;
  _pulseIntensity = intensity;

  // Notify all listeners (WebGL refs)
  for (const fn of listeners) {
    try { fn(_pulseIntensity); } catch (e) { /* silent */ }
  }
}

/**
 * Subscribe to network pulses. Returns an unsubscribe function.
 */
export function onNetworkPulse(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * Get current pulse intensity (for useFrame polling).
 */
export function getPulseIntensity() {
  return _pulseIntensity;
}

/**
 * Decay pulse intensity (call each frame).
 */
export function decayPulse(delta) {
  _pulseIntensity = Math.max(0, _pulseIntensity - delta * 2.5);
}

// SyncBot activity signal (ref-based, no React state)
let _syncBotGlowIntensity = 0;

export function triggerSyncBotGlow() {
  _syncBotGlowIntensity = 1.5;
}

export function getSyncBotGlowIntensity() {
  return _syncBotGlowIntensity;
}

export function decaySyncBotGlow(delta) {
  _syncBotGlowIntensity = Math.max(0, _syncBotGlowIntensity - delta * 0.8);
}
