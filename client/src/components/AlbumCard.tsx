import type { Album } from '../lib/types';
import { useLibrary } from '../state/LibraryProvider';
import { api } from '../lib/api';
import { AlbumArt } from './AlbumArt';
export function AlbumCard({ album, onSelect, reasons }: { album: Album; onSelect(album: Album): void; reasons?: string[] }) {
  const { data, busy, mutate } = useLibrary(); const queued = data?.queue.some(item => item.id === album.id);
  function queue() { void mutate(queued ? 'Removed from queue' : 'Added to queue', profile => queued ? api.dequeue(profile, album.id) : api.enqueue(profile, album.id), state => ({ ...state, queue: queued ? state.queue.filter(item => item.id !== album.id) : [...state.queue, { ...album, added_at: new Date().toISOString() }] })); }
  return <article className="group rounded-2xl border border-stone-200/70 bg-white p-4 transition-shadow hover:shadow-lg hover:shadow-stone-200/50">
    <button className="block w-full text-left" onClick={() => onSelect(album)} aria-label={`Open ${album.title} by ${album.artist}`}><AlbumArt album={album} /><h2 className="mt-4 font-display text-xl leading-tight text-stone-900">{album.title}</h2><p className="mt-1 line-clamp-2 min-h-10 text-sm text-stone-500">{album.artist}</p></button>
    <div className="mt-3 flex flex-wrap gap-1.5">{album.genres.slice(0, 3).map(genre => <span className="tag" key={genre}>{genre}</span>)}</div>
    {reasons?.length ? <p className="mt-4 border-t border-stone-100 pt-3 text-xs leading-5 text-stone-500">{reasons.slice(0, 2).join(' · ')}</p> : null}
    <div className="mt-4 flex items-center justify-between gap-2"><button className="button-secondary text-xs!" disabled={busy} aria-pressed={queued} onClick={queue}>{queued ? 'Queued ✓' : '+ Listen next'}</button><button className="text-xs font-semibold text-emerald-900 hover:underline" onClick={() => onSelect(album)}>Log a listen ↗</button></div>
  </article>;
}
