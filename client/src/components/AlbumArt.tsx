import type { Album } from '../lib/types';
export function AlbumArt({ album, className = '' }: { album: Album; className?: string }) {
  const hash = Array.from(album.id + album.artist).reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 7);
  const hue = hash % 360;
  return <div role="img" aria-label={`Generated artwork for ${album.title}`} className={`record-art relative isolate aspect-square overflow-hidden rounded-xl ${className}`} style={{ background: `linear-gradient(135deg,hsl(${hue} 28% 27%),hsl(${(hue + 55) % 360} 33% 62%))` }}>
    <div className="absolute -right-1/4 top-1/4 h-[110%] w-[110%] rounded-full border-[22px] border-white/10" /><div className="absolute left-1/3 top-1/3 h-1/3 w-1/3 rounded-full border border-white/40 bg-black/20" />
    <span className="absolute bottom-4 left-4 right-4 font-display text-3xl leading-none tracking-tight text-white/90">{album.title}</span><span className="absolute left-4 top-4 text-[10px] tracking-[.25em] text-white/75">{album.year || 'ARCHIVE'} / ALBUM STUDY</span>
  </div>;
}
