import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import {
  Activity, ArrowRight, ArrowUpRight, Check, ChevronRight, Compass, Flag, Footprints,
  Layers3, LocateFixed, LogOut, MapPin, Menu, Play, Shield, Square, Swords, Timer, Trophy, X,
} from 'lucide-react';
import { api } from './api';
import TerritoryMap from './components/TerritoryMap';
import Dashboard from './Dashboard';

function formatDistance(meters) { return `${(meters / 1000).toFixed(2)} km`; }
function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
function formatDate(value) { return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
function trackDistance(points) {
  const radians = Math.PI / 180;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (a.accuracy > 50 || b.accuracy > 50) continue;
    const dLat = (b.lat - a.lat) * radians;
    const dLng = (b.lng - a.lng) * radians;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin(dLng / 2) ** 2;
    const segment = 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
    const seconds = (b.timestamp - a.timestamp) / 1000;
    if (seconds > 0 && segment / seconds <= 7.5) total += segment;
  }
  return total;
}

function Brand() {
  return <Link to="/" className="brand" aria-label="StrideGrid home">
    <span className="brand-mark"><Layers3 size={22} strokeWidth={2.8} /></span>
    <span>STRIDE<span className="brand-accent">GRID</span></span>
  </Link>;
}

function Shell({ user, onLogout, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="app-shell">
    <header className="site-header">
      <div className="header-inner">
        <Brand />
        <nav className={menuOpen ? 'main-nav open' : 'main-nav'} aria-label="Main navigation">
          <NavLink to={user ? '/dashboard' : '/'} end onClick={() => setMenuOpen(false)}>{user ? 'Dashboard' : 'Overview'}</NavLink>
          <NavLink to="/explore" onClick={() => setMenuOpen(false)}>Explore map</NavLink>
          <NavLink to="/leaderboard" onClick={() => setMenuOpen(false)}>Leaderboard</NavLink>
          {user && <NavLink to="/runs" onClick={() => setMenuOpen(false)}>My runs</NavLink>}
          {user && <button className="mobile-logout" onClick={() => { setMenuOpen(false); onLogout(); }}><LogOut size={17} /> Sign out</button>}
        </nav>
        <div className="header-actions">
          {user ? <>
            <span className="user-chip"><span>{user.name.charAt(0).toUpperCase()}</span>{user.name}</span>
            <button className="icon-button logout-button" title="Sign out" onClick={onLogout}><LogOut size={18} /></button>
          </> : <Link to="/login" className="header-login">Sign in <ArrowUpRight size={16} /></Link>}
          <button className="icon-button menu-button" aria-label="Toggle menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>
    </header>
    <main>{children}</main>
    <footer className="site-footer"><div className="footer-inner"><Brand /><span>Every route has a story. Make yours count.</span><span>© {new Date().getFullYear()} StrideGrid</span></div></footer>
  </div>;
}

function Metric({ icon: Icon, label, value, detail, tone = '' }) {
  return <div className={`metric-card ${tone}`}><div className="metric-top"><span>{label}</span><Icon size={19} /></div><strong>{value}</strong><small>{detail}</small></div>;
}

function SectionHeading({ eyebrow, title, aside }) {
  return <div className="section-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{aside}</div>;
}

function Overview({ user, territories, leaders, runs, activity, loading, error, live, onRetry }) {
  const mine = territories.filter((cell) => cell.owner?.id === user?.id).length;
  const defending = territories.filter((cell) => cell.owner?.id === user?.id && cell.challenger && new Date(cell.challengeExpiresAt) > new Date()).length;
  const totalDistance = runs.reduce((sum, run) => sum + run.distanceMeters, 0);
  return <>
    <section className="landing-hero"><div className="landing-hero-inner">
      <img className="landing-hero-photo" src="/images/hero-runners.png" alt="Three runners sharing a morning run on a tree-lined street" />
      <div className="landing-hero-shade" />
      <div className="landing-hero-copy">
        <span className="landing-kicker"><span className="landing-kicker-dot" /> YOUR CITY IS THE COURSE</span>
        <h1>Run the city.<br /><em>Make it yours.</em></h1>
        <p>Turn a real run into territory on a shared map. Discover new streets, challenge friends, and watch your city change one route at a time.</p>
        <div className="landing-hero-actions">
          <Link className="button landing-primary" to={user ? '/explore' : '/register'}>{user ? 'Explore your grid' : 'Start running'} <ArrowRight size={18} /></Link>
          <Link className="landing-secondary" to="/leaderboard">See the leaderboard <ArrowUpRight size={17} /></Link>
        </div>
        <div className="landing-hero-foot"><Footprints size={17} /> Real runs. Real streets. Your story on the map.</div>
      </div>
      <div className="landing-live-card" aria-live="polite">
        <div className="landing-live-top"><span className={live ? 'landing-live-dot connected' : 'landing-live-dot'} /> {live ? 'LIVE MAP' : 'MAP CONNECTING'} <Flag size={17} /></div>
        <strong>{territories.length}</strong>
        <span>territory spots on the map</span>
        <small>{activity.length ? `Latest run: ${activity[0].runner}` : 'Be the first to make a move.'}</small>
      </div>
    </div></section>
    {error && <div className="page-container"><div className="notice error">{error} <button onClick={onRetry}>Retry</button></div></div>}
    <section className="stats-section page-container"><div className="stats-intro"><span className="eyebrow">YOUR LITTLE CORNER OF THE MAP</span><h2>Every run adds up.</h2><p>{user ? `Welcome back, ${user.name.split(' ')[0]}. Here's what your routes have built so far.` : 'Create an account and start turning your routes into a story on the map.'}</p></div><div className="metrics-grid">
      <Metric icon={Flag} label="Your territory" value={user ? mine : '—'} detail="grid cells owned" tone="mint" />
      <Metric icon={Activity} label="Distance logged" value={user ? formatDistance(totalDistance) : '—'} detail="across qualifying runs" />
      <Metric icon={Shield} label="Needs defending" value={user ? defending : '—'} detail="contested cells" tone="peach" />
    </div></section>
    <section className="feature-section page-container"><SectionHeading eyebrow="HOW IT WORKS" title="A map that moves with you." aside={<Link className="section-link" to="/explore">Explore the map <ArrowUpRight size={17} /></Link>} />
      <div className="feature-layout"><div className="feature-map"><TerritoryMap territories={territories} userId={user?.id} height="380px" /><div className="map-corner-label"><span className="live-dot" /> {live ? 'LIVE TERRITORY MAP' : 'TERRITORY MAP'}</div></div><div className="feature-list">
        <div className="feature-item"><span className="feature-number">01</span><div><h3>Claim new ground</h3><p>Complete a qualifying run to mark unowned grid cells as yours.</p></div><Flag size={23} /></div>
        <div className="feature-item"><span className="feature-number">02</span><div><h3>Challenge the field</h3><p>Run through another runner’s cell to start a seven-day challenge.</p></div><Swords size={23} /></div>
        <div className="feature-item"><span className="feature-number">03</span><div><h3>Defend your grid</h3><p>Return to contested ground before the challenge ends to keep it.</p></div><Shield size={23} /></div>
        <Link to="/explore" className="feature-bottom-link">Explore the territory map <ArrowRight size={17} /></Link>
      </div></div>
    </section>
    <section className="bottom-cta"><div className="page-container bottom-cta-inner"><div><span className="eyebrow">READY WHEN YOU ARE</span><h2>See where a run takes you.</h2><p>One run is all it takes to get on the map.</p></div><Link to={user ? '/explore' : '/register'} className="button button-light">{user ? 'Start a run' : 'Create your account'} <ArrowRight size={18} /></Link></div></section>
  </>;
}

function Explore({ user, territories, refresh }) {
  const [points, setPoints] = useState([]);
  const [active, setActive] = useState(false);
  const [center, setCenter] = useState(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const watchRef = useRef(null);
  const pointsRef = useRef([]);
  const startedAtRef = useRef(null);
  const navigate = useNavigate();

  const stopWatching = useCallback(() => {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
  }, []);
  useEffect(() => () => stopWatching(), [stopWatching]);
  useEffect(() => {
    if (!active) return undefined;
    const tick = () => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [active]);

  const locate = () => {
    if (!navigator.geolocation) return setMessage('This browser does not support location tracking.');
    navigator.geolocation.getCurrentPosition(
      (position) => { setCenter([position.coords.latitude, position.coords.longitude]); setMessage(''); },
      () => setMessage('Location is unavailable. Check your browser permission and try again.'),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };
  const startRun = () => {
    if (!user) return navigate('/login');
    if (!navigator.geolocation) return setMessage('This browser does not support location tracking.');
    setPoints([]); pointsRef.current = []; startedAtRef.current = Date.now(); setElapsed(0); setResult(null); setMessage('Waiting for your first GPS point…');
    watchRef.current = navigator.geolocation.watchPosition((position) => {
      const point = {
        lat: position.coords.latitude, lng: position.coords.longitude,
        accuracy: position.coords.accuracy, timestamp: position.timestamp,
      };
      if (!Number.isFinite(point.accuracy) || point.accuracy > 50) {
        setMessage(Number.isFinite(point.accuracy)
          ? `GPS accuracy is ±${Math.round(point.accuracy)} m. Waiting for a clearer signal before drawing your route.`
          : 'Waiting for a GPS reading with a reliable accuracy estimate.');
        return;
      }
      const last = pointsRef.current.at(-1);
      if (!last || point.timestamp > last.timestamp) {
        pointsRef.current = [...pointsRef.current, point];
        setPoints(pointsRef.current);
        setCenter([point.lat, point.lng]);
        setMessage('');
      }
    }, (error) => {
      stopWatching(); setActive(false);
      setMessage(error.code === 1 ? 'Location permission is needed to record a run.' : 'GPS signal lost. Please try again outdoors.');
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
    setActive(true);
  };
  const finishRun = async () => {
    stopWatching(); setActive(false); setSubmitting(true); setMessage('');
    try {
      const data = await api('/runs', { method: 'POST', body: JSON.stringify({ points: pointsRef.current }) });
      setResult(data); refresh();
    } catch (error) { setMessage(error.message); }
    finally { setSubmitting(false); }
  };
  const mine = territories.filter((cell) => cell.owner?.id === user?.id).length;
  const contested = territories.filter((cell) => cell.challenger && new Date(cell.challengeExpiresAt) > new Date()).length;
  const firstCell = territories.find((cell) => cell.owner?.id === user?.id) || territories[0];
  const mapCenter = center || firstCell?.marker || (firstCell ? [
    (firstCell.bounds[0][0] + firstCell.bounds[1][0]) / 2,
    (firstCell.bounds[0][1] + firstCell.bounds[1][1]) / 2,
  ] : null);
  return <div className="inner-page page-container"><div className="page-title-row"><div><span className="eyebrow">THE PLAYING FIELD</span><h1>Explore the grid<span>.</span></h1><p>See who owns the ground, then get out and change it.</p></div><button className="button button-outline" onClick={locate}><LocateFixed size={18} /> My location</button></div>
    {message && <div className={active ? 'notice info' : 'notice error'}>{message}</div>}
    {result && <div className="notice success"><Check size={19} /> Run saved! {result.counts.claimed} claimed · {result.counts.contested} contested · {result.counts.captured} captured · {result.counts.defended} defended</div>}
    <div className="explore-layout"><div className="explore-map-panel"><TerritoryMap territories={territories} points={points} center={mapCenter} userId={user?.id} height="590px" /><div className="map-legend"><span><i className="legend-mine" /> Your cells</span><span><i className="legend-others" /> Other runners</span><span><i className="legend-contested" /> Contested</span></div></div>
      <aside className="explore-sidebar"><div className="sidebar-heading"><span className="eyebrow">RUN CONTROL</span><h2>Make your move.</h2><p>Keep this page open while you run. Qualifying runs need at least 1 km and 8 minutes.</p></div>
        <div className="run-panel"><div className="run-panel-top"><span className={active ? 'status-dot active' : 'status-dot'} />{active ? 'LIVE RUN IN PROGRESS' : 'READY TO RUN'}</div><div className="run-live-metric"><strong>{points.length}</strong><span>GPS points recorded</span></div>{active && <div className="tracker-live-stats"><span><Timer size={15} /> {formatDuration(elapsed)}</span><span><Footprints size={15} /> {formatDistance(trackDistance(points))}</span></div>}{points.length > 0 && <small className="accuracy-note">Latest accuracy: ±{Math.round(points.at(-1).accuracy)} m</small>}
          {active ? <button className="button button-stop" onClick={finishRun} disabled={submitting}><Square size={17} fill="currentColor" /> Finish run</button> : <button className="button button-primary full" onClick={startRun} disabled={submitting}><Play size={17} fill="currentColor" /> {submitting ? 'Saving run…' : 'Start run'}</button>}
          <span className="run-help">{active ? 'Move outdoors with a clear GPS signal.' : 'Location permission is requested when you start.'}</span>
        </div><div className="sidebar-stats"><div><Flag size={18}/><span>Your territory</span><strong>{user ? mine : '—'}</strong></div><div><Swords size={18}/><span>Contested cells</span><strong>{contested}</strong></div></div>
        <div className="privacy-card"><Shield size={19} /><div><strong>Your routes stay private.</strong><p>Other runners see coarse territory spots, not your exact GPS trail.</p></div></div>
      </aside></div></div>;
}

function Leaderboard({ leaders, loading, error, onRetry, user }) {
  return <div className="inner-page page-container narrow-page"><div className="page-title-row"><div><span className="eyebrow">THE PEOPLE TO BEAT</span><h1>Leaderboard<span>.</span></h1><p>Territory is earned one run at a time.</p></div><Trophy className="page-title-icon" size={52}/></div>
    <div className="leaderboard-card"><div className="table-header"><span>RANK / RUNNER</span><span>CELLS OWNED</span></div>
      {loading ? <div className="empty-state">Loading the leaderboard…</div> : error ? <div className="empty-state">{error} <button onClick={onRetry}>Retry</button></div> : leaders.length ? leaders.map((leader) => <div className="leader-row" key={leader.userId}><div className="leader-left"><span className={`rank rank-${leader.rank}`}>{String(leader.rank).padStart(2, '0')}</span><span className="leader-avatar">{leader.name.charAt(0).toUpperCase()}</span><strong>{leader.name}</strong>{leader.userId === user?.id && <span className="you-pill">YOU</span>}</div><strong className="leader-cells">{leader.cells} <span>cells</span></strong></div>) : <div className="empty-state"><Trophy size={32}/><h3>First place is still open.</h3><p>Complete the first qualifying run to put your name here.</p></div>}
    </div><div className="leaderboard-footnote"><Flag size={17} /> Rankings count currently owned territory cells.</div></div>;
}

function Runs({ user, runs, loading, error, onRetry }) {
  if (!user) return <AuthPrompt />;
  return <div className="inner-page page-container narrow-page"><div className="page-title-row"><div><span className="eyebrow">YOUR JOURNEY</span><h1>My runs<span>.</span></h1><p>Every route you’ve put on the map, all in one place.</p></div><Link to="/explore" className="button button-primary"><Play size={16} fill="currentColor" /> New run</Link></div>
    {loading ? <div className="empty-state panel">Loading your runs…</div> : error ? <div className="notice error">{error} <button onClick={onRetry}>Retry</button></div> : runs.length ? <div className="runs-list">{runs.map((run) => <div className="run-card" key={run._id}><div className="run-card-icon"><Footprints size={24}/></div><div className="run-card-main"><span>{formatDate(run.startedAt)}</span><h3>{formatDistance(run.distanceMeters)} run</h3><small><Timer size={14}/>{formatDuration(run.durationSeconds)} · {run.claimedCount} claimed · {run.capturedCount} captured · {run.defendedCount} defended</small></div><ChevronRight size={18}/></div>)}</div> : <div className="empty-state panel"><Footprints size={36}/><h3>Your first run is waiting.</h3><p>Head to the map, hit start, and claim your first grid.</p><Link to="/explore" className="button button-primary">Explore the map <ArrowRight size={17}/></Link></div>}</div>;
}

function AuthPrompt() { return <div className="inner-page page-container"><div className="empty-state panel"><MapPin size={36}/><h2>Sign in to see your journey.</h2><p>Your runs and territory are saved to your account.</p><Link className="button button-primary" to="/login">Sign in <ArrowRight size={17}/></Link></div></div>; }

function AuthPage({ mode, onAuth }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const isRegister = mode === 'register';
  const submit = async (event) => {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const data = await api(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(form) });
      onAuth(data.user); navigate('/dashboard');
    } catch (caught) { setError(caught.message); }
    finally { setBusy(false); }
  };
  return <div className="auth-page"><div className="auth-side"><div className="auth-side-content"><span className="eyebrow">A DIFFERENT WAY TO RUN</span><h2>Every street<br />is a <em>start line.</em></h2><p>Lace up. Go further. Make the map yours.</p></div><div className="auth-side-grid" /></div><div className="auth-form-side"><div className="auth-form-wrap"><span className="eyebrow">WELCOME TO STRIDEGRID</span><h1>{isRegister ? 'Create your account.' : 'Good to see you again.'}</h1><p>{isRegister ? 'Your next run could change the map.' : 'Sign in to pick up where you left off.'}</p>
      {error && <div className="notice error">{error}</div>}
      <form onSubmit={submit}>{isRegister && <label>Full name<input required minLength="2" maxLength="40" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" /></label>}
        <label>Email address<input required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label>
        <label>Password<input required type="password" minLength={isRegister ? 8 : undefined} autoComplete={isRegister ? 'new-password' : 'current-password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={isRegister ? 'At least 8 characters' : 'Your password'} /></label>
        <button className="button button-primary full" disabled={busy}>{busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'} <ArrowRight size={18}/></button>
      </form><div className="auth-switch">{isRegister ? 'Already have an account?' : 'New to StrideGrid?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link></div>
    </div></div></div>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [territories, setTerritories] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [runs, setRuns] = useState([]);
  const [activity, setActivity] = useState([]);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const refresh = useCallback(async (activeUser = user, quiet = false) => {
    if (!quiet) { setLoading(true); setError(''); }
    try {
      const [territoryData, leaderData, runData, activityData] = await Promise.all([
        api('/territories'), api('/leaderboard'), activeUser ? api('/runs') : Promise.resolve({ runs: [] }), api('/activity'),
      ]);
      setTerritories(territoryData.territories); setLeaders(leaderData.leaders); setRuns(runData.runs); setActivity(activityData.activity);
      setError('');
    } catch (caught) { if (!quiet) setError(caught.message); }
    finally { if (!quiet) setLoading(false); }
  }, [user]);
  useEffect(() => {
    api('/auth/me').then((data) => setUser(data.user)).catch(() => {}).finally(() => setAuthLoading(false));
  }, []);
  useEffect(() => { if (!authLoading) refresh(); }, [authLoading, user]);
  useEffect(() => {
    if (authLoading) return undefined;
    const events = new EventSource('/api/events');
    events.onopen = () => setLive(true);
    events.onerror = () => setLive(false);
    const update = () => refresh(user, true);
    events.addEventListener('run-completed', update);
    const polling = setInterval(update, 30_000);
    return () => { events.close(); clearInterval(polling); setLive(false); };
  }, [authLoading, user, refresh]);
  const handleLogout = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null); setRuns([]); navigate('/');
  };
  return <Shell user={user} onLogout={handleLogout}><Routes>
    <Route path="/" element={authLoading ? <div className="page-container inner-page">Loading your space…</div> : user ? <Navigate to="/dashboard" replace /> : <Overview user={user} territories={territories} leaders={leaders} runs={runs} activity={activity} loading={loading} error={error} live={live} onRetry={() => refresh()} />} />
    <Route path="/dashboard" element={authLoading ? <div className="page-container inner-page">Loading your space…</div> : user ? <Dashboard user={user} territories={territories} leaders={leaders} runs={runs} activity={activity} loading={loading} error={error} live={live} onRetry={() => refresh()} /> : <Navigate to="/login" replace />} />
    <Route path="/explore" element={<Explore user={user} territories={territories} refresh={() => refresh()} />} />
    <Route path="/leaderboard" element={<Leaderboard leaders={leaders} loading={loading} error={error} onRetry={() => refresh()} user={user} />} />
    <Route path="/runs" element={<Runs user={user} runs={runs} loading={loading} error={error} onRetry={() => refresh()} />} />
    <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage mode="login" onAuth={setUser} />} />
    <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage mode="register" onAuth={setUser} />} />
    <Route path="*" element={<div className="inner-page page-container"><div className="empty-state panel"><Compass size={36}/><h2>That route doesn’t exist.</h2><Link to="/" className="button button-primary">Back home <ArrowRight size={17}/></Link></div></div>} />
  </Routes></Shell>;
}
