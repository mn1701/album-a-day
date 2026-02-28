import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { Album, DailyPick, Profile, QueueAlbum, Recommendation, Stats } from '../lib/types';
interface Snapshot { profile: string; profiles: Profile[]; catalog: Album[]; today: DailyPick; picks: Recommendation[]; queue: QueueAlbum[]; stats: Stats }
interface Library {
  profile: string; selectProfile(id: string): void; data: Snapshot | null; loading: boolean; error: string; notice: string; busy: boolean; revision: number;
  refresh(): void; mutate(label: string, task: (profile: string) => Promise<unknown>, optimistic?: (state: Snapshot) => Snapshot): Promise<boolean>;
}
const Context = createContext<Library | null>(null);
function initialProfile() { try { return localStorage.getItem('album.profile.v2') || 'local'; } catch { return 'local'; } }
export function LibraryProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState(initialProfile); const profileRef = useRef(profile);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [mutationError, setMutationError] = useState('');
  const [revision, setRevision] = useState(0), [busy, setBusy] = useState(false); const lock = useRef(false); const generation = useRef(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  function selectProfile(id: string) { profileRef.current = id; setProfile(id); setNotice(''); setMutationError(''); try { localStorage.setItem('album.profile.v2', id); } catch {} }
  useEffect(() => {
    const epoch = ++generation.current; const controller = new AbortController(); setLoading(true); setError('');
    Promise.all([api.profiles(controller.signal), api.catalog(controller.signal), api.today(profile, controller.signal), api.recommendations(profile, controller.signal), api.queue(profile, controller.signal), api.stats(profile, controller.signal)])
      .then(([profiles, catalog, today, picks, queue, stats]) => {
        if (generation.current !== epoch || controller.signal.aborted) return;
        setSnapshot({ profile, profiles, catalog, today, picks, queue, stats });
      }).catch(e => {
        if (controller.signal.aborted || generation.current !== epoch) return;
        setError(e instanceof Error ? e.message : String(e));
      }).finally(() => { if (!controller.signal.aborted && generation.current === epoch) setLoading(false); });
    return () => controller.abort();
  }, [profile, revision]);
  useEffect(() => { if (!notice) return; const id = setTimeout(() => setNotice(''), 3500); return () => clearTimeout(id); }, [notice]);
  async function mutate(label: string, task: (profile: string) => Promise<unknown>, optimistic?: (state: Snapshot) => Snapshot): Promise<boolean> {
    if (lock.current) return false; lock.current = true; setBusy(true); setMutationError(''); const owner = profileRef.current;
    if (optimistic) setSnapshot(current => current?.profile === owner ? optimistic(current) : current);
    try {
      await task(owner);
      if (owner === profileRef.current) { setNotice(label); refresh(); }
      return true;
    } catch (e) {
      if (owner === profileRef.current) { setMutationError(e instanceof Error ? e.message : String(e)); refresh(); }
      return false;
    } finally { lock.current = false; setBusy(false); }
  }
  return <Context.Provider value={{ profile, selectProfile, data: snapshot?.profile === profile ? snapshot : null, loading, error: mutationError || error, notice, busy, revision, refresh: () => { setMutationError(''); refresh(); }, mutate }}>{children}</Context.Provider>;
}
export function useLibrary() { const value = useContext(Context); if (!value) throw new Error('LibraryProvider is missing'); return value; }
