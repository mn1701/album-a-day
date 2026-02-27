export interface Album { id: string; title: string; artist: string; genres: string[]; year: number }
export interface DailyPick extends Album { reasons: string[] }
export interface Recommendation { album: Album; reasons: string[]; rank_score: number }
export interface Listen extends Album { listen_id: number; album_id: string; rating: number; note: string; listened_on: string; profile_id: string }
export interface QueueAlbum extends Album { added_at: string }
export interface Profile { id: string; name: string }
export interface Stats { listens: number; average_rating: number | null; last_listened: string | null; catalog_size: number; unique_albums: number; listening_days: number }
export interface Insights {
  total: number; unique_albums: number;
  genres: { name: string; count: number }[];
  artists: { name: string; count: number }[];
  ratings: { rating: number; count: number }[];
  months: { month: string; count: number }[];
  calendar: { date: string; count: number }[];
}
export interface ListenInput { album_id: string; rating: number; note: string; listened_on: string }
export interface HistoryPage { entries: Listen[]; cursor: string | null }
export type Page = 'discover' | 'catalog' | 'queue' | 'journal' | 'insights' | 'profiles';
