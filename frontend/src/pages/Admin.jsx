import Navbar from '../components/Navbar';
import { useEffect, useState } from 'react';
import api, { formatApiError } from '../api/client';
import { toast } from 'sonner';
import { Trash, Community, StarSolid, ChatBubble, Group, WarningTriangle, Check, Xmark } from 'iconoir-react';

const StatCard = ({ label, value, bg, testid, icon: Icon }) => (
  <div className={`${bg} brutal-border brutal-shadow p-6`} data-testid={testid}>
    <div className="flex items-center justify-between mb-3">
      <div className="text-xs uppercase tracking-[0.2em] font-bold">{label}</div>
      {Icon && <Icon className="w-5 h-5" />}
    </div>
    <div className="font-display font-black text-5xl tracking-tighter">{value}</div>
  </div>
);

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  useEffect(() => { load(); }, []);

  const del = async (id, name) => {
    if (!window.confirm(`Delete user ${name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('User deleted');
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const filtered = users.filter((u) => !q || u.name?.toLowerCase().includes(q.toLowerCase()) || u.email?.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="brutal-border bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-display font-black text-2xl">Manage users</h2>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search users…"
          className="px-4 py-2 brutal-border bg-brand-cream w-full sm:w-64"
          data-testid="admin-search"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b-2 border-black">
              <th className="py-2 px-2 font-bold uppercase text-xs tracking-wider">Name</th>
              <th className="py-2 px-2 font-bold uppercase text-xs tracking-wider">Email</th>
              <th className="py-2 px-2 font-bold uppercase text-xs tracking-wider">Role</th>
              <th className="py-2 px-2 font-bold uppercase text-xs tracking-wider">Skills</th>
              <th className="py-2 px-2 font-bold uppercase text-xs tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-neutral-200" data-testid={`admin-user-${u.id}`}>
                <td className="py-3 px-2 font-semibold">{u.name}</td>
                <td className="py-3 px-2 text-neutral-600">{u.email}</td>
                <td className="py-3 px-2">
                  <span className={`text-xs font-bold uppercase px-2 py-1 brutal-border ${u.role === 'admin' ? 'bg-brand-coral' : 'bg-brand-mint'}`}>{u.role}</span>
                </td>
                <td className="py-3 px-2 text-xs text-neutral-600">{(u.skills_known || []).slice(0, 3).join(', ')}</td>
                <td className="py-3 px-2">
                  {u.role !== 'admin' && (
                    <button onClick={() => del(u.id, u.name)} className="p-2 brutal-border bg-brand-coral hover:bg-red-600 hover:text-white transition-colors" data-testid={`admin-delete-${u.id}`}>
                      <Trash className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportsTab() {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('open');

  const load = async () => {
    try {
      const params = filter ? { status: filter } : {};
      const { data } = await api.get('/admin/reports', { params });
      setReports(data);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  useEffect(() => { load(); }, [filter]);

  const action = async (id, status) => {
    try {
      await api.patch(`/admin/reports/${id}`, { status });
      toast.success(`Report ${status}`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const deleteUser = async (userId, name) => {
    if (!window.confirm(`Delete user ${name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success('User deleted');
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const badge = (s) => ({
    open: 'bg-brand-yellow',
    dismissed: 'bg-white',
    actioned: 'bg-brand-coral',
  }[s] || 'bg-white');

  return (
    <div className="brutal-border bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-display font-black text-2xl inline-flex items-center gap-2">
          <WarningTriangle className="w-6 h-6" /> Spam & abuse reports
        </h2>
        <div className="flex gap-2">
          {[['open', 'Open'], ['actioned', 'Actioned'], ['dismissed', 'Dismissed'], ['', 'All']].map(([k, label]) => (
            <button
              key={k || 'all'}
              onClick={() => setFilter(k)}
              className={`px-3 py-1 brutal-border text-sm font-bold ${filter === k ? 'bg-brand-yellow' : 'bg-white'}`}
              data-testid={`report-filter-${k || 'all'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {reports.length === 0 ? (
        <div className="p-6 brutal-border bg-brand-cream text-center" data-testid="admin-reports-empty">
          <div className="font-bold">No reports here.</div>
          <div className="text-sm text-neutral-600 mt-1">Nothing to review right now.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="brutal-border bg-brand-cream p-4" data-testid={`admin-report-${r.id}`}>
              <div className="flex flex-wrap justify-between items-start gap-3 mb-2">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">Reported user</div>
                  <div className="font-display font-black text-lg">{r.reported_user_name} <span className="text-sm font-normal text-neutral-600">({r.reported_user_email})</span></div>
                </div>
                <span className={`px-2 py-1 brutal-border text-xs font-bold uppercase ${badge(r.status)}`}>{r.status}</span>
              </div>
              <div className="text-xs text-neutral-500 mb-2">
                Reported by <b>{r.reporter_name}</b> · {new Date(r.created_at).toLocaleString()}
              </div>
              <div className="p-3 brutal-border bg-white text-sm mb-3">{r.reason}</div>
              {r.status === 'open' && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => action(r.id, 'dismissed')}
                    className="px-3 py-2 brutal-border bg-white font-bold text-sm inline-flex items-center gap-1"
                    data-testid={`admin-report-dismiss-${r.id}`}
                  >
                    <Xmark className="w-4 h-4" /> Dismiss
                  </button>
                  <button
                    onClick={async () => { await deleteUser(r.reported_user_id, r.reported_user_name); await action(r.id, 'actioned'); }}
                    className="px-3 py-2 brutal-border bg-brand-coral font-bold text-sm inline-flex items-center gap-1"
                    data-testid={`admin-report-delete-user-${r.id}`}
                  >
                    <Trash className="w-4 h-4" /> Delete user & close
                  </button>
                  <button
                    onClick={() => action(r.id, 'actioned')}
                    className="px-3 py-2 brutal-border bg-brand-mint font-bold text-sm inline-flex items-center gap-1"
                    data-testid={`admin-report-action-${r.id}`}
                  >
                    <Check className="w-4 h-4" /> Mark actioned
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState('users');
  const [openReports, setOpenReports] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [s, r] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/reports', { params: { status: 'open' } }),
        ]);
        setStats(s.data);
        setOpenReports(r.data.length);
      } catch (e) { toast.error(formatApiError(e)); }
    })();
  }, [tab]);

  return (
    <div className="min-h-screen bg-brand-cream">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
        <div className="mb-8">
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-neutral-500 mb-2">Admin panel</div>
          <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter">Platform overview</h1>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard label="Users" value={stats?.total_users ?? 0} bg="bg-brand-yellow" testid="admin-stat-users" icon={Group} />
          <StatCard label="Exchanges" value={stats?.total_exchanges ?? 0} bg="bg-brand-mint" testid="admin-stat-exchanges" icon={Community} />
          <StatCard label="Messages" value={stats?.total_messages ?? 0} bg="bg-brand-coral" testid="admin-stat-messages" icon={ChatBubble} />
          <StatCard label="Reviews" value={stats?.total_reviews ?? 0} bg="bg-white" testid="admin-stat-reviews" icon={StarSolid} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="brutal-border bg-white p-4">
            <div className="text-xs uppercase tracking-[0.2em] font-bold text-neutral-500">Active</div>
            <div className="font-display font-black text-3xl">{stats?.active_exchanges ?? 0}</div>
          </div>
          <div className="brutal-border bg-white p-4">
            <div className="text-xs uppercase tracking-[0.2em] font-bold text-neutral-500">Pending</div>
            <div className="font-display font-black text-3xl">{stats?.pending_exchanges ?? 0}</div>
          </div>
          <div className="brutal-border bg-white p-4">
            <div className="text-xs uppercase tracking-[0.2em] font-bold text-neutral-500">Completed</div>
            <div className="font-display font-black text-3xl">{stats?.completed_exchanges ?? 0}</div>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('users')}
            className={`px-4 py-2 brutal-border font-bold text-sm ${tab === 'users' ? 'bg-brand-yellow brutal-shadow-sm' : 'bg-white'}`}
            data-testid="admin-tab-users"
          >
            Users
          </button>
          <button
            onClick={() => setTab('reports')}
            className={`px-4 py-2 brutal-border font-bold text-sm inline-flex items-center gap-2 ${tab === 'reports' ? 'bg-brand-yellow brutal-shadow-sm' : 'bg-white'}`}
            data-testid="admin-tab-reports"
          >
            Reports
            {openReports > 0 && <span className="bg-brand-coral brutal-border px-2 py-0.5 text-xs font-bold" data-testid="admin-tab-reports-count">{openReports}</span>}
          </button>
        </div>

        {tab === 'users' && <UsersTab />}
        {tab === 'reports' && <ReportsTab />}
      </main>
    </div>
  );
}
