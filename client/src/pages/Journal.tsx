import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { Album, Listen } from '../lib/types';
import { useLibrary } from '../state/LibraryProvider';
import { AlbumArt } from '../components/AlbumArt';
import { EmptyState, SectionTitle } from '../components/ui/State';
export default function Journal({ onSelect }: { onSelect(album: Album, listen?: Listen): void }) {
  const { profile, revision, mutate, busy } = useLibrary(); const [entries, setEntries] = useState<Listen[]>([]), [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [query, setQuery] = useState(''), [rating, setRating] = useState(0), [armed, setArmed] = useState<number | null>(null);
  const epoch = useRef(0); const fetching = useRef(false); const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController(); abort.current = controller; const current = ++epoch.current; fetching.current = true; setLoading(true); setEntries([]); setCursor(null); setArmed(null); setError('');
    api.history(profile, undefined, controller.signal).then(result => { if (current === epoch.current && !controller.signal.aborted) { setEntries(result.entries); setCursor(result.cursor); } }).catch(e => { if (!controller.signal.aborted && current === epoch.current) setError(String(e)); }).finally(() => { if (!controller.signal.aborted && current === epoch.current) { fetching.current = false; setLoading(false); } });
    return () => controller.abort();
  }, [profile, revision]);
  async function more() {
    if (!cursor || fetching.current) return; fetching.current = true; setLoading(true); const current = epoch.current;
    try { const result = await api.history(profile, cursor, abort.current?.signal); if (current !== epoch.current) return; setEntries(previous => Array.from(new Map([...previous, ...result.entries].map(entry => [entry.listen_id, entry])).values())); setCursor(result.cursor); }
    catch (e) { if (current === epoch.current && !abort.current?.signal.aborted) setError(String(e)); }
    finally { if (current === epoch.current) { fetching.current = false; setLoading(false); } }
  }
  const needle = query.toLocaleLowerCase(); const visible = entries.filter(entry => (!rating || entry.rating === rating) && [entry.title, entry.artist, entry.note].join(' ').toLocaleLowerCase().includes(needle));
  return <><SectionTitle eyebrow="YOUR LISTENING JOURNAL" title="Every record leaves a trace.">Keep the impressions that matter. Entries can be revisited, edited, or removed.</SectionTitle>
    <div className="mb-2 grid gap-3 sm:grid-cols-[1fr_160px]"><input aria-label="Search loaded listening entries" className="input" placeholder="Search albums, artists, or notes" value={query} onChange={e => setQuery(e.target.value)} /><select className="input" aria-label="Rating filter" value={rating} onChange={e => setRating(Number(e.target.value))}><option value={0}>All ratings</option>{[5, 4, 3, 2, 1].map(value => <option value={value} key={value}>{value} stars</option>)}</select></div><p className="mb-6 text-xs text-stone-400">Filters apply to the {entries.length} loaded entries. Load more to search further back.</p>
    {error && <p className="mb-4 text-sm text-red-800" role="alert">{error}</p>}
    {!loading && !visible.length ? <EmptyState title={entries.length ? 'No matching notes.' : 'Your journal is waiting.'}><p>{entries.length ? 'Try another search or rating.' : 'Log your first full listen from Discover.'}</p></EmptyState> : <div className="space-y-4">{visible.map(entry => <article key={entry.listen_id} className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:grid-cols-[80px_minmax(0,1fr)]"><AlbumArt album={entry} /><div><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-display text-xl">{entry.title}</h2><p className="mt-1 text-xs text-stone-500">{entry.artist}</p></div><time className="text-xs text-stone-400" dateTime={entry.listened_on}>{entry.listened_on}</time></div><p className="mt-3 text-sm tracking-wider text-amber-700" aria-label={`${entry.rating} out of 5`}>{'★'.repeat(entry.rating || 0)}<span className="text-stone-200">{'★'.repeat(5 - (entry.rating || 0))}</span></p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-600">{entry.note || 'No note added for this listen.'}</p>
      <div className="mt-4 flex gap-4 text-xs"><button className="font-semibold text-emerald-900" onClick={() => onSelect(entry, entry)}>Edit note</button><button className="text-stone-400 hover:text-red-700" disabled={busy} onClick={() => { if (armed !== entry.listen_id) setArmed(entry.listen_id); else void mutate('Listening entry removed', owner => api.remove(owner, entry.listen_id)); }}>{armed === entry.listen_id ? 'Confirm removal' : 'Remove'}</button>{armed === entry.listen_id && <button className="text-stone-500" onClick={() => setArmed(null)}>Cancel</button>}</div>
    </div></article>)}</div>}
    <div className="mt-7 text-center">{loading && <p className="text-sm text-stone-400" role="status">Loading listening notes...</p>}{cursor && <button className="button-secondary" disabled={loading} onClick={() => { void more(); }}>Load earlier listens</button>}</div>
  </>;
}
