import Navbar from '../components/Navbar';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { formatApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { StarSolid, Star } from 'iconoir-react';

export default function Profile() {
  const { userId } = useParams();
  const { user: me } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [showRequest, setShowRequest] = useState(false);
  const [form, setForm] = useState({ message: '', offer_skill: '', want_skill: '' });
  const [busy, setBusy] = useState(false);
  const isSelf = me?.id === userId;

  useEffect(() => {
    (async () => {
      try {
        const [p, r] = await Promise.all([api.get(`/users/${userId}`), api.get(`/reviews/user/${userId}`)]);
        setProfile(p.data);
        setReviews(r.data);
      } catch {
        toast.error('User not found');
      }
    })();
  }, [userId]);

  const send = async () => {
    setBusy(true);
    try {
      await api.post('/exchanges', { to_user_id: userId, ...form });
      toast.success('Request sent!');
      setShowRequest(false);
      setForm({ message: '', offer_skill: '', want_skill: '' });
    } catch (e) {
      toast.error(formatApiError(e));
    }
    setBusy(false);
  };

  if (!profile) return (
    <div className="min-h-screen bg-brand-cream"><Navbar /><div className="p-10 font-display text-xl">Loading…</div></div>
  );

  return (
    <div className="min-h-screen bg-brand-cream">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-10">
        <div className="brutal-border brutal-shadow-lg bg-white p-8 mb-8" data-testid="profile-card">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-24 h-24 brutal-border bg-brand-yellow flex items-center justify-center font-display font-black text-4xl shrink-0">
              {profile.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="font-display font-black text-4xl tracking-tighter" data-testid="profile-name">{profile.name}</h1>
                {profile.is_online && <span className="px-2 py-1 brutal-border bg-brand-mint text-xs font-bold uppercase">Online</span>}
              </div>
              <div className="text-sm text-neutral-600 mb-3">
                {profile.college || 'College not set'} · {profile.experience_level || 'Beginner'}
                {profile.review_count > 0 && (
                  <span className="ml-3 inline-flex items-center gap-1">
                    <StarSolid className="w-4 h-4" /> {profile.avg_rating} ({profile.review_count} reviews)
                  </span>
                )}
              </div>
              {profile.bio && <p className="mb-4 text-neutral-800">{profile.bio}</p>}
              <div className="flex flex-wrap gap-2">
                {!isSelf && me?.role !== 'admin' && (
                  <button
                    onClick={() => setShowRequest(true)}
                    className="px-5 py-3 brutal-border bg-brand-yellow font-display font-bold brutal-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform"
                    data-testid="profile-send-request"
                  >
                    Send swap request →
                  </button>
                )}
                {isSelf && (
                  <button
                    onClick={() => nav('/edit-profile')}
                    className="px-5 py-3 brutal-border bg-white font-display font-bold brutal-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform"
                    data-testid="profile-edit-cta"
                  >
                    Edit profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="brutal-border bg-brand-mint p-6">
            <div className="text-xs font-bold uppercase tracking-[0.2em] mb-3">Skills known</div>
            <div className="flex flex-wrap gap-2">
              {(profile.skills_known || []).map((s, i) => (
                <span key={i} className="px-3 py-1 brutal-border bg-white font-semibold" data-testid={`skill-known-${i}`}>{s}</span>
              ))}
              {(profile.skills_known || []).length === 0 && <span className="text-neutral-600">Nothing added yet.</span>}
            </div>
          </div>
          <div className="brutal-border bg-brand-coral p-6">
            <div className="text-xs font-bold uppercase tracking-[0.2em] mb-3">Wants to learn</div>
            <div className="flex flex-wrap gap-2">
              {(profile.skills_wanted || []).map((s, i) => (
                <span key={i} className="px-3 py-1 brutal-border bg-white font-semibold" data-testid={`skill-wanted-${i}`}>{s}</span>
              ))}
              {(profile.skills_wanted || []).length === 0 && <span className="text-neutral-800">Nothing added yet.</span>}
            </div>
          </div>
        </div>

        <div className="brutal-border bg-white p-6">
          <h2 className="font-display font-black text-2xl mb-4">Reviews</h2>
          {reviews.length === 0 ? (
            <div className="text-neutral-600" data-testid="profile-no-reviews">No reviews yet.</div>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="p-4 brutal-border bg-brand-cream" data-testid={`review-${r.id}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-bold">{r.from_user_name}</div>
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map((n) => n <= r.rating ? <StarSolid key={n} className="w-4 h-4" /> : <Star key={n} className="w-4 h-4" />)}
                    </div>
                  </div>
                  {r.comment && <div className="text-sm text-neutral-700">{r.comment}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {showRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowRequest(false)}>
            <div className="brutal-border brutal-shadow-lg bg-white p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()} data-testid="request-modal">
              <h3 className="font-display font-black text-2xl mb-4">Send swap request</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.2em] mb-1">What you'll teach</label>
                  <input value={form.offer_skill} onChange={(e) => setForm({ ...form, offer_skill: e.target.value })} className="w-full px-3 py-2 brutal-border bg-brand-cream" placeholder="e.g. React" data-testid="request-offer-skill" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.2em] mb-1">What you want to learn</label>
                  <input value={form.want_skill} onChange={(e) => setForm({ ...form, want_skill: e.target.value })} className="w-full px-3 py-2 brutal-border bg-brand-cream" placeholder="e.g. UI/UX" data-testid="request-want-skill" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.2em] mb-1">Message</label>
                  <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} className="w-full px-3 py-2 brutal-border bg-brand-cream" placeholder="Hey! I'd love to swap skills with you…" data-testid="request-message" />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowRequest(false)} className="flex-1 px-4 py-2 brutal-border bg-white font-bold" data-testid="request-cancel">Cancel</button>
                <button onClick={send} disabled={busy} className="flex-1 px-4 py-2 brutal-border bg-brand-yellow font-bold brutal-shadow-sm disabled:opacity-60" data-testid="request-submit">
                  {busy ? 'Sending…' : 'Send →'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
