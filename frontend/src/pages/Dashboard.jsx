import Navbar from '../components/Navbar';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, ChatBubble, StarSolid, Community, Sparks } from 'iconoir-react';

const StatCard = ({ label, value, bg, testid }) => (
  <div className={`${bg} brutal-border brutal-shadow p-6`} data-testid={testid}>
    <div className="text-xs uppercase tracking-[0.2em] font-bold text-neutral-800 mb-3">{label}</div>
    <div className="font-display font-black text-5xl tracking-tighter">{value}</div>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [exchanges, setExchanges] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [s, ex] = await Promise.all([api.get('/dashboard'), api.get('/exchanges')]);
        setStats(s.data);
        setExchanges(ex.data.slice(0, 5));
      } catch {}
    })();
  }, []);

  return (
    <div className="min-h-screen bg-brand-cream">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] font-bold text-neutral-500 mb-2">Dashboard</div>
            <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter" data-testid="dashboard-greeting">
              Hi, {user?.name} 👋
            </h1>
            <p className="text-neutral-700 mt-2">Here's what's happening with your skill swaps.</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/discover"
              data-testid="dashboard-discover-cta"
              className="px-5 py-3 brutal-border bg-brand-yellow font-display font-bold brutal-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform"
            >
              <Sparks className="inline w-4 h-4 mr-1" /> Find matches
            </Link>
            <Link
              to="/edit-profile"
              data-testid="dashboard-edit-profile"
              className="px-5 py-3 brutal-border bg-white font-display font-bold brutal-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform"
            >
              Edit profile
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <StatCard label="Skills Taught" value={stats?.skills_taught ?? 0} bg="bg-brand-yellow" testid="stat-taught" />
          <StatCard label="Skills Learned" value={stats?.skills_learned ?? 0} bg="bg-brand-mint" testid="stat-learned" />
          <StatCard label="Active Swaps" value={stats?.active_exchanges ?? 0} bg="bg-brand-coral" testid="stat-active" />
          <StatCard label="Avg Rating" value={stats?.avg_rating ?? 0} bg="bg-white" testid="stat-rating" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 brutal-border bg-white p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display font-black text-2xl">Recent exchanges</h2>
              <Link to="/requests" className="text-sm font-bold underline" data-testid="dashboard-view-all-requests">View all →</Link>
            </div>
            {exchanges.length === 0 ? (
              <div className="p-6 bg-brand-cream brutal-border text-center" data-testid="dashboard-empty-exchanges">
                <Community className="w-8 h-8 mx-auto mb-2" />
                <div className="font-bold mb-1">No swaps yet</div>
                <div className="text-sm text-neutral-600">Head to Discover to find your first learning partner.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {exchanges.map((e) => (
                  <div key={e.id} className="flex items-center justify-between p-4 brutal-border bg-brand-cream" data-testid={`exchange-row-${e.id}`}>
                    <div>
                      <div className="font-bold">
                        {e.from_user_id === user.id ? `→ ${e.to_user_name}` : `← ${e.from_user_name}`}
                      </div>
                      <div className="text-xs text-neutral-600">{e.offer_skill && `Offers: ${e.offer_skill}`} {e.want_skill && ` · Wants: ${e.want_skill}`}</div>
                    </div>
                    <div className={`text-xs font-bold uppercase tracking-wider px-2 py-1 brutal-border ${
                      e.status === 'accepted' ? 'bg-brand-mint' :
                      e.status === 'pending' ? 'bg-brand-yellow' :
                      e.status === 'rejected' ? 'bg-brand-coral' : 'bg-white'
                    }`}>{e.status}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="brutal-border bg-brand-mint p-6">
            <h2 className="font-display font-black text-2xl mb-4">Quick tips</h2>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-3"><GraduationCap className="w-5 h-5 shrink-0" /><span>Add 3–5 skills you know and 2–3 you want to learn for the best matches.</span></li>
              <li className="flex gap-3"><ChatBubble className="w-5 h-5 shrink-0" /><span>Send a short intro message with your swap request — it boosts acceptance.</span></li>
              <li className="flex gap-3"><StarSolid className="w-5 h-5 shrink-0" /><span>Rate every completed swap. Reviews build trust & better matches.</span></li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
