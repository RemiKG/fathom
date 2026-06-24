'use client';
import { useEffect, useRef } from 'react';
import * as C from '@/lib/art/chart';

/* The Fathom wordmark: the real letter "o" stays (perfect weight); a brass lantern-lure glows in
   its counter and a sounding-line + plumb-bob drops below. Placement measures the glyph at runtime
   (after fonts load). */
export function Wordmark({
  drop = 'short', rev = false, size, className, style, onClick,
}: {
  drop?: 'none' | 'short' | 'mid' | 'hero';
  rev?: boolean;
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  const wordRef = useRef<HTMLSpanElement>(null);
  const lureRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const word = wordRef.current, lure = lureRef.current;
    if (!word || !lure) return;
    const place = () => {
      const o = word.querySelector('.o') as HTMLElement | null;
      if (!o) return;
      const wb = word.getBoundingClientRect(), ob = o.getBoundingClientRect();
      if (!ob.width) return;
      const u = ob.width, lr = u * 0.94, bw = u * 2.2, cx = bw / 2, cyc = lr * 0.62;
      const gcx = (ob.left - wb.left) + ob.width / 2, gcy = (ob.top - wb.top) + ob.height * 0.56;
      lure.style.left = (gcx - cx) + 'px';
      lure.style.top = (gcy - cyc) + 'px';
      lure.style.width = bw + 'px';
      lure.innerHTML = C.lureMark(u, { drop, rev });
    };
    place();
    const t = setTimeout(place, 120);
    let cancelled = false;
    try {
      document.fonts.ready.then(() => { if (!cancelled) { place(); setTimeout(place, 120); } });
    } catch { /* Font Loading API unavailable */ }
    const ro = new ResizeObserver(place);
    ro.observe(word);
    window.addEventListener('resize', place);
    return () => { cancelled = true; clearTimeout(t); ro.disconnect(); window.removeEventListener('resize', place); };
  }, [drop, rev]);

  return (
    <span
      ref={wordRef}
      className={`brand ${className || ''}`}
      style={{ position: 'relative', fontSize: size, ...style }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      Fath<span className="o">o</span>m
      <span ref={lureRef} className="o-lure" style={{ position: 'absolute', pointerEvents: 'none', zIndex: 2 }} aria-hidden />
    </span>
  );
}
