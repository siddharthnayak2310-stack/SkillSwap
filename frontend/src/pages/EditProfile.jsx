import Navbar from '../components/Navbar';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { formatApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Xmark, Plus } from 'iconoir-react';

const LEVELS = ['Beginner', 'Intermediate', 'Expert'];

export default function EditProfile() {
  const { user, refreshUser } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: '', bio: '', college: '', experience_level: 'Beginner', category: '',
    skills_known: [], skills_wanted: [],
  });
  const [known, setKnown] = useState('');
  const [wanted, setWanted] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await api.get('/auth/me');
      setForm({
        name: data.name || '',
        bio: data.bio || '',
        college: data.college || '',
        experience_level: data.experience_level || 'Beginner',
        category: data.category || '',
        skills_known: data.skills_known || [],
        skills_wanted: data.skills_wanted || [],
      });
    })();
  }, []);

  const addSkill = (field, val, setVal) => {
    const s = val.trim();
    if (!s) return;
    if (form[field].includes(s)) return;
    setForm({ ...form, [field]: [...form[field], s] });
    setVal('');
  };

  const removeSkill = (field, s) => {
    setForm({ ...form, [field]: form[field].filter((x) => x !== s) });
  };

  const save = async () => {
    setBusy(true);
    try {
      await api.put('/users/me', form);
      await refreshUser();
      toast.success('Profile updated!');
      nav(`/profile/${user.id}`);
    } catch (e) {
      toast.error(formatApiError(e));
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-brand-cream">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-8 py-10">
        <h1 className="font-display font-black text-4xl tracking-tighter mb-8">Edit your profile</h1>

        <div className="brutal-border bg-white p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.2em] mb-2">Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3 brutal-border bg-brand-cream" data-testid="edit-name" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.2em] mb-2">Bio</label>
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className="w-full px-4 py-3 brutal-border bg-brand-cream" placeholder="Tell peers about yourself…" data-testid="edit-bio" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.2em] mb-2">College</label>
              <input value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} className="w-full px-4 py-3 brutal-border bg-brand-cream" data-testid="edit-college" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.2em] mb-2">Category</label>
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-3 brutal-border bg-brand-cream" placeholder="e.g. Web Dev" data-testid="edit-category" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.2em] mb-2">Experience level</label>
            <div className="flex gap-2 flex-wrap">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  onClick={() => setForm({ ...form, experience_level: l })}
                  className={`px-4 py-2 brutal-border font-bold text-sm ${form.experience_level === l ? 'bg-brand-yellow' : 'bg-white'}`}
                  data-testid={`edit-level-${l.toLowerCase()}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.2em] mb-2">Skills you know</label>
            <div className="flex gap-2">
              <input value={known} onChange={(e) => setKnown(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill('skills_known', known, setKnown))} className="flex-1 px-4 py-3 brutal-border bg-brand-cream" placeholder="Type a skill and press Enter" data-testid="edit-add-known-input" />
              <button onClick={() => addSkill('skills_known', known, setKnown)} className="px-4 py-3 brutal-border bg-brand-mint font-bold" data-testid="edit-add-known-btn"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {form.skills_known.map((s) => (
                <span key={s} className="inline-flex items-center gap-2 px-3 py-1 brutal-border bg-brand-mint font-semibold text-sm">
                  {s}
                  <button onClick={() => removeSkill('skills_known', s)} data-testid={`remove-known-${s}`}><Xmark className="w-4 h-4" /></button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.2em] mb-2">Skills you want to learn</label>
            <div className="flex gap-2">
              <input value={wanted} onChange={(e) => setWanted(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill('skills_wanted', wanted, setWanted))} className="flex-1 px-4 py-3 brutal-border bg-brand-cream" placeholder="Type a skill and press Enter" data-testid="edit-add-wanted-input" />
              <button onClick={() => addSkill('skills_wanted', wanted, setWanted)} className="px-4 py-3 brutal-border bg-brand-coral font-bold" data-testid="edit-add-wanted-btn"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {form.skills_wanted.map((s) => (
                <span key={s} className="inline-flex items-center gap-2 px-3 py-1 brutal-border bg-brand-coral font-semibold text-sm">
                  {s}
                  <button onClick={() => removeSkill('skills_wanted', s)} data-testid={`remove-wanted-${s}`}><Xmark className="w-4 h-4" /></button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <button onClick={() => nav(-1)} className="flex-1 py-3 brutal-border bg-white font-bold" data-testid="edit-cancel">Cancel</button>
            <button onClick={save} disabled={busy} className="flex-1 py-3 brutal-border bg-brand-yellow font-bold brutal-shadow-sm disabled:opacity-60" data-testid="edit-save">
              {busy ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
