import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, ArrowUpRight, Flag, Footprints,
  MapPinned, Play, Radio, Shield, Sparkles, Trophy,
} from 'lucide-react';
import TerritoryMap from './components/TerritoryMap';
import './dashboard.css';

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

function AnimatedCount({ value, suffix = '' }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value);
      return undefined;
    }
    const started = performance.now();
    let frame;
    const tick = (now) => {
      const progress = Math.min(1, (now - started) / 750);
      setDisplay(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{display}{suffix}</>;
}

function relativeTime(date) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function weeklyBars(runs) {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - index));
    const next = new Date(day);
    next.setDate(day.getDate() + 1);
    const meters = runs.filter((run) => {
      const at = new Date(run.startedAt);
      return at >= day && at < next;
    }).reduce((total, run) => total + run.distanceMeters, 0);
    return { label: day.toLocaleDateString(undefined, { weekday: 'short' }), meters };
  });
}

export default function Dashboard({ user, territories, leaders, runs, activity, loading, error, live, onRetry }) {
  const mine = territories.filter((cell) => cell.owner?.id === user.id).length;
  const defending = territories.filter((cell) => cell.owner?.id === user.id && cell.challenger && new Date(cell.challengeExpiresAt) > new Date()).length;
  const totalMeters = runs.reduce((total, run) => total + run.distanceMeters, 0);
  const rank = leaders.find((leader) => leader.userId === user.id)?.rank;
  const bars = weeklyBars(runs);
  const maxBar = Math.max(1000, ...bars.map((bar) => bar.meters));
  const firstCell = territories.find((cell) => cell.owner?.id === user.id) || territories[0];
  const mapCenter = firstCell?.marker || (firstCell ? [
    (firstCell.bounds[0][0] + firstCell.bounds[1][0]) / 2,
    (firstCell.bounds[0][1] + firstCell.bounds[1][1]) / 2,
  ] : null);

  return <div className="dashboard page-container">
    <div className="dashboard-heading">
      <div>
        <span className="eyebrow">YOUR RUNNING SPACE</span>
        <h1>{greeting()}, {user.name.split(' ')[0]} <span className="wave" aria-hidden="true">✳</span></h1>
        <p>Here’s what’s happening on your grid today.</p>
      </div>
      <Link to="/explore" className="button button-primary"><Play size={16} fill="currentColor" /> {user.isDemo ? 'Explore sample map' : 'Start a run'}</Link>
    </div>

    {error && <div className="notice error">{error} <button onClick={onRetry}>Retry</button></div>}

    <div className="dashboard-stats">
      <div className="dash-stat mint"><div className="dash-stat-top"><span>Your territory</span><Flag size={19} /></div><strong><AnimatedCount value={mine} /></strong><small>cells on the map</small></div>
      <div className="dash-stat"><div className="dash-stat-top"><span>Distance run</span><Footprints size={19} /></div><strong>{(totalMeters / 1000).toFixed(1)} <i>km</i></strong><small>across {runs.length} {runs.length === 1 ? 'run' : 'runs'}</small></div>
      <div className="dash-stat peach"><div className="dash-stat-top"><span>Defend your grid</span><Shield size={19} /></div><strong><AnimatedCount value={defending} /></strong><small>{defending ? 'cells under challenge' : 'all clear for now'}</small></div>
      <div className="dash-stat"><div className="dash-stat-top"><span>Leaderboard</span><Trophy size={19} /></div><strong>{rank ? `#${rank}` : '—'}</strong><small>{rank ? 'your current rank' : mine ? 'outside the top ten' : 'claim a cell to rank'}</small></div>
    </div>

    <div className="dashboard-main-grid">
      <section className="dash-panel dash-map-panel">
        <div className="dash-panel-heading"><div><span className="eyebrow">YOUR WORLD</span><h2>Territory map</h2></div><Link to="/explore" className="dash-panel-link">Open map <ArrowUpRight size={16} /></Link></div>
        <div className="dash-map"><TerritoryMap territories={territories} userId={user.id} center={mapCenter} height="390px" /><div className="dash-map-badge"><span className={live ? 'live-beacon on' : 'live-beacon'} />{live ? 'LIVE MAP' : 'CONNECTING'}</div></div>
        <div className="dash-map-caption"><span><i className="legend-mine" /> Yours</span><span><i className="legend-others" /> Other runners</span><span><i className="legend-contested" /> Contested</span></div>
      </section>

      <div className="dashboard-side-stack">
        <section className="dash-panel dash-quickstart"><div className="quickstart-orbit orbit-a" /><div className="quickstart-orbit orbit-b" /><span className="eyebrow">{user.isDemo ? 'SAMPLE PREVIEW' : 'NEXT UP'}</span><div className="quickstart-icon"><MapPinned size={28} /></div><h2>{user.isDemo ? 'See the territory game.' : 'Your next route is waiting.'}</h2><p>{user.isDemo ? 'Explore sample claims and a contested cell on the map.' : 'Head out, record a run, and see your territory grow in real time.'}</p><Link to="/explore" className="button button-primary">{user.isDemo ? 'Explore sample map' : 'Open run tracker'} <ArrowRight size={17} /></Link></section>
        <section className="dash-panel dash-rhythm"><div className="dash-panel-heading"><div><span className="eyebrow">LAST 7 DAYS</span><h2>Your rhythm</h2></div><Activity size={20} /></div><div className="rhythm-chart" aria-label="Distance run each day in the last week">{bars.map((bar, index) => <div className="rhythm-day" key={`${bar.label}-${index}`} title={`${bar.label}: ${(bar.meters / 1000).toFixed(1)} km`}><div className="rhythm-track"><span style={{ '--bar-height': `${bar.meters ? Math.max(8, Math.round(bar.meters / maxBar * 100)) : 0}%`, '--bar-delay': `${index * 65}ms` }} /></div><small>{bar.label.slice(0, 2)}</small></div>)}</div><p>Small steps still count. Keep your streak going.</p></section>
      </div>
    </div>

    <div className="dashboard-bottom-grid">
      <section className="dash-panel dash-list-panel"><div className="dash-panel-heading"><div><span className="eyebrow">YOUR JOURNEY</span><h2>Recent runs</h2></div><Link to="/runs" className="dash-panel-link">View all <ArrowUpRight size={16} /></Link></div>
        {loading ? <div className="dash-empty">Loading your runs…</div> : runs.length ? runs.slice(0, 3).map((run) => <div className="dash-list-row" key={run._id}><span className="dash-list-icon"><Footprints size={18} /></span><div><strong>{(run.distanceMeters / 1000).toFixed(2)} km run</strong><small>{relativeTime(run.startedAt)} · {run.claimedCount} claimed · {run.capturedCount} captured</small></div><ArrowUpRight size={16} /></div>) : <div className="dash-empty"><Sparkles size={25} /><strong>Your first run starts here.</strong><span>Open the tracker when you’re ready.</span></div>}
      </section>
      <section className="dash-panel dash-list-panel"><div className="dash-panel-heading"><div><span className="eyebrow">HAPPENING NOW</span><h2>Live activity</h2></div><span className={live ? 'live-pill active' : 'live-pill'}><Radio size={14} /> {live ? 'Live' : 'Offline'}</span></div>
        {loading ? <div className="dash-empty">Loading activity…</div> : activity.length ? activity.slice(0, 3).map((event) => <div className="dash-list-row" key={event.id}><span className="dash-list-icon activity-icon"><Flag size={18} /></span><div><strong>{event.runner} completed a run</strong><small>{event.claimed} claimed · {event.captured} captured · {relativeTime(event.at)}</small></div></div>) : <div className="dash-empty"><Radio size={25} /><strong>It’s quiet out there.</strong><span>Completed runs will appear here as they happen.</span></div>}
      </section>
    </div>
  </div>;
}
