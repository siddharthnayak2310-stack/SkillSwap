import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { ArrowRight, GraduationCap, ChatBubble, StarSolid, Community } from 'iconoir-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-brand-cream grain-bg">
      <Navbar />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-16 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 brutal-border bg-brand-mint text-xs font-bold uppercase tracking-[0.2em] mb-6" data-testid="hero-badge">
              <span className="w-2 h-2 bg-black rounded-full animate-pulse"></span>
              Peer-to-peer learning
            </div>
            <h1 className="font-display font-black text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tighter mb-6">
              Trade skills.<br />
              <span className="bg-brand-yellow px-2 inline-block -rotate-1">Not dollars.</span>
            </h1>
            <p className="text-lg sm:text-xl text-neutral-700 max-w-2xl mb-10 leading-relaxed">
              You know <span className="font-bold text-black">React</span>. She knows <span className="font-bold text-black">UI/UX</span>. Instead of paying,
              you teach each other. SkillSwap matches you with peers who have exactly what you want to learn — and want exactly what you know.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/register"
                data-testid="hero-cta-signup"
                className="inline-flex items-center gap-2 px-6 py-4 font-display font-bold text-lg brutal-border bg-brand-yellow brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform"
              >
                Get started free <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/login"
                data-testid="hero-cta-login"
                className="inline-flex items-center gap-2 px-6 py-4 font-display font-bold text-lg brutal-border bg-white brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform"
              >
                I have an account
              </Link>
            </div>

            <div className="mt-12 flex items-center gap-4">
              <div className="flex -space-x-3">
                {['R', 'P', 'A', 'M'].map((c, i) => (
                  <div key={i} className={`w-10 h-10 brutal-border flex items-center justify-center font-display font-black ${['bg-brand-yellow','bg-brand-mint','bg-brand-coral','bg-white'][i]}`}>
                    {c}
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <div className="font-bold">Join the community</div>
                <div className="text-neutral-600">Students & professionals learning together</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 fade-up" style={{ animationDelay: '150ms' }}>
            <div className="relative">
              <div className="brutal-border brutal-shadow-lg bg-white p-6">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500 mb-4">Live match</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="brutal-border bg-brand-yellow p-4">
                    <div className="w-12 h-12 brutal-border bg-white flex items-center justify-center font-display font-black text-xl mb-3">R</div>
                    <div className="font-display font-black text-lg">Rahul</div>
                    <div className="text-xs mt-2 font-bold uppercase tracking-wider">Knows</div>
                    <div className="text-sm font-medium">React, Node.js</div>
                    <div className="text-xs mt-2 font-bold uppercase tracking-wider">Wants</div>
                    <div className="text-sm font-medium">UI/UX Design</div>
                  </div>
                  <div className="brutal-border bg-brand-mint p-4">
                    <div className="w-12 h-12 brutal-border bg-white flex items-center justify-center font-display font-black text-xl mb-3">P</div>
                    <div className="font-display font-black text-lg">Priya</div>
                    <div className="text-xs mt-2 font-bold uppercase tracking-wider">Knows</div>
                    <div className="text-sm font-medium">UI/UX Design</div>
                    <div className="text-xs mt-2 font-bold uppercase tracking-wider">Wants</div>
                    <div className="text-sm font-medium">React, Node.js</div>
                  </div>
                </div>
                <div className="mt-4 py-3 text-center brutal-border bg-brand-coral font-display font-black text-lg">
                  ⚡ Perfect Match
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 brutal-border bg-white px-4 py-2 brutal-shadow-sm font-display font-bold text-sm hidden sm:block">
                No money, only knowledge.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 pb-24">
        <h2 className="font-display font-black text-4xl sm:text-5xl tracking-tight mb-12">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: GraduationCap, title: '1. Set up your profile', desc: 'List the skills you know and the ones you want to learn. Add your college & experience.', bg: 'bg-brand-yellow' },
            { icon: Community, title: '2. Get matched', desc: 'Discover peers with complementary skills. Send a swap request in one click.', bg: 'bg-brand-mint' },
            { icon: ChatBubble, title: '3. Chat & learn', desc: 'Coordinate over chat, run sessions, then rate each other. Grow together.', bg: 'bg-brand-coral' },
          ].map((f, i) => (
            <div key={i} className={`${f.bg} brutal-border brutal-shadow p-8 fade-up`} style={{ animationDelay: `${i * 100}ms` }}>
              <f.icon className="w-10 h-10 mb-4" strokeWidth={2} />
              <div className="font-display font-black text-2xl mb-2">{f.title}</div>
              <div className="text-neutral-800">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats strip */}
      <section className="bg-black text-brand-cream py-16 border-t-2 border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { n: '∞', l: 'Skills possible' },
            { n: '0₹', l: 'Cost to learn' },
            { n: '1:1', l: 'Personal sessions' },
            { n: '5★', l: 'Peer reviewed' },
          ].map((s, i) => (
            <div key={i} data-testid={`stat-${i}`}>
              <div className="font-display font-black text-5xl sm:text-6xl mb-2">{s.n}</div>
              <div className="text-xs uppercase tracking-[0.2em] text-neutral-400">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-24">
        <div className="brutal-border brutal-shadow-lg bg-brand-yellow p-12 md:p-16 text-center">
          <StarSolid className="w-12 h-12 mx-auto mb-4" />
          <h2 className="font-display font-black text-4xl sm:text-5xl tracking-tight mb-4">Your next skill is one swap away.</h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto">Join students & pros exchanging real skills — free, human, effective.</p>
          <Link
            to="/register"
            data-testid="footer-cta-signup"
            className="inline-flex items-center gap-2 px-8 py-4 font-display font-black text-lg brutal-border bg-black text-brand-cream hover:bg-white hover:text-black transition-colors"
          >
            Create free account <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t-2 border-black py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-wrap justify-between items-center gap-4 text-sm">
          <div className="font-display font-black">SkillSwap © 2026</div>
          <div className="text-neutral-600">Built for learners, by learners.</div>
        </div>
      </footer>
    </div>
  );
}
