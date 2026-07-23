import Navbar from '../components/Navbar';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { formatApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { StarSolid, Star, Check, Xmark, ChatBubble } from 'iconoir-react';

const StatusBadge = ({ status }) => {
  const map = {
    pending: 'bg-brand-yellow',
    accepted: 'bg-brand-mint',
    rejected: 'bg-brand-coral',
    completed: 'bg-white',
  };
  return <span className={`px-2 py-1 brutal-border text-xs font-bold uppercase ${map[status] || 'bg-white'}`}>{status}</span>;
};

function ReviewModal({ exchange, onClose, onDone }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const other = exchange.from_user_id === user.id ? exchange.to_user_id : exchange.from_user_id;

  const submit = async () => {
    setBusy(true);
    try {
      await api.post('/reviews', { exchange_id: exchange.id, to_user_id: other, rating, comment });
      toast.success('Review submitted');
      onDone();
    } catch (e) {
      toast.error(formatApiError(e));
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="brutal-border brutal-shadow-lg bg-white p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()} data-testid="review-modal">
        <h3 className="font-display font-black text-2xl mb-4">Rate this swap</h3>
        <div className="flex gap-1 mb-4">
          {[1,2,3,4,5].map((n) => (
            <button key={n} onClick={() => setRating(n)} data-testid={`rate-${n}`}>
              {n <= rating ? <StarSolid className="w-8 h-8" /> : <Star className="w-8 h-8" />}
            </button>
          ))}
        </div>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="How was your session?" className="w-full px-3 py-2 brutal-border bg-brand-cream" data-testid="review-comment" />
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-2 brutal-border bg-white font-bold" data-testid="review-cancel">Cancel</button>
          <button onClick={submit} disabled={busy} className="flex-1 py-2 brutal-border bg-brand-yellow font-bold brutal-shadow-sm disabled:opacity-60" data-testid="review-submit">
            {busy ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Requests() {
  const { user } = useAuth();
  const [exchanges, setExchanges] = useState([]);
  const [tab, setTab] = useState('incoming');
  const [reviewing, setReviewing] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get('/exchanges');
      setExchanges(data);
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const act = async (id, status) => {
    try {
      await api.patch(`/exchanges/${id}`, { status });
      toast.success(`Marked ${status}`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const incoming = exchanges.filter((e) => e.to_user_id === user.id);
  const outgoing = exchanges.filter((e) => e.from_user_id === user.id);
  const list = tab === 'incoming' ? incoming : outgoing;

  return (
    <div className="min-h-screen bg-brand-cream">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-10">
        <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter mb-6">Requests & swaps</h1>

        <div className="flex gap-2 mb-6">
          {[['incoming', `Incoming (${incoming.length})`, 'tab-incoming'], ['outgoing', `Outgoing (${outgoing.length})`, 'tab-outgoing']].map(([k, label, tid]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              data-testid={tid}
              className={`px-4 py-2 brutal-border font-bold text-sm ${tab === k ? 'bg-brand-yellow brutal-shadow-sm' : 'bg-white'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="brutal-border bg-white p-12 text-center" data-testid="requests-empty">
            <div className="font-display font-black text-2xl mb-2">Nothing here yet</div>
            <div className="text-neutral-600">Head to Discover to send your first swap request.</div>
          </div>
        ) : (
          <div className="space-y-4">
            {list.map((e) => {
              const otherName = e.from_user_id === user.id ? e.to_user_name : e.from_user_name;
              const otherId = e.from_user_id === user.id ? e.to_user_id : e.from_user_id;
              return (
                <div key={e.id} className="brutal-border bg-white p-5" data-testid={`request-${e.id}`}>
                  <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 brutal-border bg-brand-yellow flex items-center justify-center font-display font-black text-xl">
                        {otherName?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <Link to={`/profile/${otherId}`} className="font-display font-black text-lg hover:underline">{otherName}</Link>
                        <div className="text-xs text-neutral-500">{new Date(e.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                    <StatusBadge status={e.status} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 text-sm">
                    {e.offer_skill && <div className="p-2 brutal-border bg-brand-mint"><span className="text-xs font-bold uppercase tracking-wider">Teaches: </span>{e.offer_skill}</div>}
                    {e.want_skill && <div className="p-2 brutal-border bg-brand-coral"><span className="text-xs font-bold uppercase tracking-wider">Wants: </span>{e.want_skill}</div>}
                  </div>
                  {e.message && <div className="p-3 brutal-border bg-brand-cream text-sm mb-3">{e.message}</div>}
                  <div className="flex flex-wrap gap-2">
                    {tab === 'incoming' && e.status === 'pending' && (
                      <>
                        <button onClick={() => act(e.id, 'accepted')} className="px-4 py-2 brutal-border bg-brand-mint font-bold text-sm inline-flex items-center gap-1" data-testid={`accept-${e.id}`}>
                          <Check className="w-4 h-4" /> Accept
                        </button>
                        <button onClick={() => act(e.id, 'rejected')} className="px-4 py-2 brutal-border bg-brand-coral font-bold text-sm inline-flex items-center gap-1" data-testid={`reject-${e.id}`}>
                          <Xmark className="w-4 h-4" /> Reject
                        </button>
                      </>
                    )}
                    {e.status === 'accepted' && (
                      <>
                        <Link to={`/chat/${e.id}`} className="px-4 py-2 brutal-border bg-brand-yellow font-bold text-sm inline-flex items-center gap-1" data-testid={`chat-${e.id}`}>
                          <ChatBubble className="w-4 h-4" /> Open chat
                        </Link>
                        <button onClick={() => act(e.id, 'completed')} className="px-4 py-2 brutal-border bg-white font-bold text-sm" data-testid={`complete-${e.id}`}>
                          Mark complete
                        </button>
                      </>
                    )}
                    {e.status === 'completed' && (
                      <button onClick={() => setReviewing(e)} className="px-4 py-2 brutal-border bg-brand-yellow font-bold text-sm inline-flex items-center gap-1" data-testid={`review-${e.id}`}>
                        <StarSolid className="w-4 h-4" /> Leave review
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {reviewing && <ReviewModal exchange={reviewing} onClose={() => setReviewing(null)} onDone={() => { setReviewing(null); load(); }} />}
      </main>
    </div>
  );
}
