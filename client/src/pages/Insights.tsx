import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Insights as Data } from '../lib/types';
import { useLibrary } from '../state/LibraryProvider';
import { EmptyState, SectionTitle } from '../components/ui/State';
function Bars({ values }: { values: { label: string; value: number }[] }) {
  const maximum = Math.max(1, ...values.map(item => item.value));
  return <ul className="space-y-4">{values.map(item => <li key={item.label}><div className="mb-2 flex justify-between gap-3 text-xs"><span className="min-w-0 truncate text-stone-600">{item.label}</span><span className="text-stone-400">{item.value}</span></div><div className="h-2 rounded-full bg-stone-100"><div className="h-full rounded-full bg-emerald-800" style={{ width: `${item.value / maximum * 100}%` }} /></div></li>)}</ul>;
}
export default function Insights() {
  const { profile, revision } = useLibrary(); const [data, setData] = useState<Data | null>(null), [error, setError] = useState('');
  useEffect(() => { const controller = new AbortController(); setData(null); setError(''); api.insights(profile, controller.signal).then(value => { if (!controller.signal.aborted) setData(value); }).catch(e => { if (!controller.signal.aborted) setError(String(e)); }); return () => controller.abort(); }, [profile, revision]);
  return <><SectionTitle eyebrow="A LITTLE PERSPECTIVE" title="The shape of your listening.">A reflection of your journal, without streaks or targets.</SectionTitle>{error && <p role="alert" className="text-red-800">{error}</p>}
    {!data ? <p className="text-sm text-stone-400">Loading listening patterns...</p> : !data.total ? <EmptyState title="Patterns come with time."><p>Log a few albums and your listening habits will appear here.</p></EmptyState> : <>
      <section className="mb-6 rounded-2xl border border-stone-200 bg-white p-6"><div className="mb-5 flex flex-wrap justify-between gap-3"><div><h2 className="font-display text-2xl">The past twelve weeks</h2><p className="mt-1 text-xs text-stone-400">{data.total} total listens · {data.unique_albums} unique albums</p></div><span className="text-xs text-stone-400">Each square is one day</span></div>
        <div className="grid grid-cols-12 gap-2 sm:grid-cols-21">{data.calendar.map(day => <div key={day.date} title={`${day.date}: ${day.count} listens`} aria-label={`${day.date}: ${day.count} listens`} className={`aspect-square rounded ${day.count >= 3 ? 'bg-emerald-900' : day.count === 2 ? 'bg-emerald-600' : day.count === 1 ? 'bg-emerald-300' : 'bg-stone-100'}`} />)}</div><div className="mt-4 flex justify-end gap-3 text-[10px] text-stone-400"><span>None</span><span>1</span><span>2</span><span>3 or more</span></div>
      </section><div className="grid gap-6 md:grid-cols-2">{[
        { title: 'Styles you return to', values: data.genres.map(item => ({ label: item.name, value: item.count })), note: 'Albums with multiple styles count once in each style.' },
        { title: 'Artists in your journal', values: data.artists.map(item => ({ label: item.name, value: item.count })), note: 'Repeat listens count again.' },
        { title: 'Your rating range', values: data.ratings.map(item => ({ label: `${item.rating} stars`, value: item.count })), note: 'All rated listening entries.' },
        { title: 'Month by month', values: data.months.map(item => ({ label: item.month, value: item.count })), note: 'The twelve most recent months containing a listen.' },
      ].map(section => <section key={section.title} className="rounded-2xl border border-stone-200 bg-white p-6"><h2 className="mb-5 font-display text-2xl">{section.title}</h2><Bars values={section.values} /><p className="mt-5 text-[10px] leading-4 text-stone-400">{section.note}</p></section>)}</div>
    </>}
  </>;
}
