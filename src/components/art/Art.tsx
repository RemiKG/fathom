/* React wrappers around the procedural engraving library. Pure (server-renderable):
   the SVG strings are code-generated and deterministic — dangerouslySetInnerHTML is safe here
   (any embedded label text is escaped in the art library via C.esc). */
import * as C from '@/lib/art/chart';
import * as Plate from '@/lib/art/plate';
import type { Diagram, PlayBeat, Pose } from '@/lib/art/plate';

function Raw({ html, className, style }: { html: string; className?: string; style?: React.CSSProperties }) {
  return <span className={className} style={{ display: 'inline-flex', ...style }} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Injected once (in the root layout) so filters/patterns/gradients resolve everywhere. */
export function ArtDefs() {
  return <div aria-hidden dangerouslySetInnerHTML={{ __html: C.defs() }} />;
}

export function Stamp({ kind = 'verified', size = 30, className }: { kind?: C.StampKind; size?: number; className?: string }) {
  return <Raw className={className} html={C.stamp(kind, { size })} />;
}

export function Lantern({ size = 64, on = true, glow = 1, className, style }: { size?: number; on?: boolean; glow?: number; className?: string; style?: React.CSSProperties }) {
  return <Raw className={className} style={style} html={`<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="overflow:visible;display:block">${C.lantern({ size, on, glow })}</svg>`} />;
}

export function DepthDial({ size = 150, value = 0.6, className }: { size?: number; value?: number; className?: string }) {
  return <Raw className={className} html={`<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${C.depthDial({ size, value })}</svg>`} />;
}

export function Anglerfish({ pose = 'lamp', size = 140, rev = false, className, style }: { pose?: Pose; size?: number; rev?: boolean; className?: string; style?: React.CSSProperties }) {
  return <Raw className={className} style={style} html={`<svg viewBox="0 0 120 120" width="${size}" height="${size}" style="overflow:visible;display:block">${Plate.anglerfish(pose, { rev })}</svg>`} />;
}

export function SubjectIcon({ kind, size = 200, className }: { kind: string; size?: number; className?: string }) {
  return <Raw className={className} html={`<svg viewBox="0 0 200 200" width="${size}" height="${size}">${Plate.subject(kind)}</svg>`} />;
}

export function LogbookPlate({ spec, className }: { spec: Plate.PlateSpec; className?: string }) {
  return <Raw className={className} html={Plate.logbookPlate(spec)} />;
}

/** The living cutaway plate for a voyage, rendered at a given beat. Scales to its container via the
    viewBox intrinsic aspect ratio (CSS width:100%; height:auto). */
export function Cutaway({ diagram, beat = 'plate', animate = true, width = '100%', className, style, viewBox = '0 0 480 340', preserve = 'xMidYMid meet' }:
  { diagram: Diagram; beat?: PlayBeat; animate?: boolean; width?: string | number; height?: string | number; className?: string; style?: React.CSSProperties; viewBox?: string; preserve?: string }) {
  const svg = `<svg viewBox="${viewBox}" width="480" height="340" preserveAspectRatio="${preserve}" style="display:block;width:100%;height:auto;overflow:visible">${Plate.genericCutaway(diagram, beat, { animate })}</svg>`;
  return <span className={className} style={{ display: 'block', width, ...style }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function ChartBg({ w = 1440, h = 900, seed = 3, radius, deckle, className, style }: { w?: number; h?: number; seed?: number; radius?: number; deckle?: boolean; className?: string; style?: React.CSSProperties }) {
  return <span className={className} style={{ position: 'absolute', inset: 0, ...style }} dangerouslySetInnerHTML={{ __html: C.chartSheet(w, h, { seed, radius, deckle }) }} />;
}

export function DeepBg({ w = 1440, h = 900, seed = 5, motes, glow, radius, className, style }: { w?: number; h?: number; seed?: number; motes?: number; glow?: { x: number; y: number; r?: number }; radius?: number; className?: string; style?: React.CSSProperties }) {
  return <span className={className} style={{ position: 'absolute', inset: 0, ...style }} dangerouslySetInnerHTML={{ __html: C.deepField(w, h, { seed, motes, glow, radius }) }} />;
}
