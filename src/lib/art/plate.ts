/* Fathom plate library — the living cutaway plates + the Anglerfish. Hand-authored SVG engraving.
   Includes a GENERIC diagram renderer so a stranger's arbitrary question ("how does X work?") gets
   an on-style inked cutaway, not just the six bespoke subjects. Composes on top of chart.ts. */
import * as C from './chart';
const P = C.P;

/* ---------- THE ANGLERFISH — round, spectacled deep-dweller who carries the lamp ---------- */
export type Pose = 'lamp' | 'delight' | 'hold';
export function anglerfish(pose: Pose = 'lamp', opts: { rev?: boolean } = {}): string {
  const ink = P.ink, sh = 'url(#x-ink-fine)';
  const rev = opts.rev;
  const belly = rev ? '#e9e2cf' : P.chartHi;
  const bodyfill = rev ? '#cdd3cf' : P.chart2;
  const body = `M22 62
      C20 50 26 40 36 34 C46 28 58 26 68 28 C80 30 90 36 95 46
      C99 54 99 62 95 70 C90 80 80 88 68 90 C56 92 44 90 35 84
      C27 79 24 72 22 62 Z`;
  const tail = `<path d="M24 56 C12 46 4 42 2 48 C6 54 6 62 3 70 C10 66 18 66 25 70 C22 64 22 60 24 56 Z" fill="${belly}" stroke="${ink}" stroke-width="1.6"/>
      <path d="M8 50 L21 60 M6 60 L22 62 M8 68 L21 65" stroke="${ink}" stroke-width="0.9" opacity=".5"/>`;
  const dorsal = `<g stroke="${ink}" stroke-width="1.4" fill="none" opacity=".85"><path d="M44 30 l-2 -8"/><path d="M52 27 l-1 -8"/><path d="M60 27 l1 -8"/></g>`;
  const pect = `<path d="M46 74 C42 80 42 86 46 89 C49 85 53 83 57 82 C53 79 49 76 46 74 Z" fill="${belly}" stroke="${ink}" stroke-width="1.4"/>
      <path d="M47 78 l3 8 M51 78 l3 7" stroke="${ink}" stroke-width="0.8" opacity=".5"/>`;
  const shade = `<path d="M22 62 C20 50 26 40 36 34 C46 28 58 26 68 28 C74 29 79 31 84 34 C74 33 62 34 52 39 C40 45 32 54 30 66 C28 74 30 80 34 84 C27 79 24 72 22 62 Z" fill="${sh}" opacity=".4"/>`;
  const rod = `<path d="M62 30 C62 12 70 4 84 6" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round" filter="url(#rough-fine)"/>`;
  const lampBright = pose === 'delight' ? 1 : 0.92;
  const lamp = `<g transform="translate(${84 - 9},${6 - 9})">${C.lantern({ size: 18, on: true, glow: lampBright })}</g>`;
  const eyeX = 70, eyeY = 52, eyeR = 8.4;
  const happy = pose === 'delight';
  const eye = happy
    ? `<path d="M${eyeX - 6} ${eyeY + 1} q6 -7 12 0" fill="none" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>`
    : `<circle cx="${eyeX}" cy="${eyeY}" r="${eyeR}" fill="${belly}" stroke="${ink}" stroke-width="0.8"/>
         <circle cx="${eyeX + 0.6}" cy="${eyeY + 0.4}" r="4.1" fill="${ink}"/>
         <circle cx="${eyeX - 1}" cy="${eyeY - 1.4}" r="1.5" fill="#fff"/>`;
  const specs = `<g filter="url(#rough-fine)">
      <circle cx="${eyeX}" cy="${eyeY}" r="${eyeR + 2.2}" fill="none" stroke="url(#brassLeaf)" stroke-width="2.2"/>
      <circle cx="${eyeX}" cy="${eyeY}" r="${eyeR + 2.2}" fill="none" stroke="${P.brassCore}" stroke-width="0.7" opacity=".6"/>
      <path d="M${eyeX + eyeR + 2} ${eyeY - 1} q6 -1 9 2" fill="none" stroke="url(#brassLeaf)" stroke-width="2"/>
      <path d="M${eyeX - eyeR - 2} ${eyeY} q-6 0 -10 3" fill="none" stroke="${P.brassCore}" stroke-width="1.6" opacity=".7"/></g>`;
  const mouth = happy
    ? `<path d="M60 74 q10 8 20 1" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>`
    : `<path d="M58 73 q12 5 24 -1" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>
         <path d="M64 74 l1.5 3 l1.5 -3 M74 74 l1.5 3 l1.5 -3" fill="none" stroke="${ink}" stroke-width="1" opacity=".7"/>`;
  const brow = `<path d="M60 40 q6 -3 12 -1" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>`;
  const holdFin = pose === 'hold' ? `<path d="M40 74 C30 70 24 60 26 50 C30 58 36 62 42 62 C40 66 40 70 44 76 Z" fill="${belly}" stroke="${ink}" stroke-width="1.4"/>` : '';
  return `<g class="anglerfish">
      ${tail}
      <g filter="url(#rough)"><path d="${body}" fill="${bodyfill}"/></g>
      ${shade}
      <path d="${body}" fill="none" stroke="${ink}" stroke-width="2.1" filter="url(#rough-fine)"/>
      ${dorsal}${pect}${holdFin}
      ${rod}${lamp}
      ${specs}${eye}${brow}${mouth}
      <path d="M56 44 q-3 8 0 16" fill="none" stroke="${ink}" stroke-width="1" opacity=".4"/>
      <path d="M40 66 q4 3 8 0 q4 3 8 0" fill="none" stroke="${ink}" stroke-width="0.9" opacity=".35"/>
    </g>`;
}

/* a sine-wave path across [x0..x1] at baseline y, amplitude a, wavelength wl, phase p */
export function wavePath(x0: number, x1: number, y: number, a: number, wl: number, p = 0): string {
  let d = `M${x0.toFixed(1)} ${(y + a * Math.sin(p)).toFixed(1)}`; const step = Math.max(2, (x1 - x0) / 60);
  for (let x = x0 + step; x <= x1; x += step) { const yy = y + a * Math.sin((x - x0) / wl * Math.PI * 2 + p); d += ` L${x.toFixed(1)} ${yy.toFixed(1)}`; }
  return d;
}

export type Beat = 'incoming' | 'cancel' | 'silence';

/* ---------- THE HERO CUTAWAY: noise-cancelling headphone + ear (viewBox 0 0 460 320) ---------- */
export function cutawayHeadphone(opts: { beat?: Beat } = {}): string {
  const ink = P.ink, beat = opts.beat || 'silence';
  const g: string[] = [];
  let spiral = 'M70 168'; { let a = 0, r = 2; const cx = 70, cy = 160; let d = 'M' + (cx) + ' ' + (cy);
    for (let i = 0; i < 28; i++) { a += 0.5; r += 1.15; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; d += ` L${x.toFixed(1)} ${y.toFixed(1)}`; } spiral = d; }
  g.push(`<g filter="url(#rough-fine)">
      <path d="M30 250 C20 200 22 120 40 92 C30 140 34 200 48 250 Z" fill="url(#x-ink-fine)" opacity=".18"/>
      <path d="M40 250 C30 205 30 125 48 96 C64 74 96 70 120 82" fill="none" stroke="${ink}" stroke-width="2" opacity=".8"/>
      <path d="${spiral}" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>
      <circle cx="70" cy="160" r="2" fill="${ink}"/></g>`);
  g.push(`<g filter="url(#rough-fine)">
      <line x1="126" y1="150" x2="132" y2="176" stroke="${ink}" stroke-width="2.4"/>
      <path d="M132 138 C160 132 188 132 206 140" fill="none" stroke="${ink}" stroke-width="2"/>
      <path d="M132 180 C160 186 188 186 206 178" fill="none" stroke="${ink}" stroke-width="2"/></g>`);
  g.push(`<g filter="url(#rough)">
      <path d="M206 96 C238 92 252 120 250 150 C249 178 236 210 210 216 C224 196 226 176 220 160 C214 176 200 180 196 168 C204 160 208 150 206 140 C214 128 216 112 206 96 Z" fill="${P.chartHi}" stroke="${ink}" stroke-width="2.1"/>
      <path d="M214 120 C222 132 222 150 214 162" fill="none" stroke="${ink}" stroke-width="1.3" opacity=".55"/></g>`);
  g.push(`<g filter="url(#rough)">
      <path d="M262 70 C300 66 330 96 332 160 C334 224 302 252 264 250 C288 232 296 200 296 160 C296 120 286 88 262 70 Z" fill="${P.chart2}" stroke="${ink}" stroke-width="2.2"/>
      <path d="M262 70 C300 66 330 96 332 160 C334 224 302 252 264 250" fill="url(#x-ink-fine)" opacity=".14"/>
      <path d="M258 96 C246 120 246 200 258 224 C270 214 274 190 274 160 C274 130 270 106 258 96 Z" fill="url(#x-ink)" opacity=".5"/>
      <path d="M258 96 C246 120 246 200 258 224" fill="none" stroke="${ink}" stroke-width="1.6"/>
      <path d="M300 116 L288 150 L288 170 L300 204" fill="none" stroke="${P.brassCore}" stroke-width="2.4"/>
      <path d="M300 116 L288 150 L288 170 L300 204" fill="url(#brassLeaf)" opacity=".18"/>
      <ellipse cx="300" cy="160" rx="6" ry="46" fill="url(#brassLeaf)" stroke="${P.brassCore}" stroke-width="1.6"/>
      <rect x="322" y="150" width="16" height="20" rx="3" fill="${P.chartHi}" stroke="${ink}" stroke-width="1.8"/>
      <g stroke="${ink}" stroke-width="0.8" opacity=".6"><line x1="325" y1="155" x2="335" y2="155"/><line x1="325" y1="160" x2="335" y2="160"/><line x1="325" y1="165" x2="335" y2="165"/></g></g>`);
  const incoming = `<path d="${wavePath(340, 432, 160, 13, 26, 0)}" fill="none" stroke="${ink}" stroke-width="2.2" opacity=".9"/>`;
  const anti = `<path d="${wavePath(196, 286, 160, 13, 26, Math.PI)}" fill="none" stroke="${P.brassCore}" stroke-width="2.4"/>`;
  const flat = `<line x1="138" y1="160" x2="196" y2="160" stroke="${P.brass}" stroke-width="2.6"/>
                  <circle cx="167" cy="160" r="3" fill="${P.brass}"/>`;
  const both = `<path d="${wavePath(138, 196, 160, 12, 26, 0)}" fill="none" stroke="${ink}" stroke-width="2" opacity=".85"/>
                   <path d="${wavePath(138, 196, 160, 12, 26, Math.PI)}" fill="none" stroke="${P.brassCore}" stroke-width="2" opacity=".85"/>`;
  let waves = incoming;
  if (beat === 'incoming') { waves += `<path d="${wavePath(196, 286, 160, 13, 26, 0)}" fill="none" stroke="${ink}" stroke-width="2" opacity=".55"/>`; }
  if (beat === 'cancel') { waves += anti + both; }
  if (beat === 'silence') { waves += anti + flat; }
  g.push(`<g>${waves}</g>`);
  return `<g class="cut-headphone">${g.join('')}</g>`;
}

export function headphoneLabels(beat: Beat): { leaders: string; labels: string } {
  const L = (x1: number, y1: number, x2: number, y2: number, c?: string) => C.leader(x1, y1, x2, y2, { color: c || P.ink, op: .58 });
  const t = (x: number, y: number, s: string, anchor = 'start', col?: string, it?: boolean) => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Fraunces,serif" font-style="${it ? 'italic' : 'normal'}" font-weight="600" font-size="13" letter-spacing="1.3" fill="${col || P.ink}" ${it ? '' : 'style="text-transform:uppercase"'}>${s}</text>`;
  const leaders = L(70, 176, 40, 300) + L(129, 180, 150, 300) + L(168, 138, 214, 62) + L(300, 208, 322, 318, P.brassCore) + L(338, 150, 372, 102) + L(408, 158, 452, 140);
  let labels = t(14, 312, 'cochlea') + t(120, 312, 'eardrum') + t(196, 54, 'ear canal') + t(284, 330, 'driver · anti-noise', 'start', P.brassInk) + t(356, 96, 'microphone') + t(474, 134, 'incoming noise →', 'end');
  if (beat === 'silence') { labels += t(214, 150, '= silence', 'middle', P.brassInk, true).replace('font-size="13"', 'font-size="16"'); }
  return { leaders, labels };
}

/* the key-beat labels only — the anatomy was labelled on the plate beat */
export function headphoneWaveLabels(beat: Beat): string {
  const t = (x: number, y: number, s: string, a = 'start', it = false, size = 13) =>
    `<text x="${x}" y="${y}" text-anchor="${a}" font-family="Fraunces,serif" font-style="${it ? 'italic' : 'normal'}" font-weight="${it ? 700 : 600}" font-size="${size}" letter-spacing="1.3" fill="${P.brassInk}" ${it ? '' : 'style="text-transform:uppercase"'}>${s}</text>`;
  const L = (a: number, b: number, c: number, d: number) => C.leader(a, b, c, d, { color: P.brassCore, op: .6 });
  let out = L(300, 208, 306, 250) + t(276, 268, 'driver · anti-noise') + t(474, 138, 'incoming noise →', 'end');
  if (beat === 'silence') out += t(214, 150, '= silence', 'middle', true, 16);
  return out;
}

/* ---------- simple subject cutaways for the logbook (viewBox 0 0 200 200, iconic) ---------- */
export function subject(kind: string): string {
  const ink = P.ink, sh = 'url(#x-ink-fine)';
  if (kind === 'sky') return `<g filter="url(#rough-fine)">
      <path d="M18 176 C60 150 140 150 182 176" fill="url(#x-ink-fine)" opacity=".2"/>
      <path d="M12 184 C60 150 140 150 188 184" fill="none" stroke="${ink}" stroke-width="2.2"/>
      <path d="M20 150 C64 122 136 122 180 150" fill="none" stroke="${ink}" stroke-width="1" stroke-dasharray="2 5" opacity=".5"/>
      <circle cx="150" cy="46" r="15" fill="url(#brassLeaf)" stroke="${P.brassCore}" stroke-width="1.6"/>
      <g stroke="${P.brassCore}" stroke-width="1.4" opacity=".8"><path d="M150 24 v-9"/><path d="M170 34 l7 -6"/><path d="M130 34 l-7 -6"/></g>
      <g stroke="${ink}" stroke-width="1.4" opacity=".8"><path d="M138 54 q-30 30 -70 60"/><path d="M144 58 q-26 34 -60 66"/></g>
      <g stroke="${ink}" stroke-width="1" opacity=".45"><path d="M60 120 l-6 -3 M60 120 l-1 -6 M84 100 l-6 -2 M84 100 l-2 -6"/></g>
      <text x="66" y="150" font-family="Fraunces,serif" font-size="11" fill="${P.brassInk}" opacity=".9">blue ↑ · red →</text></g>`;
  if (kind === 'bread') return `<g filter="url(#rough)">
      <path d="M28 150 C24 108 44 78 100 78 C156 78 176 108 172 150 C172 166 150 172 100 172 C50 172 28 166 28 150 Z" fill="${P.chartHi}" stroke="${ink}" stroke-width="2.2"/>
      <path d="M28 150 C24 108 44 78 100 78 C120 78 134 84 144 94 C110 92 70 100 52 124 C40 140 38 152 44 164 C34 160 28 156 28 150 Z" fill="${sh}" opacity=".3"/>
      <g stroke="${ink}" stroke-width="1.4" fill="none" opacity=".8">
        <circle cx="72" cy="128" r="9"/><circle cx="104" cy="116" r="12"/><circle cx="134" cy="132" r="8"/><circle cx="90" cy="148" r="7"/><circle cx="120" cy="150" r="9"/><circle cx="150" cy="120" r="6"/></g>
      <g stroke="${P.brassCore}" stroke-width="1.4" opacity=".85"><path d="M104 116 l0 -18 M104 98 l-4 6 M104 98 l4 6"/></g>
      </g>`;
  if (kind === 'blackhole') return `<g filter="url(#rough-fine)">
      <g stroke="${ink}" stroke-width="0.9" opacity=".4" fill="none">
        ${(() => { let s = ''; for (let i = 0; i < 7; i++) { const y = 60 + i * 16; s += `<path d="M20 ${y} C70 ${y + (i < 3 ? 18 : 38)} 130 ${y + (i < 3 ? 18 : 38)} 180 ${y}"/>`; } return s; })()}</g>
      <circle cx="100" cy="118" r="20" fill="${P.deep}" stroke="${ink}" stroke-width="2"/>
      <circle cx="100" cy="118" r="30" fill="none" stroke="${P.brassCore}" stroke-width="1.4" opacity=".7" stroke-dasharray="2 4"/>
      <path d="M20 70 C70 74 100 90 118 108" fill="none" stroke="${P.brass}" stroke-width="2.2"/>
      <path d="M118 108 l-8 -1 l3 7" fill="${P.brass}"/></g>`;
  if (kind === 'sleep') return `<g filter="url(#rough)">
      <path d="M150 60 C118 52 78 62 66 96 C58 118 60 140 54 150 C50 156 52 160 58 160
               C56 168 62 174 72 172 C74 180 84 182 92 178 C120 184 156 176 164 146
               C172 116 168 78 150 60 Z" fill="${P.chartHi}" stroke="${ink}" stroke-width="2.1"/>
      <path d="M66 96 C60 116 62 138 56 150 M58 160 C64 158 70 160 72 166" fill="none" stroke="${ink}" stroke-width="1.1" opacity=".45"/>
      <path d="M96 108 C86 100 92 128 108 118 C124 108 132 128 148 118" fill="none" stroke="${ink}" stroke-width="1" opacity=".4"/>
      <path d="M84 120 q6 -12 12 0 q6 -12 12 0" fill="none" stroke="${ink}" stroke-width="2" opacity=".85"/>
      <path d="M120 120 q16 -4 34 3" fill="none" stroke="${P.brassCore}" stroke-width="2.3"/>
      <circle cx="112" cy="140" r="2" fill="${ink}"/>
      <text x="150" y="58" font-family="Fraunces,serif" font-style="italic" font-size="17" fill="${P.brassInk}">z</text></g>`;
  if (kind === 'onion') return `<g filter="url(#rough)">
      ${(() => { let s = ''; for (let i = 0; i < 5; i++) { const r = 16 + i * 13; s += `<path d="M100 ${170 - 8} C${100 - r} ${162} ${100 - r} ${90} 100 ${74} C${100 + r} ${90} ${100 + r} ${162} 100 ${162}" fill="none" stroke="${ink}" stroke-width="${i === 0 ? 2.2 : 1.4}" opacity="${0.9 - i * 0.1}"/>`; } return s; })()}
      <path d="M100 74 l-3 -14 m3 14 l3 -14" stroke="${ink}" stroke-width="2" fill="none"/>
      <g stroke="${P.brassCore}" stroke-width="1.4" opacity=".85"><path d="M120 96 q16 -14 30 -10 M126 104 q16 -10 28 -4"/></g>
      <circle cx="158" cy="70" r="7" fill="none" stroke="${ink}" stroke-width="1.6"/><path d="M151 70 q7 5 14 0" fill="none" stroke="${ink}" stroke-width="1.2"/>
      <circle cx="160" cy="80" r="1.6" fill="${P.brass}"/></g>`;
  if (kind === 'headphone') return `<g transform="translate(-10,-30) scale(0.46)">${cutawayHeadphone({ beat: 'silence' })}</g>`;
  return genericIcon(kind);
}

/* an iconic generic subject glyph (a labelled vessel) when the subject isn't one of the six */
function genericIcon(_kind: string): string {
  const ink = P.ink;
  return `<g filter="url(#rough)">
    <path d="M52 150 C40 120 46 78 100 74 C154 78 160 120 148 150 C148 166 128 172 100 172 C72 172 52 166 52 150 Z" fill="${P.chartHi}" stroke="${ink}" stroke-width="2.1"/>
    <path d="M52 150 C40 120 46 78 100 74 C120 76 134 84 142 96 C108 92 74 104 62 132 C56 146 54 152 60 162 C55 158 52 154 52 150 Z" fill="url(#x-ink-fine)" opacity=".28"/>
    <circle cx="100" cy="126" r="20" fill="none" stroke="${P.brassCore}" stroke-width="2"/>
    <circle cx="100" cy="126" r="8" fill="url(#brassLeaf)" stroke="${P.brassCore}" stroke-width="1.2"/>
    <g stroke="${ink}" stroke-width="1.2" opacity=".5"><path d="M74 110 h-14 M140 110 h-14 M74 142 h-16 M142 142 h-16"/></g>
    <path d="M30 100 q10 6 20 0" stroke="${P.brass}" stroke-width="2" fill="none"/>
    </g>`;
}

/* ---------- a small labelled expedition plate for the logbook shelf ---------- */
export type PlateSpec = { w?: number; h?: number; subject: string; verified?: boolean; title?: string; meta?: string };
export function logbookPlate(spec: PlateSpec): string {
  const w = spec.w || 240, h = spec.h || 190, s = spec.subject;
  const verified = spec.verified !== false;
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="display:block">
      <rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="10" fill="${P.chartHi}" stroke="${P.ink}" stroke-width="1.4"/>
      <rect x="8" y="8" width="${w - 16}" height="${h - 16}" rx="7" fill="none" stroke="${P.ink}" stroke-width="0.7" opacity=".4"/>
      <g transform="translate(${w / 2 - 82},${20})"><svg viewBox="0 0 200 200" width="164" height="164">${subject(s)}</svg></g>
      <g transform="translate(${w - 34},${14})"><svg viewBox="0 0 26 26" width="26" height="26">${C.stamp(verified ? 'verified' : 'withheld', { size: 26 })}</svg></g>
      <text x="14" y="${h - 30}" font-family="Fraunces,serif" font-weight="700" font-size="13" letter-spacing="1.2" fill="${P.ink}" style="text-transform:uppercase">${C.esc(spec.title || '')}</text>
      <text x="14" y="${h - 14}" font-family="Space Mono,monospace" font-size="10.5" fill="${P.ink45}" opacity=".7">${C.esc(spec.meta || '')}</text>
    </svg>`;
}

/* ══════════════════════════════════════════════════════════════════════════════════════════
   THE GENERIC CUTAWAY — inks ANY question in the Fathom style.
   The Cartographer (LLM) fills a compact Diagram; this renderer inks it, frame by beat.
   viewBox is 0 0 480 340. Coordinates are in that space.
   ══════════════════════════════════════════════════════════════════════════════════════════ */
export type DiagramArchetype = 'cross-section' | 'layers' | 'field' | 'wave' | 'cycle' | 'flow';
export type DiagramLabel = { text: string; x?: number; y?: number; brass?: boolean };
export interface Diagram {
  archetype: DiagramArchetype;
  subject?: string;               // one of the six bespoke subjects, if recognised
  labels: DiagramLabel[];         // 2–6 hand-lettered callouts
  layers?: number;                // for 'layers' / 'cross-section'
  flowLabel?: string;             // label on the moving element (the money beat)
  answerLabel?: string;           // the resolved-state label ("= silence")
}
export type PlayBeat = 'descent' | 'plate' | 'move' | 'answer';

const T = (x: number, y: number, s: string, a = 'start', col?: string, it?: boolean, size = 13) =>
  `<text x="${x}" y="${y}" text-anchor="${a}" font-family="Fraunces,serif" font-style="${it ? 'italic' : 'normal'}" font-weight="600" font-size="${size}" letter-spacing="1.2" fill="${col || P.ink}" ${it ? '' : 'style="text-transform:uppercase"'}>${C.esc(s)}</text>`;

/* auto-place up to 6 labels around the plate perimeter with dotted leaders to an anchor point */
function placeLabels(labels: DiagramLabel[], anchors: Array<{ x: number; y: number }>): string {
  const slots = [
    { x: 40, y: 66, a: 'start' }, { x: 440, y: 66, a: 'end' },
    { x: 40, y: 300, a: 'start' }, { x: 440, y: 300, a: 'end' },
    { x: 240, y: 44, a: 'middle' }, { x: 240, y: 320, a: 'middle' },
  ];
  let out = '';
  labels.slice(0, 6).forEach((lb, i) => {
    const slot = slots[i % slots.length];
    const anc = anchors[i % anchors.length] || { x: 240, y: 170 };
    const col = lb.brass ? P.brassInk : P.ink;
    out += C.leader(anc.x, anc.y, slot.x + (slot.a === 'end' ? -4 : slot.a === 'start' ? 4 : 0), slot.y - 4, { color: lb.brass ? P.brassCore : P.ink, op: .5 });
    out += T(slot.x, slot.y, lb.text, slot.a, col, false, 12.5);
  });
  return out;
}

/* the moving element per archetype, shown/animated by beat */
export function genericCutaway(d: Diagram, beat: PlayBeat = 'plate', opts: { animate?: boolean } = {}): string {
  // bespoke subjects render their hand-tuned art scaled into the 480×340 frame
  if (d.subject && ['headphone', 'sky', 'bread', 'blackhole', 'sleep', 'onion'].includes(d.subject)) {
    if (d.subject === 'headphone') {
      const b: Beat = beat === 'move' ? 'cancel' : beat === 'answer' ? 'silence' : 'incoming';
      if (beat === 'descent') return cutawayHeadphone({ beat: b });
      if (beat === 'plate') { const lab = headphoneLabels(b); return cutawayHeadphone({ beat: b }) + lab.leaders + lab.labels; }
      // move / answer: only the wave labels (anatomy was labelled on the plate beat)
      return cutawayHeadphone({ beat: b }) + headphoneWaveLabels(b);
    }
    return `<g transform="translate(140,70) scale(1.0)">${subject(d.subject)}</g>` + (beat === 'descent' ? '' : placeLabels(d.labels, [{ x: 240, y: 170 }]));
  }
  const animate = opts.animate !== false;
  const ink = P.ink;
  const fade = beat === 'descent' ? ' opacity=".38"' : '';
  let art = '';
  let anchors: Array<{ x: number; y: number }> = [{ x: 240, y: 170 }];

  if (d.archetype === 'wave') {
    // two waveforms meeting; on 'move' the anti-wave rises; on 'answer' they flatten
    const yl = 170;
    const incoming = `<path class="${animate ? 'fx-wave' : ''}" d="${wavePath(300, 452, yl, 15, 30, 0)}" fill="none" stroke="${ink}" stroke-width="2.4"/>`;
    const anti = `<path class="${animate ? 'fx-wave-anti' : ''}" d="${wavePath(150, 300, yl, 15, 30, Math.PI)}" fill="none" stroke="${P.brassCore}" stroke-width="2.6"/>`;
    const flat = `<line x1="60" y1="${yl}" x2="150" y2="${yl}" stroke="${P.brass}" stroke-width="2.8"/><circle cx="105" cy="${yl}" r="3.4" fill="${P.brass}"/>`;
    const barrier = `<g filter="url(#rough)"><ellipse cx="150" cy="${yl}" rx="10" ry="60" fill="url(#brassLeaf)" stroke="${P.brassCore}" stroke-width="1.8"/><rect x="278" y="${yl - 12}" width="18" height="24" rx="3" fill="${P.chartHi}" stroke="${ink}" stroke-width="1.8"/></g>`;
    art = `<g filter="url(#rough-fine)"${fade}>${barrier}${incoming}${beat === 'answer' ? anti + flat : beat === 'move' ? anti : ''}</g>`;
    anchors = [{ x: 375, y: yl }, { x: 150, y: yl }, { x: 105, y: yl }];
  } else if (d.archetype === 'field') {
    // a central mass, a field, and a ray bending toward it (light/gravity)
    const cx = 250, cy = 170;
    let grid = ''; for (let i = 0; i < 7; i++) { const y = 60 + i * 34; const dip = i > 1 && i < 5 ? 30 : 12; grid += `<path d="M40 ${y} C160 ${y + dip} 340 ${y + dip} 460 ${y}" fill="none" stroke="${ink}" stroke-width="0.9" opacity=".32"/>`; }
    const mass = `<circle cx="${cx}" cy="${cy}" r="30" fill="${P.deep}" stroke="${ink}" stroke-width="2.2"/><circle cx="${cx}" cy="${cy}" r="42" fill="none" stroke="${P.brassCore}" stroke-width="1.4" stroke-dasharray="2 5" opacity=".7"/>`;
    const ray = `<path class="${animate && beat !== 'descent' ? 'fx-draw' : ''}" d="M40 100 Q 180 130 ${cx - 30} ${cy - 8}" fill="none" stroke="${P.brass}" stroke-width="2.6"/><path d="M${cx - 30} ${cy - 8} l-9 -2 l3 8" fill="${P.brass}"/>`;
    art = `<g filter="url(#rough-fine)"${fade}><g>${grid}</g>${mass}${beat === 'descent' ? '' : ray}</g>`;
    anchors = [{ x: cx, y: cy }, { x: 120, y: 118 }, { x: cx + 42, y: cy }];
  } else if (d.archetype === 'layers') {
    // horizontal strata, with a ray/particle crossing (atmosphere, skin, ocean, geology)
    const n = Math.max(3, Math.min(6, d.layers || 4));
    let bands = ''; const top = 70, bot = 300, bh = (bot - top) / n;
    for (let i = 0; i < n; i++) { const y = top + i * bh; const hatchId = i % 2 ? 'x-ink-fine' : 'h-ink'; bands += `<rect x="60" y="${y}" width="360" height="${bh}" fill="${P.chartHi}" stroke="${ink}" stroke-width="1.6"/><rect x="60" y="${y}" width="360" height="${bh}" fill="url(#${hatchId})" opacity="${0.1 + i * 0.05}"/>`; }
    const ray = `<path class="${animate && beat !== 'descent' ? 'fx-draw' : ''}" d="M100 ${top - 6} L ${beat === 'answer' ? 300 : 220} ${bot - bh * 0.5}" fill="none" stroke="${P.brass}" stroke-width="2.6"/>`;
    const scatter = beat === 'answer' ? `<g stroke="${P.brassCore}" stroke-width="1.6" opacity=".8"><path d="M300 ${bot - bh * 0.5} l30 -18 M300 ${bot - bh * 0.5} l22 22 M300 ${bot - bh * 0.5} l34 6"/></g>` : '';
    art = `<g filter="url(#rough-fine)"${fade}>${bands}${beat === 'descent' ? '' : ray + scatter}</g>`;
    anchors = []; for (let i = 0; i < n; i++) anchors.push({ x: 90 + i * 20, y: top + i * bh + bh / 2 });
  } else if (d.archetype === 'cycle') {
    // a ring of stages with arrows going round (a process loop)
    const cx = 240, cy = 172, R = 96; const n = Math.max(3, Math.min(6, d.labels.length || 4));
    let stages = ''; anchors = [];
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i / n * Math.PI * 2; const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; anchors.push({ x, y }); stages += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="16" fill="${P.chartHi}" stroke="${ink}" stroke-width="2"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="16" fill="url(#x-ink-fine)" opacity=".14"/>`; }
    let arcs = ''; for (let i = 0; i < n; i++) { const a0 = -Math.PI / 2 + i / n * Math.PI * 2 + 0.35, a1 = -Math.PI / 2 + (i + 1) / n * Math.PI * 2 - 0.35; const x0 = cx + Math.cos(a0) * R, y0 = cy + Math.sin(a0) * R, x1 = cx + Math.cos(a1) * R, y1 = cy + Math.sin(a1) * R; arcs += `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A ${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="${P.brassCore}" stroke-width="2" marker-end=""/><path d="M${x1.toFixed(1)} ${y1.toFixed(1)} l-7 -3 l2 7" fill="${P.brass}"/>`; }
    art = `<g filter="url(#rough-fine)"${fade}><g class="${animate && beat === 'move' ? 'fx-rotate' : ''}" style="transform-origin:${cx}px ${cy}px">${arcs}</g>${stages}<circle cx="${cx}" cy="${cy}" r="6" fill="url(#brassLeaf)" stroke="${P.brassCore}" stroke-width="1"/></g>`;
  } else if (d.archetype === 'flow') {
    // left→right pipeline of vessels with arrows between (signal/food/data)
    const n = Math.max(3, Math.min(5, d.labels.length || 4)); const y = 172; const x0 = 80, x1 = 400; const step = (x1 - x0) / (n - 1);
    let stages = ''; anchors = [];
    for (let i = 0; i < n; i++) { const x = x0 + i * step; anchors.push({ x, y }); stages += `<rect x="${(x - 26).toFixed(1)}" y="${y - 32}" width="52" height="64" rx="10" fill="${P.chartHi}" stroke="${ink}" stroke-width="2"/><rect x="${(x - 26).toFixed(1)}" y="${y - 32}" width="52" height="64" rx="10" fill="url(#x-ink-fine)" opacity=".12"/>`; if (i < n - 1) { const ax = x + step / 2; stages += `<path class="${animate && beat !== 'descent' ? 'fx-pulse' : ''}" d="M${(x + 28).toFixed(1)} ${y} H ${(ax + step / 2 - 30).toFixed(1)}" stroke="${P.brassCore}" stroke-width="2.4"/><path d="M${(x + step - 28).toFixed(1)} ${y} l-8 -4 l0 8 Z" fill="${P.brass}"/>`; } }
    art = `<g filter="url(#rough-fine)"${fade}>${stages}</g>`;
  } else {
    // cross-section (default): a big vessel/shell, concentric inner layers, a labeled core, inflow
    const cx = 236, cy = 172;
    const shell = `<path d="M96 172 C80 108 120 66 236 62 C352 66 392 108 376 172 C376 226 320 250 236 250 C152 250 96 226 96 172 Z" fill="${P.chartHi}" stroke="${ink}" stroke-width="2.3"/>
      <path d="M96 172 C80 108 120 66 236 62 C280 63 316 72 342 90 C250 84 150 104 122 168 C110 200 118 226 140 244 C114 236 96 210 96 172 Z" fill="url(#x-ink-fine)" opacity=".26"/>`;
    const n = Math.max(0, Math.min(4, (d.layers ?? 2)));
    let rings = ''; for (let i = 0; i < n; i++) { const rr = 96 - i * 20; rings += `<ellipse cx="${cx}" cy="${cy}" rx="${rr}" ry="${rr * 0.62}" fill="none" stroke="${ink}" stroke-width="1.3" opacity="${.5 - i * .08}"/>`; }
    const core = `<circle cx="${cx}" cy="${cy}" r="22" fill="url(#brassLeaf)" stroke="${P.brassCore}" stroke-width="1.8"/><circle cx="${cx}" cy="${cy}" r="22" fill="url(#h-brass)" opacity=".3"/>`;
    const inflow = `<path class="${animate && beat !== 'descent' ? 'fx-pulse' : ''}" d="M456 130 H 384" stroke="${ink}" stroke-width="2.4"/><path d="M384 130 l10 -5 l0 10 Z" fill="${ink}"/>`;
    const pulse = beat === 'move' || beat === 'answer' ? `<circle cx="${cx}" cy="${cy}" r="40" fill="none" stroke="${P.brass}" stroke-width="2" opacity=".7" class="${animate ? 'fx-ping' : ''}"/>` : '';
    art = `<g filter="url(#rough-fine)"${fade}>${shell}${rings}${core}${pulse}${beat === 'descent' ? '' : inflow}</g>`;
    anchors = [{ x: cx, y: cy }, { x: 236, y: 66 }, { x: 120, y: 172 }, { x: 352, y: 172 }, { x: 400, y: 130 }];
  }

  // anatomy labels ink on at the 'plate' (first-breath) beat; the move/answer beats stay clean and
  // carry only the flow/answer callout — mirrors the hero headphone treatment.
  const labels = beat === 'plate' ? placeLabels(d.labels, anchors) : '';
  const answer = (beat === 'answer' && d.answerLabel) ? T(240, 156, d.answerLabel, 'middle', P.brassInk, true, 16) : '';
  // the flow callout inks at the TOP of the plate on the move beat (clear of the narration line)
  const flowLab = (beat === 'move' && d.flowLabel) ? T(240, 50, d.flowLabel, 'middle', P.brassInk, true, 14) : '';
  return `<g class="cut-generic">${art}${labels}${answer}${flowLab}</g>`;
}
