import type { Album } from '../lib/types';
import { useLibrary } from '../state/LibraryProvider';
import { api } from '../lib/api';
import { AlbumArt } from '../components/AlbumArt';
import { AlbumCard } from '../components/AlbumCard';
import { SkeletonGrid, SectionTitle, EmptyState } from '../components/ui/State';
export default function Discover({ onSelect }: { onSelect(album: Album): void }) {
  const { data, busy, mutate } = useLibrary();
  if (!data) return <SkeletonGrid />;
  const { stats, today } = data;
  return <><SectionTitle eyebrow="A SMALL DAILY RITUAL" title="Make room for a full album.">One considered pick, a few unexpected directions, and space to listen.</SectionTitle>
    <section aria-label="Listening summary" className="mb-9 grid grid-cols-2 gap-3 md:grid-cols-4">{[['Albums heard', stats.unique_albums], ['Listening days', stats.listening_days], ['Your average', stats.average_rating === null ? 'Not rated' : `${stats.average_rating} / 5`], ['Up next', data.queue.length]].map(([label, value]) => <div key={label} className="rounded-xl border border-stone-200 bg-white px-5 py-4"><p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">{label}</p><p className="mt-2 font-display text-2xl">{value}</p></div>)}</section>
    <div className="mb-4 flex items-center justify-between"><p className="eyebrow">TODAY'S PICK</p><span className="text-xs text-stone-400">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span></div>
    {today ? <section className="mb-12 grid gap-7 rounded-3xl bg-emerald-950 p-6 text-white sm:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] lg:gap-10 lg:p-8"><AlbumArt album={today} className="shadow-2xl" /><div className="flex flex-col justify-center"><p className="text-[10px] uppercase tracking-[.2em] text-emerald-200">{today.year} · {today.genres.join(' / ')}</p><h2 className="mt-3 font-display text-4xl leading-tight xl:text-5xl">{today.title}</h2><p className="mt-3 text-sm leading-6 text-emerald-100/70">{today.artist}</p>
      <ul className="my-6 space-y-2 text-xs leading-5 text-emerald-100/70">{today.reasons?.map(reason => <li key={reason}>✦ {reason}</li>)}</ul><div className="flex flex-wrap gap-3"><button className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-emerald-950 hover:bg-emerald-50" onClick={() => onSelect(today)}>Log a listen</button><button disabled={busy || data.queue.some(a => a.id === today.id)} className="rounded-xl border border-white/25 px-5 py-3 text-sm disabled:opacity-40" onClick={() => { void mutate('Added today’s pick to your queue', profile => api.enqueue(profile, today.id)); }}>Save for later</button></div><p className="mt-5 text-[10px] text-emerald-100/45">Today's pick stays in place unless you explicitly hide it from suggestions.</p></div></section> : <div className="mb-12"><EmptyState title="A little more room for discovery."><p>All catalog albums are hidden from suggestions. Restore a few in Listening Rooms, or browse the catalog directly.</p><a href="#profiles" className="mt-3 inline-block underline">Manage hidden albums</a></EmptyState></div>}
    <div className="mb-5"><p className="eyebrow">A FEW OTHER DIRECTIONS</p><h2 className="mt-2 font-display text-2xl">Picked for this listening room</h2><p className="mt-2 text-sm text-stone-500">Ratings shape the suggestions. Similarity and variety both play a part.</p></div>
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{data.picks.filter(pick => pick.album.id !== today?.id).map(pick => <AlbumCard key={pick.album.id} album={pick.album} reasons={pick.reasons} onSelect={onSelect} />)}</div>
  </>;
}
