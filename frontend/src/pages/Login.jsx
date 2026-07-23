import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const r = await login(form.email, form.password);
    setBusy(false);
    if (r.ok) {
      toast.success('Welcome back!');
      nav(r.user.role === 'admin' ? '/admin' : '/dashboard');
    } else {
      setErr(r.error);
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream grain-bg flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-block mb-8 font-display font-black text-2xl" data-testid="login-logo-link">← SkillSwap</Link>
        <div className="brutal-border brutal-shadow-lg bg-white p-8">
          <h1 className="font-display font-black text-4xl tracking-tight mb-2">Welcome back</h1>
          <p className="text-neutral-600 mb-8">Log in to continue swapping skills.</p>
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.2em] mb-2">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 brutal-border bg-brand-cream focus:outline-none focus:bg-white"
                placeholder="you@example.com"
                data-testid="login-email"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.2em] mb-2">Password</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-3 brutal-border bg-brand-cream focus:outline-none focus:bg-white"
                placeholder="••••••••"
                data-testid="login-password"
              />
            </div>
            {err && <div className="p-3 brutal-border bg-brand-coral text-sm font-semibold" data-testid="login-error">{err}</div>}
            <button
              type="submit"
              disabled={busy}
              data-testid="login-submit"
              className="w-full py-4 font-display font-black text-lg brutal-border bg-brand-yellow brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform disabled:opacity-60"
            >
              {busy ? 'Logging in…' : 'Log in →'}
            </button>
          </form>
          <div className="mt-6 text-sm text-neutral-700">
            No account? <Link to="/register" className="font-bold underline" data-testid="login-to-register">Create one</Link>
          </div>
          <div className="mt-4 text-xs text-neutral-500 bg-brand-mint brutal-border p-3">
            <div className="font-bold mb-1">Admin demo:</div>
            admin@skillswap.com / admin123
          </div>
        </div>
      </div>
    </div>
  );
}
