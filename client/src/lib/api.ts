import type { Album, DailyPick, HistoryPage, Insights, Listen, ListenInput, Profile, QueueAlbum, Recommendation, Stats } from './types';
export class APIError extends Error { constructor(message: string, public status: number) { super(message); } }
interface Options extends RequestInit { profile?: string; query?: Record<string, string> }
async function request(path: string, { profile, query = {}, signal, ...init }: Options = {}): Promise<{ response: Response; data: unknown }> {
  const params = new URLSearchParams(query); if (profile) params.set('profile', profile);
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 12000);
  const abort = () => controller.abort(); signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  try {
    const response = await fetch(`/api${path}${params.toString() ? '?' + params : ''}`, {
      ...init, signal: controller.signal, headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
    });
    const data = response.status === 204 ? undefined : await response.json();
    if (!response.ok) { const value = data as { error?: string } | undefined; throw new APIError(value?.error || `Request failed (${response.status})`, response.status); }
    return { response, data };
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
}
async function json<T>(path: string, options?: Options): Promise<T> {
  const { data } = await request(path, options); return data as T;
}
export const api = {
  profiles: (signal?: AbortSignal) => json<Profile[]>('/profiles', { signal }),
  createProfile: (id: string, name: string) => json<Profile>('/profiles', { method: 'POST', body: JSON.stringify({ id, name }) }),
  catalog: (signal?: AbortSignal) => json<Album[]>('/albums', { signal }),
  today: (profile: string, signal?: AbortSignal) => json<DailyPick>('/today', { profile, signal }),
  recommendations: (profile: string, signal?: AbortSignal) => json<Recommendation[]>('/recommendations', { profile, signal, query: { limit: '12' } }),
  queue: (profile: string, signal?: AbortSignal) => json<QueueAlbum[]>('/queue', { profile, signal }),
  enqueue: (profile: string, album_id: string) => json<void>('/queue', { profile, method: 'POST', body: JSON.stringify({ album_id }) }),
  dequeue: (profile: string, id: string) => json<void>(`/queue/${encodeURIComponent(id)}`, { profile, method: 'DELETE' }),
  reorder: (profile: string, album_ids: string[], expected_order: string[]) => json<void>('/queue/order', { profile, method: 'PUT', body: JSON.stringify({ album_ids, expected_order }) }),
  stats: (profile: string, signal?: AbortSignal) => json<Stats>('/stats', { profile, signal }),
  insights: (profile: string, signal?: AbortSignal) => json<Insights>('/insights', { profile, signal }),
  log: (profile: string, value: ListenInput) => json<void>('/listens', { profile, method: 'POST', body: JSON.stringify(value) }),
  edit: (profile: string, id: number, value: Omit<ListenInput, 'album_id'>) => json<void>(`/listens/${id}`, { profile, method: 'PATCH', body: JSON.stringify(value) }),
  remove: (profile: string, id: number) => json<void>(`/listens/${id}`, { profile, method: 'DELETE' }),
  async history(profile: string, before?: string, signal?: AbortSignal): Promise<HistoryPage> {
    const { response, data } = await request('/listens', { profile, signal, query: { limit: '30', ...(before ? { before } : {}) } });
    const entries = data as Listen[]; return { entries, cursor: entries.length === 30 ? response.headers.get('X-Next-Cursor') : null };
  },
  exportURL: (profile: string) => `/api/export?profile=${encodeURIComponent(profile)}`,
};
