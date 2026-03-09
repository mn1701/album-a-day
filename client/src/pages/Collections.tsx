import { useEffect, useState, type FormEvent } from 'react';
import type { Album, Collection } from '../lib/types';
import { api } from '../lib/api';
import { useLibrary } from '../state/LibraryProvider';
import { AlbumArt } from '../components/AlbumArt';
import { EmptyState, SectionTitle } from '../components/ui/State';
export default function Collections({ onSelect }: { onSelect(album: Album): void }) {
  const { profile, data, revision, busy, mutate } = useLibrary();
  const [lists, setLists] = useState<Collection[]>([]), [editing, setEditing] = useState<Collection | null>(null), [name, setName] = useState(''), [description, setDescription] = useState(''), [ids, setIDs] = useState<string[]>([]), [error, setError] = useState(''), [armed, setArmed] = useState<number | null>(null);
  useEffect(() => { const abort = new AbortController(); setLists([]); setError(''); api.collections(profile, abort.signal).then(result => { if (!abort.signal.aborted) setLists(result); }).catch(e => { if (!abort.signal.aborted) setError(String(e)); }); return () => abort.abort(); }, [profile, revision]);
  function reset() { setEditing(null); setName(''); setDescription(''); setIDs([]); setArmed(null); }
  useEffect(reset, [profile]);
  async function save(event: FormEvent) {
    event.preventDefault();
    const success = await mutate(editing ? 'Collection updated' : 'Collection created', owner => api.saveCollection(owner, { name, description, album_ids: ids }, editing || undefined));
    if (success) reset();
  }
  function edit(collection: Collection) { setEditing(collection); setName(collection.name); setDescription(collection.description); setIDs(collection.albums.map(album => album.id)); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  return <><SectionTitle eyebrow="YOUR OWN SHELVES" title="Keep a few records together.">Build small collections for a mood, a season, or a person. Collections stay separate from your listen-next queue.</SectionTitle>
    <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-6"><h2 className="font-display text-2xl">{editing ? `Edit ${editing.name}` : 'Make a collection'}</h2><form className="mt-5 space-y-4" onSubmit={save}>
      <div className="grid gap-4 sm:grid-cols-2"><label><span className="label">Name</span><input className="input mt-2" maxLength={80} value={name} onChange={e => setName(e.target.value)} required /></label><label><span className="label">A short description</span><input className="input mt-2" maxLength={500} value={description} onChange={e => setDescription(e.target.value)} /></label></div>
      <fieldset><legend className="label mb-3">Choose albums in collection order</legend><div className="flex flex-wrap gap-2">{data?.catalog.map(album => <button key={album.id} type="button" aria-pressed={ids.includes(album.id)} className={`chip ${ids.includes(album.id) ? 'chip-selected' : ''}`} onClick={() => setIDs(previous => previous.includes(album.id) ? previous.filter(id => id !== album.id) : [...previous, album.id])}>{ids.includes(album.id) ? `${ids.indexOf(album.id) + 1}. ` : ''}{album.title}</button>)}</div></fieldset>
      <div className="flex gap-3"><button className="button" disabled={busy}>{editing ? 'Save changes' : 'Create collection'}</button>{editing && <button className="button-secondary" type="button" onClick={reset}>Cancel editing</button>}</div>
    </form></section>{error && <p className="mb-5 text-red-800" role="alert">{error}</p>}
    {!lists.length ? <EmptyState title="An empty shelf is a beginning."><p>Choose a name and a few records above.</p></EmptyState> : <div className="space-y-6">{lists.map(collection => <section key={collection.id} className="rounded-2xl border border-stone-200 bg-white p-6"><div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-2xl">{collection.name}</h2><p className="mt-2 text-sm text-stone-500">{collection.description || `${collection.albums.length} albums`}</p></div><div className="flex gap-3 text-xs"><button className="text-emerald-900" onClick={() => edit(collection)}>Edit</button><button className="text-stone-400" disabled={busy} onClick={() => { if (armed !== collection.id) setArmed(collection.id); else void mutate('Collection removed', owner => api.deleteCollection(owner, collection.id)); }}>{armed === collection.id ? 'Confirm deletion' : 'Delete'}</button>{armed === collection.id && <button onClick={() => setArmed(null)}>Cancel</button>}</div></div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{collection.albums.map(album => <button className="text-left" key={album.id} onClick={() => onSelect(album)}><AlbumArt album={album} /><span className="mt-2 block text-xs text-stone-600">{album.title}</span></button>)}</div>
    </section>)}</div>}
  </>;
}
