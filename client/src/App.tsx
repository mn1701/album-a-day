import { lazy, Suspense, useEffect, useState } from 'react';
import type { Album, Listen } from './lib/types';
import { useRoute } from './hooks/useRoute';
import { useLibrary } from './state/LibraryProvider';
import { Layout } from './components/Layout';
import { AlbumDialog } from './components/AlbumDialog';
import { SkeletonGrid } from './components/ui/State';
const Discover = lazy(() => import('./pages/Discover'));
const Catalog = lazy(() => import('./pages/Catalog'));
const Queue = lazy(() => import('./pages/Queue'));
const Journal = lazy(() => import('./pages/Journal'));
const Insights = lazy(() => import('./pages/Insights'));
const Collections = lazy(() => import('./pages/Collections'));
const Profiles = lazy(() => import('./pages/Profiles'));
export function App() {
  const [page, navigate] = useRoute(); const { profile } = useLibrary();
  const [selected, setSelected] = useState<{ album: Album; listen?: Listen } | null>(null);
  useEffect(() => { setSelected(null); }, [page, profile]);
  const choose = (album: Album, listen?: Listen) => setSelected({ album, listen });
  return <Layout page={page} navigate={navigate}><Suspense fallback={<SkeletonGrid />}>
    {page === 'discover' ? <Discover onSelect={choose} /> : page === 'catalog' ? <Catalog onSelect={choose} /> : page === 'queue' ? <Queue onSelect={choose} /> : page === 'journal' ? <Journal onSelect={choose} /> : page === 'insights' ? <Insights /> : page === 'collections' ? <Collections onSelect={choose} /> : <Profiles />}
  </Suspense>{selected && <AlbumDialog key={`${profile}:${selected.listen?.listen_id || selected.album.id}`} album={selected.album} listen={selected.listen} onClose={() => setSelected(null)} />}</Layout>;
}
