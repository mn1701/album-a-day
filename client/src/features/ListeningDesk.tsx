import { useEffect, useState } from 'react';
type Album = { id: string; title: string; artist: string };
type Pick = { album: Album; reasons: string[]; rank_score: number };
type Profile = { id: string; name: string };
export function ListeningDesk() {
  const [profiles, setProfiles] = useState<Profile[]>([]), [profile, setProfile] = useState('local');
  const [picks, setPicks] = useState<Pick[]>([]), [queue, setQueue] = useState<Album[]>([]);
  const [error, setError] = useState(''), [note, setNote] = useState(''), [rating, setRating] = useState(4);
  const [album, setAlbum] = useState(''), [busy, setBusy] = useState(false);
  async function call<T>(path: string, body?: unknown, method = 'POST'): Promise<T> {
    const r = await fetch(`/api${path}?profile=${encodeURIComponent(profile)}`, body === undefined ? {} : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (r.status === 204) return undefined as T;
    const value = await r.json(); if (!r.ok) throw new Error(value.error); return value;
  }
  async function load() {
    const [p, r, q] = await Promise.all([call<Profile[]>('/profiles'), call<Pick[]>('/recommendations'), call<Album[]>('/queue')]);
    setProfiles(p); setPicks(r); setQueue(q);
  }
  useEffect(() => { load().catch(e => setError(String(e))); }, [profile]);
  async function action(work: () => Promise<unknown>) { setBusy(true); setError(''); try { await work(); await load(); } catch (e) { setError(String(e)); } finally { setBusy(false); } }
  return <section className="listening-desk"><h2>Personal listening desk</h2>
    <label>Profile <select value={profile} onChange={e => { setProfile(e.target.value); setAlbum(''); }}>{profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <form onSubmit={e => { e.preventDefault(); const form=e.currentTarget;const data = new FormData(form); void action(async () => { await call('/profiles', { id: data.get('id'), name: data.get('name') }); form.reset(); }); }}>
      <input name="id" placeholder="Profile ID" pattern="[a-z0-9_-]{1,40}" required /><input name="name" placeholder="Display name" required /><button disabled={busy}>Add profile</button>
    </form>{error && <p role="alert">{error}</p>}
    <div className="desk-grid"><div><h3>Recommended for this profile</h3>{picks.map(p => <article key={p.album.id}><strong>{p.album.title}</strong><p>{p.album.artist}</p><ul>{p.reasons.map(r => <li key={r}>{r}</li>)}</ul><button disabled={busy} onClick={() => action(() => call('/queue', { album_id: p.album.id }))}>Queue album</button><button onClick={() => setAlbum(p.album.id)}>Log a listen</button></article>)}</div>
      <div><h3>Listen next</h3>{queue.map(a => <article key={a.id}><strong>{a.title}</strong><p>{a.artist}</p><button onClick={() => setAlbum(a.id)}>Log listen</button><button disabled={busy} onClick={() => action(() => call(`/queue/${encodeURIComponent(a.id)}`, {}, 'DELETE'))}>Remove</button></article>)}
        {album && <form onSubmit={e => { e.preventDefault(); void action(async () => { await call('/listens', { album_id: album, rating, note }); setNote(''); setAlbum(''); }); }}><h3>Listening notes for {album}</h3><label>Rating<input type="number" min="1" max="5" value={rating} onChange={e => setRating(Number(e.target.value))} /></label><textarea value={note} maxLength={4000} onChange={e => setNote(e.target.value)} placeholder="What stood out?" /><button disabled={busy}>Save listening note</button></form>}
        <a href={`/api/export?profile=${encodeURIComponent(profile)}`}>Export profile data</a>
      </div></div>
  </section>;
}
