import { useEffect, useState } from 'react';
import type { Page } from '../lib/types';
const pages: Page[] = ['discover', 'catalog', 'queue', 'journal', 'insights', 'profiles'];
function current(): Page { const value = location.hash.slice(1).split('?')[0] as Page; return pages.includes(value) ? value : 'discover'; }
export function useRoute(): [Page, (page: Page) => void] {
  const [page, setPage] = useState(current);
  useEffect(() => { const change = () => setPage(current()); window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change); }, []);
  return [page, next => { location.hash = next; setPage(next); }];
}
