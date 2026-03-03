import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Album, Listen } from '../lib/types';
import { api } from '../lib/api';
import { useLibrary } from '../state/LibraryProvider';
import { AlbumArt } from './AlbumArt';
function today() { const value = new Date(); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; }
export function AlbumDialog({ album, listen, onClose }: { album: Album; listen?: Listen; onClose(): void }) {
  const { mutate, busy, profile, error } = useLibrary(); const [rating, setRating] = useState(listen?.rating || 4), [note, setNote] = useState(listen?.note || ''), [date, setDate] = useState(listen?.listened_on || today());
  const panel = useRef<HTMLDivElement>(null); const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null; panel.current?.focus();
    const original = document.body.style.overflow; document.body.style.overflow = 'hidden';
    function key(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const nodes = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, textarea, [tabindex="0"]') || []);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener('keydown', key); return () => { document.body.style.overflow = original; document.removeEventListener('keydown', key); previous?.focus(); };
  }, []);
  async function save(event: FormEvent) {
    event.preventDefault(); const saved = await mutate(listen ? 'Listening note updated' : 'Listen added to your journal', owner => listen ? api.edit(owner, listen.listen_id, { rating, note, listened_on: date }) : api.log(owner, { album_id: album.id, rating, note, listened_on: date }));
    if (saved) onClose();
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="album-dialog-title" className="relative grid max-h-[92vh] w-full max-w-3xl gap-7 overflow-y-auto rounded-3xl bg-paper p-6 outline-none md:grid-cols-[.8fr_1fr] md:p-8">
      <button className="absolute right-4 top-3 z-10 rounded-full bg-white px-3 py-1 text-stone-600" aria-label="Close album details" onClick={onClose}>×</button><div><AlbumArt album={album} /><p className="mt-4 text-xs uppercase tracking-widest text-stone-400">{album.year} · {album.genres.join(' / ')}</p></div>
      <div><p className="eyebrow">{listen ? 'EDIT JOURNAL ENTRY' : 'LISTENING JOURNAL'}</p><h2 id="album-dialog-title" className="mt-2 font-display text-3xl">{album.title}</h2><p className="mt-2 text-sm text-stone-500">{album.artist}</p>
        <form onSubmit={save} className="mt-6 space-y-5"><fieldset><legend className="label">Your rating</legend><div className="mt-2 flex gap-2">{[1, 2, 3, 4, 5].map(value => <button type="button" key={value} aria-pressed={value === rating} aria-label={`${value} out of 5`} onClick={() => setRating(value)} className={`rounded-lg border px-3 py-2 text-xl ${value <= rating ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-stone-200 text-stone-300'}`}>★</button>)}</div></fieldset>
          <label className="block"><span className="label">Listening date</span><input className="input mt-2" type="date" value={date} max={today()} onChange={e => setDate(e.target.value)} required /></label>
          <label className="block"><span className="label">What stayed with you?</span><textarea className="input mt-2 min-h-32 resize-y" maxLength={4000} value={note} onChange={e => setNote(e.target.value)} placeholder="A texture, a lyric, a moment..." /></label><div className="flex items-center justify-between text-xs text-stone-400"><span>{note.length}/4000</span><span>Profile: {profile}</span></div>
          {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
          <button className="button w-full" disabled={busy}>{busy ? 'Saving...' : listen ? 'Update entry' : 'Save listening note'}</button>
        </form></div>
    </div>
  </div>;
}
