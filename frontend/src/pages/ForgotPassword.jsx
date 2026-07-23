import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { formatApiError } from '../api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setResult(data);
    } catch (e) {
      setErr(formatApiError(e));
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-brand-cream grain-bg flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-block mb-8 font-display font-black text-2xl" data-testid="forgot-back">← Back to login</Link>
        <div className="brutal-border brutal-shadow-lg bg-white p-8">
          <h1 className="font-display font-black text-4xl tracking-tight mb-2">Forgot password?</h1>
          <p className="text-neutral-600 mb-8">Enter your email and we'll create a reset link.</p>

          {result ? (
            <div className="space-y-4" data-testid="forgot-success">
              <div className="p-4 brutal-border bg-brand-mint font-semibold text-sm">
                {result.message}
              </div>
              {result.reset_link && (
                <div className="p-4 brutal-border bg-brand-yellow">
                  <div className="text-xs font-bold uppercase tracking-[0.2em] mb-2">Demo mode — reset link</div>
                  <div className="text-xs break-all mb-3 font-mono" data-testid="forgot-reset-link-text">{result.reset_link}</div>
                  <Link
                    to={`/reset-password/${result.token}`}
                    className="inline-block px-4 py-2 brutal-border bg-black text-brand-cream font-bold text-sm"
                    data-testid="forgot-open-reset"
                  >
                    Open reset page →
                  </Link>
                </div>
              )}
              <p className="text-xs text-neutral-500">In production, this link would be sent via email.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.2em] mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 brutal-border bg-brand-cream focus:outline-none focus:bg-white"
                  placeholder="you@example.com"
                  data-testid="forgot-email"
                />
              </div>
              {err && <div className="p-3 brutal-border bg-brand-coral text-sm font-semibold" data-testid="forgot-error">{err}</div>}
              <button
                type="submit"
                disabled={busy}
                data-testid="forgot-submit"
                className="w-full py-4 font-display font-black text-lg brutal-border bg-brand-yellow brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform disabled:opacity-60"
              >
                {busy ? 'Sending…' : 'Send reset link →'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
