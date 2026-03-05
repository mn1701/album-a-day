import { api } from '../lib/api';
import type { Album } from '../lib/types';
import { useLibrary } from '../state/LibraryProvider';
import { AlbumArt } from '../components/AlbumArt';
import { EmptyState, SectionTitle, SkeletonGrid } from '../components/ui/State';
export default function Queue({ onSelect }: { onSelect(album: Album): void }) {
  const { data, busy, mutate } = useLibrary();
  function move(index: number, direction: -1 | 1) {
    if (!data) return; const next = [...data.queue]; [next[index], next[index + direction]] = [next[index + direction], next[index]];
    void mutate('Queue order saved', profile => api.reorder(profile, next.map(album => album.id), data.queue.map(album => album.id)), snapshot => ({ ...snapshot, queue: next }));
  }
  return <><SectionTitle eyebrow="LISTEN NEXT" title="A little anticipation.">Arrange a few albums for later. Logging a listen removes that album from this queue.</SectionTitle>
    {!data ? <SkeletonGrid /> : !data.queue.length ? <EmptyState title="Your queue has room."><p>Add records from Discover or the catalog. A small queue can make choosing easier.</p><a href="#catalog" className="mt-4 inline-block text-emerald-900 underline">Explore the collection</a></EmptyState> : <ol className="space-y-3">{data.queue.map((album, index) => <li key={album.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-nowrap"><span className="w-5 text-center text-xs text-stone-400">{index + 1}</span><div className="w-20 shrink-0"><AlbumArt album={album} /></div><div className="min-w-0 grow"><h2 className="font-display text-xl">{album.title}</h2><p className="mt-1 text-sm text-stone-500">{album.artist}</p><p className="mt-1 text-xs text-stone-400">{album.year} · {album.genres.join(', ')}</p></div>
      <div className="flex flex-wrap gap-2"><button className="button-secondary" aria-label={`Move ${album.title} up`} disabled={busy || index === 0} onClick={() => move(index, -1)}>↑</button><button className="button-secondary" aria-label={`Move ${album.title} down`} disabled={busy || index === data.queue.length - 1} onClick={() => move(index, 1)}>↓</button><button className="button" onClick={() => onSelect(album)}>Log listen</button><button className="button-secondary" disabled={busy} aria-label={`Remove ${album.title}`} onClick={() => { void mutate('Removed from queue', profile => api.dequeue(profile, album.id), state => ({ ...state, queue: state.queue.filter(item => item.id !== album.id) })); }}>Remove</button></div>
    </li>)}</ol>}</>;
}
