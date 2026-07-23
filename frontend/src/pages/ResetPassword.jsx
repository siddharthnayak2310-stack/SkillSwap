import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { formatApiError } from '../api/client';
import { toast } from 'sonner';

export default function ResetPassword() {
  const { token } = useParams();
  const nav = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (password.length < 6) return setErr('Password must be at least 6 characters.');
    if (password !== confirm) return setErr('Passwords do not match.');
    setBusy(true);
    try {
      await api.post('/auth/reset-password', { token, new_password: password });
      toast.success('Password reset. Please log in.');
      nav('/login');
    } catch (e) {
      setErr(formatApiError(e));
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-brand-cream grain-bg flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-block mb-8 font-display font-black text-2xl" data-testid="reset-back">← Back to login</Link>
        <div className="brutal-border brutal-shadow-lg bg-white p-8">
          <h1 className="font-display font-black text-4xl tracking-tight mb-2">Set new password</h1>
          <p className="text-neutral-600 mb-8">Choose a strong password (min. 6 characters).</p>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.2em] mb-2">New password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 brutal-border bg-brand-cream focus:outline-none focus:bg-white"
                data-testid="reset-password"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.2em] mb-2">Confirm password</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-3 brutal-border bg-brand-cream focus:outline-none focus:bg-white"
                data-testid="reset-confirm"
              />
            </div>
            {err && <div className="p-3 brutal-border bg-brand-coral text-sm font-semibold" data-testid="reset-error">{err}</div>}
            <button
              type="submit"
              disabled={busy}
              data-testid="reset-submit"
              className="w-full py-4 font-display font-black text-lg brutal-border bg-brand-yellow brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform disabled:opacity-60"
            >
              {busy ? 'Resetting…' : 'Reset password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
