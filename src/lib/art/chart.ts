/* Fathom chart library — hand-authored SVG engraving / illumination. Every mark is placed by
   code: nineteenth-century cutaway linework, cross-hatch shading, brass instruments, a lantern-
   lure that glows in the deep. The "rough-ink" filter (turbulence + displacement) breaks vector
   perfection so lines read as hand-cut. A framework-agnostic TS module. */

export const P = {
  chart: '#F3ECDA', chartHi: '#FAF5E6', chartLo: '#E9E0C9', chart2: '#E0D5BA', deckle: '#D3C6A6',
  ink: '#141C22', ink85: '#1E2A31', ink75: '#2C3A42', ink60: '#46565F', ink45: '#6B7A82', ink30: '#97A3A9', ink18: '#BFC7CB',
  deep: '#141C22', deepLo: '#0E151A', deepHi: '#1D2A32', deep2: '#27363F',
  brass: '#D9A441', brassHi: '#F1CC77', brassCore: '#B87E22', brassSoft: '#EFDDB0', brassInk: '#8A6410', brassLit: '#FBE6AE',
  uns: '#8B9399', unsHi: '#A8AFB4', unsLo: '#6C747A',
} as const;

/* deterministic RNG so every asset is reproducible / "seed-locked" */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const f2 = (n: number | string) => (+n).toFixed(2);

/* escape text that gets embedded inside generated SVG (labels can carry &, <, >, ") */
export function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ---- shared <defs>: filters, hatch patterns, gradients. Injected once per page. ---- */
export function defs(): string {
  return `<svg class="chart-defs" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
      <filter id="rough" x="-8%" y="-8%" width="116%" height="116%">
        <feTurbulence type="fractalNoise" baseFrequency="0.024 0.03" numOctaves="2" seed="7" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="3.0" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <filter id="rough-fine" x="-6%" y="-6%" width="112%" height="112%">
        <feTurbulence type="fractalNoise" baseFrequency="0.04 0.052" numOctaves="2" seed="3" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="1.5" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <filter id="rough-crumble" x="-14%" y="-14%" width="128%" height="128%">
        <feTurbulence type="fractalNoise" baseFrequency="0.05 0.06" numOctaves="3" seed="11" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="5.4" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <filter id="softglow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="softglow-lg" x="-140%" y="-140%" width="380%" height="380%">
        <feGaussianBlur stdDeviation="16" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <radialGradient id="lanternGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stop-color="${P.brassHi}" stop-opacity=".98"/>
        <stop offset="30%"  stop-color="${P.brass}"   stop-opacity=".6"/>
        <stop offset="100%" stop-color="${P.brass}"   stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="lanternGlowSoft" cx="50%" cy="46%" r="55%">
        <stop offset="0%"   stop-color="${P.brassHi}" stop-opacity=".5"/>
        <stop offset="55%"  stop-color="${P.brass}"   stop-opacity=".18"/>
        <stop offset="100%" stop-color="${P.brass}"   stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="lanternHalo" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stop-color="${P.brassLit}" stop-opacity=".9"/>
        <stop offset="40%"  stop-color="${P.brass}"    stop-opacity=".28"/>
        <stop offset="100%" stop-color="${P.brass}"    stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="brassLeaf" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${P.brassHi}"/><stop offset="50%" stop-color="${P.brass}"/><stop offset="100%" stop-color="${P.brassCore}"/>
      </linearGradient>
      <linearGradient id="brassBar" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${P.brassCore}"/><stop offset="45%" stop-color="${P.brass}"/><stop offset="55%" stop-color="${P.brassHi}"/><stop offset="100%" stop-color="${P.brassCore}"/>
      </linearGradient>
      <linearGradient id="deepWater" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${P.deepHi}"/><stop offset="55%" stop-color="${P.deep}"/><stop offset="100%" stop-color="${P.deepLo}"/>
      </linearGradient>
      <radialGradient id="vignette" cx="50%" cy="46%" r="72%">
        <stop offset="58%" stop-color="#000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#2a1f10" stop-opacity=".15"/>
      </radialGradient>
      <radialGradient id="vignetteDeep" cx="50%" cy="42%" r="75%">
        <stop offset="45%" stop-color="#000" stop-opacity="0"/>
        <stop offset="100%" stop-color="${P.deepLo}" stop-opacity=".85"/>
      </radialGradient>
      <filter id="grainTex" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="n"/>
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.30  0 0 0 0 0.26  0 0 0 0 0.16  0 0 0 0.7 0" result="c"/>
        <feComposite operator="in" in2="SourceGraphic"/>
      </filter>
      ${hatch('h-ink', P.ink, 6, 1, 45)}
      ${hatch('h-ink2', P.ink, 4, 1.05, 45)}
      ${hatch('h-ink3', P.ink, 3, 1.1, 45)}
      ${hatch('h-inkV', P.ink, 6, 1, -45)}
      ${hatch('h-inkH', P.ink, 5, 0.9, 0)}
      ${hatch('h-brass', P.brassCore, 5, 1, 45)}
      ${hatch('h-uns', P.uns, 6, 1, 45)}
      ${xhatch('x-ink', P.ink, 7, 0.85)}
      ${xhatch('x-ink-fine', P.ink, 5, 0.7)}
      ${xhatch('x-uns', P.uns, 7, 0.8)}
      ${stipple('s-ink', P.ink, 7, 0.85)}
      ${stipple('s-uns', P.uns, 8, 0.85)}
      <pattern id="snow" width="60" height="60" patternUnits="userSpaceOnUse">
        <circle cx="10" cy="14" r="0.8" fill="${P.chart}" opacity=".10"/>
        <circle cx="42" cy="8"  r="0.6" fill="${P.chart}" opacity=".08"/>
        <circle cx="30" cy="40" r="1.0" fill="${P.chart}" opacity=".09"/>
        <circle cx="54" cy="52" r="0.6" fill="${P.chart}" opacity=".07"/>
        <circle cx="18" cy="50" r="0.7" fill="${P.chart}" opacity=".06"/>
      </pattern>
    </defs></svg>`;
}
export function hatch(id: string, color: string, gap: number, w: number, rot: number): string {
  return `<pattern id="${id}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(${rot})">
      <line x1="0" y1="0" x2="0" y2="${gap}" stroke="${color}" stroke-width="${w}"/></pattern>`;
}
export function xhatch(id: string, color: string, gap: number, w: number): string {
  return `<pattern id="${id}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="${gap}" stroke="${color}" stroke-width="${w}"/>
      <line x1="0" y1="0" x2="${gap}" y2="0" stroke="${color}" stroke-width="${w}"/></pattern>`;
}
export function stipple(id: string, color: string, gap: number, r: number): string {
  return `<pattern id="${id}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse">
      <circle cx="${gap / 2}" cy="${gap / 2}" r="${r}" fill="${color}"/></pattern>`;
}

type SheetOpts = { seed?: number; radius?: number; foxing?: number; grain?: number; deckle?: boolean };
export function chartSheet(w: number, h: number, opts: SheetOpts = {}): string {
  const seed = opts.seed || 42, r = rng(seed);
  const rad = opts.radius == null ? 0 : opts.radius;
  let foxing = '';
  const n = opts.foxing == null ? Math.round((w * h) / 98000) : opts.foxing;
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, rr = 3 + r() * 13, o = .03 + r() * .055;
    const col = r() > .5 ? '#a98a54' : '#836237';
    foxing += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rr.toFixed(1)}" fill="${col}" opacity="${o.toFixed(3)}"/>`;
  }
  let fibres = '';
  for (let i = 0; i < Math.round(w / 36); i++) {
    const x = r() * w, y = r() * h, len = 10 + r() * 40, a = (r() * 180).toFixed(0);
    fibres += `<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x + len).toFixed(0)}" y2="${y.toFixed(0)}" stroke="${P.ink}" stroke-width="0.6" opacity="0.045" transform="rotate(${a} ${x.toFixed(0)} ${y.toFixed(0)})"/>`;
  }
  return `<svg class="chartsheet" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%">
      <rect x="0" y="0" width="${w}" height="${h}" rx="${rad}" fill="${P.chart}"/>
      <g filter="url(#rough-fine)">${foxing}${fibres}</g>
      <rect x="0" y="0" width="${w}" height="${h}" rx="${rad}" fill="#141c22" opacity="${opts.grain == null ? 0.4 : opts.grain}" filter="url(#grainTex)"/>
      <rect x="0" y="0" width="${w}" height="${h}" rx="${rad}" fill="url(#vignette)"/>
      ${opts.deckle ? deckleRim(w, h) : ''}
    </svg>`;
}
export function deckleRim(w: number, h: number): string {
  return `<rect x="3" y="3" width="${w - 6}" height="${h - 6}" fill="none" stroke="${P.deckle}" stroke-width="2.5" opacity=".5" filter="url(#rough)"/>`;
}

type DeepOpts = { seed?: number; motes?: number; contours?: number; glow?: { x: number; y: number; r?: number }; radius?: number };
export function deepField(w: number, h: number, opts: DeepOpts = {}): string {
  const seed = opts.seed || 5, r = rng(seed);
  let motes = '';
  const n = opts.motes == null ? Math.round((w * h) / 26000) : opts.motes;
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, rr = (0.4 + r() * 1.5), o = (.04 + r() * .14).toFixed(3);
    motes += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rr.toFixed(1)}" fill="${P.chart}" opacity="${o}"/>`;
  }
  let contours = '';
  for (let i = 0; i < (opts.contours || 4); i++) {
    const y = h * (0.2 + 0.16 * i) + r() * 20;
    contours += `<path d="M0 ${y.toFixed(0)} Q ${w * 0.3} ${(y - 24).toFixed(0)} ${w * 0.55} ${y.toFixed(0)} T ${w} ${(y + 10).toFixed(0)}" fill="none" stroke="${P.chart}" stroke-width="1" opacity="0.05"/>`;
  }
  const glow = opts.glow ? `<circle cx="${opts.glow.x}" cy="${opts.glow.y}" r="${opts.glow.r || 360}" fill="url(#lanternGlowSoft)"/>` : '';
  const rad = opts.radius == null ? 0 : opts.radius;
  return `<svg class="deepfield" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%">
      <rect x="0" y="0" width="${w}" height="${h}" rx="${rad}" fill="url(#deepWater)"/>
      <g>${contours}</g>
      <g>${motes}</g>
      ${glow}
      <rect x="0" y="0" width="${w}" height="${h}" rx="${rad}" fill="url(#vignetteDeep)"/>
    </svg>`;
}

type LanternOpts = { size?: number; on?: boolean; glow?: number; line?: number };
export function lantern(opts: LanternOpts = {}): string {
  const s = opts.size || 64, on = opts.on !== false, g = opts.glow == null ? 1 : opts.glow;
  const cx = s / 2, cy = s * 0.56, R = s * 0.26;
  const body = on ? 'url(#brassLeaf)' : P.uns, edge = on ? P.brassCore : P.unsLo, hi = on ? P.brassHi : P.unsHi;
  const glow = (on && g > 0) ? `<circle cx="${cx}" cy="${cy}" r="${R * 2.1}" fill="url(#lanternGlow)" opacity="${g}"/>` : '';
  const line = opts.line ? `<line x1="${cx}" y1="${cy - R - opts.line}" x2="${cx}" y2="${cy - R * 1.02}" stroke="${P.ink}" stroke-width="${Math.max(1, s * 0.02)}"/>
                              <circle cx="${cx}" cy="${cy - R - opts.line}" r="${s * 0.02}" fill="${P.ink}"/>` : '';
  return `<g class="lantern">
      ${glow}
      ${line}
      <g filter="url(#rough-fine)">
        <path d="M${cx} ${cy - R * 1.3} q ${R * 0.17} ${R * 0.22} 0 ${R * 0.36}" fill="none" stroke="${edge}" stroke-width="${s * 0.03}"/>
        <circle cx="${cx}" cy="${cy}" r="${R}" fill="${body}"/>
        <path d="M${cx + R * 0.06} ${cy - R * 0.9} a ${R} ${R} 0 0 1 ${R * 0.02} ${R * 1.9} a ${R * 0.62} ${R} 0 0 0 0 ${-R * 1.9} Z" fill="${on ? 'url(#h-brass)' : 'url(#h-uns)'}" opacity="${on ? .5 : .6}"/>
        <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${edge}" stroke-width="${s * 0.035}"/>
        <ellipse cx="${cx - R * 0.32}" cy="${cy - R * 0.36}" rx="${R * 0.36}" ry="${R * 0.26}" fill="${hi}" opacity="${on ? .95 : .55}"/>
        <circle cx="${cx - R * 0.08}" cy="${cy - R * 0.04}" r="${R * 0.3}" fill="${on ? P.brassHi : P.unsHi}" opacity="${on ? .85 : .35}" filter="url(#softglow)"/>
      </g>
      ${on ? `<circle cx="${(cx - R * 0.44).toFixed(1)}" cy="${(cy - R * 0.52).toFixed(1)}" r="${s * 0.016}" fill="#fff" opacity=".9"/>` : ''}
    </g>`;
}

export const DROP: Record<string, number> = { none: 0, short: 0.55, mid: 1.15, hero: 2.7 };
export function lureMark(u: number, opts: { drop?: string; rev?: boolean } = {}): string {
  const dropLen = u * (DROP[opts.drop || 'short'] != null ? DROP[opts.drop || 'short'] : DROP.short);
  const lr = u * 0.94, bw = u * 2.2, cx = bw / 2, cyc = lr * 0.62;
  const rev = opts.rev, lineCol = rev ? P.chart : P.ink;
  const oBot = cyc + lr * 0.46, bh = oBot + dropLen + u * 0.3;
  let drop = '';
  if (dropLen > 0) {
    const dTop = oBot + u * 0.05, dBot = oBot + dropLen;
    let dticks = ''; const nt = dropLen > u * 1.6 ? 2 : 1;
    for (let i = 1; i <= nt; i++) { const y = dTop + (dBot - dTop) * i / (nt + 1); dticks += `<line x1="${cx - u * 0.06}" y1="${y.toFixed(1)}" x2="${cx + u * 0.06}" y2="${y.toFixed(1)}" stroke="${lineCol}" stroke-width="1.1" opacity=".5"/>`; }
    drop = `<line x1="${cx}" y1="${dTop.toFixed(1)}" x2="${cx}" y2="${dBot.toFixed(1)}" stroke="${lineCol}" stroke-width="${Math.max(1.4, u * 0.05)}"/>
        ${dticks}
        <path d="M${cx - u * 0.11} ${dBot.toFixed(1)} l ${u * 0.11} ${u * 0.19} l ${u * 0.11} ${-u * 0.19} l ${-u * 0.11} ${-u * 0.08} Z" fill="url(#brassLeaf)" stroke="${P.brassCore}" stroke-width="1.2"/>`;
  }
  return `<svg viewBox="0 0 ${bw} ${bh.toFixed(1)}" width="${bw}" height="${bh.toFixed(1)}" style="overflow:visible;display:block">
      <g filter="url(#rough-fine)">${drop}</g>
      <g transform="translate(${cx - lr / 2},${(cyc - lr * 0.56).toFixed(1)})">${lantern({ size: lr, on: true, glow: 1 })}</g>
    </svg>`;
}

export function lureO(opts: { size?: number } = {}): string {
  const s = opts.size || 120, cx = s / 2, cy = s * 0.42, R = s * 0.34;
  let ticks = '';
  for (let i = 0; i < 36; i++) {
    const a = i / 36 * Math.PI * 2 - Math.PI / 2; const long = i % 9 === 0; const r1 = R * 1.0, r2 = R * (long ? 0.82 : 0.9);
    ticks += `<line x1="${(cx + Math.cos(a) * r1).toFixed(1)}" y1="${(cy + Math.sin(a) * r1).toFixed(1)}" x2="${(cx + Math.cos(a) * r2).toFixed(1)}" y2="${(cy + Math.sin(a) * r2).toFixed(1)}" stroke="${P.ink}" stroke-width="${long ? 1.1 : 0.7}" opacity="${long ? .55 : .32}"/>`;
  }
  const dropTop = cy + R * 0.06, dropBot = s * 0.98;
  let dticks = ''; for (let i = 1; i <= 3; i++) { const y = dropTop + (dropBot - dropTop) * i / 4; dticks += `<line x1="${cx - 2.5}" y1="${y.toFixed(1)}" x2="${cx + 2.5}" y2="${y.toFixed(1)}" stroke="${P.ink}" stroke-width="1" opacity=".5"/>`; }
  return `<svg viewBox="0 0 ${s} ${s}" width="${s}" height="${s}" style="overflow:visible;display:block">
      <circle cx="${cx}" cy="${cy}" r="${R * 2.05}" fill="url(#lanternGlow)" opacity=".9"/>
      <g filter="url(#rough-fine)">
        <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${P.ink}" stroke-width="${s * 0.055}"/>
        <circle cx="${cx}" cy="${cy}" r="${R * 0.78}" fill="none" stroke="${P.ink}" stroke-width="${s * 0.012}" opacity=".4"/>
        ${ticks}
        <line x1="${cx}" y1="${dropTop.toFixed(1)}" x2="${cx}" y2="${dropBot.toFixed(1)}" stroke="${P.ink}" stroke-width="${s * 0.02}"/>
        ${dticks}
      </g>
      <g transform="translate(${cx - R * 0.5},${cy - R * 0.5})">${lantern({ size: R, on: true, glow: 1 })}</g>
      <g transform="translate(${cx - s * 0.05},${dropBot - s * 0.09})">
        <path d="M${s * 0.05} 0 l ${s * 0.045} ${s * 0.06} l ${-s * 0.045} ${s * 0.03} l ${-s * 0.045} ${-s * 0.03} Z" fill="url(#brassLeaf)" stroke="${P.brassCore}" stroke-width="1" filter="url(#rough-fine)"/>
      </g>
    </svg>`;
}

export function depthDial(opts: { size?: number; value?: number } = {}): string {
  const s = opts.size || 150, c = s / 2, R = s * 0.42, val = opts.value == null ? 0.62 : opts.value;
  let ticks = ''; for (let i = 0; i <= 40; i++) { const a = (-Math.PI * 0.5) + i / 40 * (Math.PI * 2 * 0.82); const long = i % 5 === 0; const r1 = R, r2 = R * (long ? 0.84 : 0.91); ticks += `<line x1="${(c + Math.cos(a) * r1).toFixed(1)}" y1="${(c + Math.sin(a) * r1).toFixed(1)}" x2="${(c + Math.cos(a) * r2).toFixed(1)}" y2="${(c + Math.sin(a) * r2).toFixed(1)}" stroke="${P.ink}" stroke-width="${long ? 1.1 : 0.7}" opacity="${long ? .6 : .34}"/>`; }
  const na = (-Math.PI * 0.5) + val * (Math.PI * 2 * 0.82);
  const nx = c + Math.cos(na) * R * 0.74, ny = c + Math.sin(na) * R * 0.74;
  return `<g class="depthdial" filter="url(#rough-fine)">
      <circle cx="${c}" cy="${c}" r="${R * 1.08}" fill="none" stroke="url(#brassBar)" stroke-width="${s * 0.03}"/>
      <circle cx="${c}" cy="${c}" r="${R}" fill="${P.chartHi}"/>
      <circle cx="${c}" cy="${c}" r="${R}" fill="none" stroke="${P.ink}" stroke-width="1.1" opacity=".7"/>
      ${ticks}
      <line x1="${c}" y1="${c}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="${P.brassCore}" stroke-width="${s * 0.022}" stroke-linecap="round"/>
      <circle cx="${c}" cy="${c}" r="${s * 0.05}" fill="url(#brassLeaf)" stroke="${P.brassCore}" stroke-width="1"/>
      <circle cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" r="${s * 0.018}" fill="${P.brassHi}"/>
    </g>`;
}

export function soundingLine(opts: { h?: number; x?: number; top?: number; depth?: number; on?: boolean } = {}): string {
  const h = opts.h || 360, x = opts.x || 20, top = opts.top || 12, depth = opts.depth == null ? 0.5 : opts.depth, on = opts.on !== false;
  const y = top + (h - top - 16) * depth;
  let ticks = ''; for (let i = 0; i <= 10; i++) { const ty = top + (h - top - 16) * i / 10; const long = i % 5 === 0; ticks += `<line x1="${x - (long ? 7 : 4)}" y1="${ty.toFixed(1)}" x2="${x}" y2="${ty.toFixed(1)}" stroke="${P.chart}" stroke-width="${long ? 1.4 : 0.9}" opacity="${long ? .5 : .3}"/>`; }
  return `<g class="sounding">
      <line x1="${x}" y1="${top}" x2="${x}" y2="${h - 6}" stroke="${P.chart}" stroke-width="1.4" opacity=".35"/>
      ${ticks}
      <g transform="translate(${x - 14},${y - 14})">${lantern({ size: 28, on })}</g>
    </g>`;
}

export function leader(x1: number, y1: number, x2: number, y2: number, opts: { color?: string; op?: number; r?: number; w?: number } = {}): string {
  const col = opts.color || P.ink, op = opts.op == null ? .6 : opts.op;
  return `<g class="leader"><circle cx="${f2(x1)}" cy="${f2(y1)}" r="${opts.r || 2.1}" fill="${col}"/>
      <line x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}" stroke="${col}" stroke-width="${opts.w || 1}" stroke-dasharray="1 4" stroke-linecap="round" opacity="${op}"/></g>`;
}

export function cartouche(w: number, h: number, opts: { dark?: boolean } = {}): string {
  const roll = h * 0.5, dark = opts.dark;
  const fill = dark ? P.deepHi : P.chartHi, line = dark ? P.brass : P.ink;
  return `<g class="cartouche" filter="url(#rough)">
      <path d="M${roll} 2 H ${w - roll} Q ${w - 2} 2 ${w - 2} ${h / 2} Q ${w - 2} ${h - 2} ${w - roll} ${h - 2} H ${roll} Q 2 ${h - 2} 2 ${h / 2} Q 2 2 ${roll} 2 Z" fill="${fill}" stroke="${line}" stroke-width="1.4"/>
      <path d="M${roll} 7 H ${w - roll} Q ${w - 8} 7 ${w - 8} ${h / 2} Q ${w - 8} ${h - 7} ${w - roll} ${h - 7} H ${roll} Q 8 ${h - 7} 8 ${h / 2} Q 8 7 ${roll} 7 Z" fill="none" stroke="${line}" stroke-width="0.7" opacity=".5"/>
      <circle cx="${roll * 0.62}" cy="${h / 2}" r="2.4" fill="${P.brass}"/><circle cx="${w - roll * 0.62}" cy="${h / 2}" r="2.4" fill="${P.brass}"/>
    </g>`;
}

export function dividers(opts: { size?: number; flip?: boolean } = {}): string {
  const s = opts.size || 120, flip = opts.flip ? 'scale(-1,1)' : '';
  return `<g class="dividers" filter="url(#rough-fine)" transform="${flip}">
      <circle cx="${s * 0.5}" cy="${s * 0.12}" r="${s * 0.06}" fill="none" stroke="${P.brassCore}" stroke-width="2"/>
      <path d="M${s * 0.5} ${s * 0.17} L ${s * 0.28} ${s * 0.9}" stroke="url(#brassBar)" stroke-width="${s * 0.05}" stroke-linecap="round"/>
      <path d="M${s * 0.5} ${s * 0.17} L ${s * 0.72} ${s * 0.9}" stroke="url(#brassBar)" stroke-width="${s * 0.05}" stroke-linecap="round"/>
      <path d="M${s * 0.28} ${s * 0.9} l ${-s * 0.02} ${s * 0.06}" stroke="${P.ink}" stroke-width="2" stroke-linecap="round"/>
      <path d="M${s * 0.72} ${s * 0.9} l ${s * 0.02} ${s * 0.06}" stroke="${P.ink}" stroke-width="2" stroke-linecap="round"/>
      <circle cx="${s * 0.5}" cy="${s * 0.12}" r="${s * 0.02}" fill="${P.brassHi}"/>
    </g>`;
}

export function flourish(w: number, opts: { dark?: boolean } = {}): string {
  const c = w / 2, col = opts.dark ? P.brass : P.ink;
  return `<g class="flourish" filter="url(#rough-fine)">
      <path d="M8 8 Q ${c} 0 ${w - 8} 8" fill="none" stroke="${col}" stroke-width="1.2" opacity=".55"/>
      <path d="M${c - 26} 8 q 10 10 26 0 q 16 10 26 0" fill="none" stroke="${col}" stroke-width="1" opacity=".45"/>
      <circle cx="${c}" cy="8" r="2.6" fill="${P.brass}"/>
      <circle cx="${c - 40}" cy="8" r="1.5" fill="${col}"/><circle cx="${c + 40}" cy="8" r="1.5" fill="${col}"/>
    </g>`;
}

export type StampKind = 'verified' | 'withheld' | 'sounding';
export function stamp(kind: StampKind = 'verified', opts: { size?: number } = {}): string {
  const s = opts.size || 96, c = s / 2, R = s * 0.4;
  const col = kind === 'verified' ? P.brassCore : kind === 'withheld' ? P.unsLo : P.ink;
  const glyph = kind === 'verified'
    ? `<path d="M${c - R * 0.42} ${c + R * 0.02} l ${R * 0.28} ${R * 0.32} l ${R * 0.6} ${-R * 0.66}" fill="none" stroke="${col}" stroke-width="${s * 0.06}" stroke-linecap="round" stroke-linejoin="round"/>`
    : kind === 'withheld'
      ? `<text x="${c}" y="${c}" dy=".34em" text-anchor="middle" font-family="Fraunces,serif" font-weight="800" font-size="${s * 0.5}" fill="${col}">?</text>`
      : `<circle cx="${c}" cy="${c}" r="${R * 0.3}" fill="none" stroke="${col}" stroke-width="${s * 0.05}" stroke-dasharray="2 4"/>`;
  let ticks = ''; for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; ticks += `<line x1="${(c + Math.cos(a) * R * 0.94).toFixed(1)}" y1="${(c + Math.sin(a) * R * 0.94).toFixed(1)}" x2="${(c + Math.cos(a) * R * 1.0).toFixed(1)}" y2="${(c + Math.sin(a) * R * 1.0).toFixed(1)}" stroke="${col}" stroke-width="0.6" opacity=".4"/>`; }
  return `<svg viewBox="0 0 ${s} ${s}" width="${s}" height="${s}" style="overflow:visible;display:block"><g filter="url(#rough)" opacity="${kind === 'withheld' ? .85 : 1}">
      <circle cx="${c}" cy="${c}" r="${R}" fill="none" stroke="${col}" stroke-width="${s * 0.03}"/>
      <circle cx="${c}" cy="${c}" r="${R * 0.86}" fill="none" stroke="${col}" stroke-width="1" opacity=".5"/>
      ${ticks}${glyph}
    </g></svg>`;
}
