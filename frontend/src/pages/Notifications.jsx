import Navbar from '../components/Navbar';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { Bell, Check } from 'iconoir-react';

export default function Notifications() {
  const [items, setItems] = useState([]);

  const load = async () => {
    const { data } = await api.get('/notifications');
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const readAll = async () => {
    await api.post('/notifications/read-all');
    load();
  };

  return (
    <div className="min-h-screen bg-brand-cream">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-8 py-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-display font-black text-4xl tracking-tighter">Notifications</h1>
          <button onClick={readAll} className="px-4 py-2 brutal-border bg-white font-bold text-sm inline-flex items-center gap-1" data-testid="notif-read-all">
            <Check className="w-4 h-4" /> Mark all read
          </button>
        </div>

        {items.length === 0 ? (
          <div className="brutal-border bg-white p-12 text-center" data-testid="notif-empty">
            <Bell className="w-8 h-8 mx-auto mb-2" />
            <div className="font-display font-black text-2xl mb-1">All caught up</div>
            <div className="text-neutral-600">You have no notifications yet.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((n) => (
              <div key={n.id} className={`brutal-border p-4 flex items-start gap-3 ${n.read ? 'bg-white' : 'bg-brand-yellow'}`} data-testid={`notif-${n.id}`}>
                <Bell className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold">{n.message}</div>
                  <div className="text-xs text-neutral-600 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                </div>
                {n.link && (
                  <Link to={n.link} className="text-sm font-bold underline shrink-0" data-testid={`notif-open-${n.id}`}>Open →</Link>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
