import Navbar from '../components/Navbar';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Search, StarSolid } from 'iconoir-react';

export default function Discover() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [skill, setSkill] = useState('');
  const [category, setCategory] = useState('');
  const [college, setCollege] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (q) params.q = q;
      if (skill) params.skill = skill;
      if (category) params.category = category;
      if (college) params.college = college;
      if (onlineOnly) params.online = true;
      const { data } = await api.get('/users', { params });
      setUsers(data.filter((u) => u.id !== user.id));
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [q, skill, category, college, onlineOnly]);

  return (
    <div className="min-h-screen bg-brand-cream">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
        <div className="mb-8">
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-neutral-500 mb-2">Discover</div>
          <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter">Find your swap partner</h1>
        </div>

        <div className="brutal-border bg-white p-6 mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, bio, skill…"
              className="w-full pl-10 pr-3 py-3 brutal-border bg-brand-cream focus:outline-none focus:bg-white"
              data-testid="discover-search"
            />
          </div>
          <input
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            placeholder="Skill (e.g. React)"
            className="w-full px-3 py-3 brutal-border bg-brand-cream focus:outline-none focus:bg-white"
            data-testid="discover-filter-skill"
          />
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category"
            className="w-full px-3 py-3 brutal-border bg-brand-cream focus:outline-none focus:bg-white"
            data-testid="discover-filter-category"
          />
          <input
            value={college}
            onChange={(e) => setCollege(e.target.value)}
            placeholder="College"
            className="w-full px-3 py-3 brutal-border bg-brand-cream focus:outline-none focus:bg-white"
            data-testid="discover-filter-college"
          />
          <label className="flex items-center gap-2 lg:col-span-5 text-sm font-bold cursor-pointer">
            <input type="checkbox" checked={onlineOnly} onChange={(e) => setOnlineOnly(e.target.checked)} data-testid="discover-online-only" />
            <span>Show only online users (active in last 5 min)</span>
          </label>
        </div>

        {loading ? (
          <div className="font-display text-xl">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="brutal-border bg-white p-12 text-center" data-testid="discover-empty">
            <div className="font-display font-black text-2xl mb-2">No matches found</div>
            <div className="text-neutral-600">Try clearing filters or invite friends to join!</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {users.map((u) => (
              <div key={u.id} className="brutal-border brutal-shadow bg-white p-5 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-transform" data-testid={`user-card-${u.id}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-14 h-14 brutal-border bg-brand-yellow flex items-center justify-center font-display font-black text-2xl shrink-0">
                    {u.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-display font-black text-lg truncate">{u.name}</div>
                      {u.is_online && <span className="w-2 h-2 rounded-full bg-green-500" title="Online"></span>}
                    </div>
                    <div className="text-xs text-neutral-600 truncate">{u.college || '—'}</div>
                    <div className="text-xs mt-1 flex items-center gap-1">
                      <StarSolid className="w-3 h-3" /> {u.experience_level || 'Beginner'}
                    </div>
                  </div>
                </div>
                <div className="text-sm mb-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">Knows</div>
                  <div className="flex flex-wrap gap-1">
                    {(u.skills_known || []).slice(0, 4).map((s, i) => (
                      <span key={i} className="text-xs px-2 py-1 brutal-border bg-brand-mint font-medium">{s}</span>
                    ))}
                    {(u.skills_known || []).length === 0 && <span className="text-xs text-neutral-500">Not set</span>}
                  </div>
                </div>
                <div className="text-sm mb-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">Wants</div>
                  <div className="flex flex-wrap gap-1">
                    {(u.skills_wanted || []).slice(0, 4).map((s, i) => (
                      <span key={i} className="text-xs px-2 py-1 brutal-border bg-brand-coral font-medium">{s}</span>
                    ))}
                    {(u.skills_wanted || []).length === 0 && <span className="text-xs text-neutral-500">Not set</span>}
                  </div>
                </div>
                <Link
                  to={`/profile/${u.id}`}
                  className="block w-full text-center py-2 brutal-border bg-brand-yellow font-bold text-sm hover:bg-black hover:text-brand-cream transition-colors"
                  data-testid={`view-profile-${u.id}`}
                >
                  View profile →
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
