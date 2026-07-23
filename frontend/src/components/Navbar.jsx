import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import api from '../api/client';
import { Bell, LogOut, Menu, Xmark } from 'iconoir-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const { data } = await api.get('/notifications');
        setUnread(data.filter((n) => !n.read).length);
      } catch {}
    };
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [user, loc.pathname]);

  const doLogout = async () => {
    await logout();
    nav('/');
  };

  const link = (to, label, testid) => (
    <Link
      to={to}
      data-testid={testid}
      className={`px-3 py-2 font-medium text-sm hover:bg-brand-yellow transition-colors ${
        loc.pathname === to ? 'bg-brand-yellow' : ''
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="sticky top-0 z-50 bg-brand-cream border-b-2 border-black" data-testid="app-navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
        <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2" data-testid="nav-logo">
          <div className="w-9 h-9 bg-brand-yellow brutal-border brutal-shadow-sm flex items-center justify-center font-display font-black text-lg">
            S
          </div>
          <span className="font-display font-black text-xl tracking-tight">SkillSwap</span>
        </Link>

        <div className="hidden md:flex items-center gap-2">
          {user && link('/dashboard', 'Dashboard', 'nav-dashboard')}
          {user && link('/discover', 'Discover', 'nav-discover')}
          {user && link('/requests', 'Requests', 'nav-requests')}
          {user && user.role === 'admin' && link('/admin', 'Admin', 'nav-admin')}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/notifications"
                className="relative p-2 brutal-border bg-white hover:bg-brand-mint transition-colors"
                data-testid="nav-notifications"
              >
                <Bell className="w-5 h-5" />
                {unread > 0 && (
                  <span className="absolute -top-2 -right-2 bg-brand-coral brutal-border text-black text-xs font-bold w-5 h-5 flex items-center justify-center" data-testid="nav-notif-count">
                    {unread}
                  </span>
                )}
              </Link>
              <Link
                to={`/profile/${user.id}`}
                className="hidden sm:flex items-center gap-2 px-3 py-2 brutal-border bg-white hover:bg-brand-mint transition-colors"
                data-testid="nav-profile"
              >
                <div className="w-6 h-6 bg-brand-coral brutal-border flex items-center justify-center font-display font-bold text-xs">
                  {user.name?.[0]?.toUpperCase()}
                </div>
                <span className="text-sm font-medium">{user.name}</span>
              </Link>
              <button
                onClick={doLogout}
                className="p-2 brutal-border bg-white hover:bg-brand-coral transition-colors"
                data-testid="nav-logout"
                aria-label="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-2 brutal-border bg-white"
                data-testid="nav-mobile-toggle"
              >
                {menuOpen ? <Xmark className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-4 py-2 font-semibold text-sm hover:bg-brand-mint transition-colors" data-testid="nav-login">
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 font-semibold text-sm brutal-border bg-brand-yellow brutal-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform"
                data-testid="nav-register"
              >
                Sign up →
              </Link>
            </>
          )}
        </div>
      </div>
      {menuOpen && user && (
        <div className="md:hidden border-t-2 border-black bg-brand-cream" data-testid="nav-mobile-menu">
          <div className="flex flex-col p-2">
            <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="px-3 py-2 hover:bg-brand-yellow" data-testid="m-nav-dashboard">Dashboard</Link>
            <Link to="/discover" onClick={() => setMenuOpen(false)} className="px-3 py-2 hover:bg-brand-yellow" data-testid="m-nav-discover">Discover</Link>
            <Link to="/requests" onClick={() => setMenuOpen(false)} className="px-3 py-2 hover:bg-brand-yellow" data-testid="m-nav-requests">Requests</Link>
            <Link to={`/profile/${user.id}`} onClick={() => setMenuOpen(false)} className="px-3 py-2 hover:bg-brand-yellow" data-testid="m-nav-profile">Profile</Link>
            {user.role === 'admin' && <Link to="/admin" onClick={() => setMenuOpen(false)} className="px-3 py-2 hover:bg-brand-yellow" data-testid="m-nav-admin">Admin</Link>}
          </div>
        </div>
      )}
    </nav>
  );
}
