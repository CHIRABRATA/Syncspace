import { useState } from 'react';
import { Mail, Lock, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

export default function AuthModal({ onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fn = mode === 'login' ? api.login : api.register;
      const data = await fn(email, password);
      // Backend returns { token, user } or sets httpOnly cookie
      const token = data.token || data.accessToken;
      if (token) localStorage.setItem('syncspace_token', token);
      onAuth({ token, user: data.user });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(10,12,20,0.92)', backdropFilter: 'blur(12px)' }}
    >
      <div
        className="animate-modalIn w-full max-w-md mx-4 rounded-2xl p-8 border"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #4f8ef7, #9b72f7)' }}
          >
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>SyncSpace</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Real-time collaborative editor
            </p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div
          className="flex rounded-lg p-1 mb-6"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
        >
          {['login', 'register'].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              className="flex-1 py-2 rounded-md text-sm font-medium transition-all duration-200 capitalize"
              style={{
                background: mode === m ? 'var(--bg-card)' : 'transparent',
                color: mode === m ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
              }}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-3.5" style={{ color: 'var(--text-muted)' }} />
            <input
              type="email"
              className="input-field pl-9"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-3.5" style={{ color: 'var(--text-muted)' }} />
            <input
              type="password"
              className="input-field pl-9"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && (
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm animate-fadeIn"
              style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
            >
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <button className="btn-primary mt-1" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={15} className="animate-spin" /> {mode === 'login' ? 'Signing in...' : 'Creating account...'}
              </span>
            ) : (
              mode === 'login' ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <p className="text-center text-xs mt-5" style={{ color: 'var(--text-muted)' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className="font-medium"
            style={{ color: 'var(--accent-blue)' }}
          >
            {mode === 'login' ? 'Register' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
