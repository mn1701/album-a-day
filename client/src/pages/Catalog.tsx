import { useEffect, useMemo, useRef, useState } from 'react';
import type { Album } from '../lib/types';
import { useLibrary } from '../state/LibraryProvider';
import { useDebounced } from '../hooks/useDebounced';
import { AlbumCard } from '../components/AlbumCard';
import { EmptyState, SectionTitle, SkeletonGrid } from '../components/ui/State';
export default function Catalog({ onSelect }: { onSelect(album: Album): void }) {
  const { data } = useLibrary(); const [query, setQuery] = useState(''), [genre, setGenre] = useState(''), [sort, setSort] = useState('artist');
  const debounced = useDebounced(query); const search = useRef<HTMLInputElement>(null);
  useEffect(() => { const key = (event: KeyboardEvent) => { if (event.key === '/' && !(event.target as HTMLElement).matches('input,textarea,select')) { event.preventDefault(); search.current?.focus(); } }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, []);
  const genres = useMemo(() => Array.from(new Set(data?.catalog.flatMap(album => album.genres) || [])).sort(), [data]);
  const visible = useMemo(() => {
    const needle = debounced.toLocaleLowerCase().trim();
    return (data?.catalog || []).filter(album => (!genre || album.genres.includes(genre)) && (!needle || [album.title, album.artist, ...album.genres].join(' ').toLocaleLowerCase().includes(needle)))
      .sort((a, b) => sort === 'newest' ? b.year - a.year || a.title.localeCompare(b.title) : sort === 'oldest' ? a.year - b.year || a.title.localeCompare(b.title) : sort === 'title' ? a.title.localeCompare(b.title) : a.artist.localeCompare(b.artist));
  }, [data, debounced, genre, sort]);
  return <><SectionTitle eyebrow="THE COLLECTION" title="Find your next full listen.">Browse the local catalog by artist, title, or style.</SectionTitle><div className="mb-5 flex flex-col gap-3 sm:flex-row"><label className="grow"><span className="sr-only">Search albums</span><input ref={search} className="input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search albums, artists, or genres. Press / to focus." /></label><label><span className="sr-only">Sort catalog</span><select className="input" value={sort} onChange={e => setSort(e.target.value)}><option value="artist">Artist A to Z</option><option value="title">Album A to Z</option><option value="newest">Newest releases</option><option value="oldest">Oldest releases</option></select></label></div>
    <div className="mb-7 flex flex-wrap items-center gap-2"><button className={`chip ${genre === '' ? 'chip-selected' : ''}`} onClick={() => setGenre('')}>All styles</button>{genres.map(value => <button key={value} className={`chip ${genre === value ? 'chip-selected' : ''}`} onClick={() => setGenre(value)}>{value}</button>)}<span className="ml-auto text-xs text-stone-400">{visible.length} albums</span></div>
    {!data ? <SkeletonGrid /> : visible.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{visible.map(album => <AlbumCard key={album.id} album={album} onSelect={onSelect} />)}</div> : <EmptyState title="Nothing in this corner yet."><p>Try a different style or a broader search.</p><button className="mt-4 text-emerald-900 underline" onClick={() => { setGenre(''); setQuery(''); }}>Reset filters</button></EmptyState>}</>;
}
