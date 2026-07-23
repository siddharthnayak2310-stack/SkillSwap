import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const r = await register(form.email, form.password, form.name);
    setBusy(false);
    if (r.ok) {
      toast.success('Welcome to SkillSwap!');
      nav('/edit-profile');
    } else {
      setErr(r.error);
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream grain-bg flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-block mb-8 font-display font-black text-2xl" data-testid="register-logo-link">← SkillSwap</Link>
        <div className="brutal-border brutal-shadow-lg bg-white p-8">
          <h1 className="font-display font-black text-4xl tracking-tight mb-2">Start swapping</h1>
          <p className="text-neutral-600 mb-8">Create your free account in 30 seconds.</p>
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.2em] mb-2">Your name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 brutal-border bg-brand-cream focus:outline-none focus:bg-white"
                placeholder="Rahul Sharma"
                data-testid="register-name"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.2em] mb-2">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 brutal-border bg-brand-cream focus:outline-none focus:bg-white"
                placeholder="you@example.com"
                data-testid="register-email"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.2em] mb-2">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-3 brutal-border bg-brand-cream focus:outline-none focus:bg-white"
                placeholder="At least 6 characters"
                data-testid="register-password"
              />
            </div>
            {err && <div className="p-3 brutal-border bg-brand-coral text-sm font-semibold" data-testid="register-error">{err}</div>}
            <button
              type="submit"
              disabled={busy}
              data-testid="register-submit"
              className="w-full py-4 font-display font-black text-lg brutal-border bg-brand-yellow brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform disabled:opacity-60"
            >
              {busy ? 'Creating…' : 'Create account →'}
            </button>
          </form>
          <div className="mt-6 text-sm text-neutral-700">
            Already have one? <Link to="/login" className="font-bold underline" data-testid="register-to-login">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
