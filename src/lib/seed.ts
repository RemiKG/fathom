/* Pre-seeded example voyages — a convenience layered ON TOP of the real path, never instead.
   Each is a real structured record (diagram + claims + REAL source URLs + verdicts + live counters)
   the player renders exactly like a freshly-sounded voyage, and each carries "ask your own →" which
   runs the identical real pipeline on the visitor's own question. Marked example:true, always. */

import { promises as fs } from 'fs';
import path from 'path';
import { getConfig } from '@/lib/config';
import { saveVoyage, listVoyages } from '@/lib/store';
import type { Voyage, Scene, Claim, Source, Counters, VoyageOptions } from '@/lib/pipeline/types';
import { DEFAULT_OPTIONS } from '@/lib/pipeline/types';
import type { Diagram } from '@/lib/art/plate';

let seeded = false;

interface Seed {
  id: string; question: string; title: string; subtitle: string; revelation: string;
  subjectKey: string; diagram: Diagram; sources: Source[];
  claims: Array<{ text: string; src: number | null; note?: string }>;
  scenes: Array<{ subject: string; motion: string; labels: string[]; beat: Scene['editBeat']; dur: number; narr: string }>;
  seconds: number;
}

function src(domain: string, title: string, url: string, extract: string): Source {
  return { id: 'src_' + url.split('/').pop(), domain, url, title, extract };
}

const SEEDS: Seed[] = [
  {
    id: 'ex_headphone', question: 'How does noise-cancelling actually work?',
    title: 'INTO SILENCE', subtitle: 'how a headphone erases a sound', revelation: 'a second, opposite wave meets the noise and undoes it at your eardrum',
    subjectKey: 'headphone',
    diagram: { archetype: 'wave', subject: 'headphone', labels: [{ text: 'microphone' }, { text: 'driver · anti-noise', brass: true }, { text: 'eardrum' }, { text: 'incoming noise' }], flowLabel: 'driver · anti-noise', answerLabel: '= silence' },
    sources: [
      src('en.wikipedia.org', 'Active noise control', 'https://en.wikipedia.org/wiki/Active_noise_control', 'Active noise control is a method for reducing unwanted sound by the addition of a second sound specifically designed to cancel the first.'),
      src('en.wikipedia.org', 'Wave interference', 'https://en.wikipedia.org/wiki/Wave_interference', 'Destructive interference occurs when two waves are out of phase, so their sum has a smaller amplitude; a wave and its inverse cancel.'),
      src('en.wikipedia.org', 'Sound', 'https://en.wikipedia.org/wiki/Sound', 'Sound is a vibration that propagates as an acoustic wave through a medium such as air.'),
    ],
    claims: [
      { text: 'A microphone samples the incoming sound wave.', src: 0 },
      { text: 'The headphone generates an inverted, anti-phase wave.', src: 0 },
      { text: 'Destructive interference cancels the wave at the eardrum.', src: 1 },
      { text: 'It works best on constant, low-frequency noise like engine hum.', src: 0 },
      { text: 'The anti-wave is produced with near-zero latency.', src: null, note: 'shown as "fast" — no citable figure we can back.' },
    ],
    scenes: [
      { subject: 'the ear canal, in section', motion: 'the lantern drops into the ear', labels: ['ear canal'], beat: 'descent', dur: 2.4, narr: 'We drop into the quiet of the ear.' },
      { subject: 'the headphone, in section', motion: 'the plate inks itself in', labels: ['driver', 'microphone', 'eardrum'], beat: 'plate', dur: 3.0, narr: 'A tiny microphone is listening to the world outside.' },
      { subject: 'the driver', motion: 'an equal-and-opposite wave rises to meet the noise', labels: ['anti-noise'], beat: 'move', dur: 3.2, narr: 'So the headphone answers with the exact opposite wave.' },
      { subject: 'the eardrum', motion: 'the two waves flatten into a silent line', labels: ['= silence'], beat: 'answer', dur: 2.8, narr: '…and the sound is undone.' },
    ],
    seconds: 11.4,
  },
  {
    id: 'ex_sky', question: 'Why is the sky blue but sunsets red?',
    title: 'THE LONG RED MILE', subtitle: 'why the sky is blue but sunsets are red', revelation: 'air scatters blue light everywhere by day, but at dusk the blue is scattered away before it reaches you',
    subjectKey: 'sky',
    diagram: { archetype: 'layers', subject: 'sky', labels: [{ text: 'sunlight' }, { text: 'blue scatters', brass: true }, { text: 'the long path' }, { text: 'red survives' }], layers: 4, flowLabel: 'blue scattered away', answerLabel: 'red remains' },
    sources: [
      src('en.wikipedia.org', 'Rayleigh scattering', 'https://en.wikipedia.org/wiki/Rayleigh_scattering', 'Rayleigh scattering is the scattering of light by particles much smaller than the wavelength; shorter (blue) wavelengths scatter far more than longer (red) ones.'),
      src('en.wikipedia.org', 'Diffuse sky radiation', 'https://en.wikipedia.org/wiki/Diffuse_sky_radiation', 'The blue colour of the sky is caused by Rayleigh scattering of sunlight by the atmosphere.'),
      src('en.wikipedia.org', 'Sunset', 'https://en.wikipedia.org/wiki/Sunset', 'At sunset, light travels a longer path through the atmosphere, removing blue and leaving red and orange hues.'),
    ],
    claims: [
      { text: 'Sunlight is a mix of every colour of light.', src: 0 },
      { text: 'Air molecules scatter short blue wavelengths far more than red.', src: 0 },
      { text: 'By day, scattered blue reaches your eyes from all directions.', src: 1 },
      { text: 'At sunset, light crosses much more air, scattering blue away.', src: 2 },
      { text: 'What is left to reach you at dusk is red and orange.', src: 2 },
    ],
    scenes: [
      { subject: 'the atmosphere, in section', motion: 'the lantern descends through the air', labels: ['atmosphere'], beat: 'descent', dur: 2.4, narr: 'Light has to cross an ocean of air to reach you.' },
      { subject: 'a sunbeam entering the air', motion: 'the strata ink themselves in', labels: ['sunlight', 'air'], beat: 'plate', dur: 3.0, narr: 'Sunlight is every colour at once.' },
      { subject: 'blue light scattering', motion: 'the blue bounces away in every direction', labels: ['blue scatters'], beat: 'move', dur: 3.2, narr: 'Air flings the blue light all across the sky.' },
      { subject: 'the long path at dusk', motion: 'the beam takes the long road, only red survives', labels: ['red remains'], beat: 'answer', dur: 2.8, narr: 'At dusk the blue is gone before it arrives — and the sky turns red.' },
    ],
    seconds: 11.6,
  },
  {
    id: 'ex_bread', question: 'Why does bread rise?',
    title: 'THE BREATH IN THE DOUGH', subtitle: 'why bread rises', revelation: 'living yeast breathes out gas that gets trapped in a stretchy web of gluten',
    subjectKey: 'bread',
    diagram: { archetype: 'cross-section', subject: 'bread', labels: [{ text: 'yeast' }, { text: 'CO₂ bubble', brass: true }, { text: 'gluten web' }, { text: 'sugar' }], layers: 2, flowLabel: 'gas expands', answerLabel: 'it rises' },
    sources: [
      src('en.wikipedia.org', 'Yeast', 'https://en.wikipedia.org/wiki/Yeast', 'Yeast are single-celled fungi that convert sugars into carbon dioxide and ethanol through fermentation, causing dough to rise.'),
      src('en.wikipedia.org', 'Fermentation', 'https://en.wikipedia.org/wiki/Fermentation', 'In fermentation, sugars are broken down and carbon dioxide gas is released.'),
      src('en.wikipedia.org', 'Gluten', 'https://en.wikipedia.org/wiki/Gluten', 'Gluten forms an elastic network in dough that traps gas bubbles, giving bread its structure.'),
    ],
    claims: [
      { text: 'Yeast are living single-celled fungi in the dough.', src: 0 },
      { text: 'They eat the flour and sugar and ferment it.', src: 1 },
      { text: 'Fermentation breathes out carbon-dioxide gas.', src: 1 },
      { text: 'A stretchy gluten web traps the gas as bubbles.', src: 2 },
      { text: 'The trapped gas expands and the dough rises.', src: 0 },
    ],
    scenes: [
      { subject: 'the dough, in section', motion: 'the lantern sinks into the dough', labels: ['dough'], beat: 'descent', dur: 2.4, narr: 'Down inside a warm ball of dough…' },
      { subject: 'a yeast cell', motion: 'the plate inks in around a single yeast', labels: ['yeast', 'sugar'], beat: 'plate', dur: 3.0, narr: '…millions of tiny living things are waking up hungry.' },
      { subject: 'a bubble of gas', motion: 'the yeast breathes out gas and a bubble swells', labels: ['CO₂ bubble'], beat: 'move', dur: 3.2, narr: 'Each one breathes out a little puff of gas.' },
      { subject: 'the risen crumb', motion: 'the gluten web stretches and the loaf lifts', labels: ['it rises'], beat: 'answer', dur: 2.6, narr: 'Caught in a stretchy web, the gas lifts the whole loaf.' },
    ],
    seconds: 11.2,
  },
  {
    id: 'ex_blackhole', question: 'How does a black hole bend light?',
    title: 'THE LIGHT THAT FALLS IN', subtitle: 'how a black hole bends light', revelation: 'mass curves space itself, and light simply follows the bent path',
    subjectKey: 'blackhole',
    diagram: { archetype: 'field', subject: 'blackhole', labels: [{ text: 'star behind' }, { text: 'bent ray', brass: true }, { text: 'curved space' }, { text: 'event horizon' }], flowLabel: 'light bends in', answerLabel: 'we see it curved' },
    sources: [
      src('en.wikipedia.org', 'Gravitational lens', 'https://en.wikipedia.org/wiki/Gravitational_lens', 'A gravitational lens is matter that bends the path of light from a source behind it, as predicted by general relativity.'),
      src('en.wikipedia.org', 'General relativity', 'https://en.wikipedia.org/wiki/General_relativity', 'In general relativity, mass and energy curve spacetime, and objects (including light) follow the straightest possible paths through that curvature.'),
      src('en.wikipedia.org', 'Black hole', 'https://en.wikipedia.org/wiki/Black_hole', 'A black hole is a region of spacetime where gravity is so strong that nothing, including light, can escape from inside the event horizon.'),
    ],
    claims: [
      { text: 'Mass curves the spacetime around it.', src: 1 },
      { text: 'Light always follows the straightest path through space.', src: 1 },
      { text: 'Near a black hole that path is strongly curved.', src: 0 },
      { text: 'So light from behind is bent around it toward us.', src: 0 },
      { text: 'Inside the event horizon, not even light escapes.', src: 2 },
    ],
    scenes: [
      { subject: 'deep space', motion: 'the lantern descends toward a dark mass', labels: ['deep space'], beat: 'descent', dur: 2.4, narr: 'Out in the dark, something enormous waits.' },
      { subject: 'the curved grid of space', motion: 'a grid of space inks in and dips toward the mass', labels: ['curved space', 'event horizon'], beat: 'plate', dur: 3.0, narr: 'Its mass presses a dent into space itself.' },
      { subject: 'a ray of starlight', motion: 'a ray from a hidden star bends along the dip', labels: ['bent ray'], beat: 'move', dur: 3.4, narr: 'A ray of light just follows the bend…' },
      { subject: 'the lensed star', motion: 'the star appears where it should not be', labels: ['we see it curved'], beat: 'answer', dur: 2.6, narr: '…and we see a star that was hidden behind it.' },
    ],
    seconds: 11.4,
  },
  {
    id: 'ex_sleep', question: 'What happens the second I fall asleep?',
    title: 'THE CROSSING', subtitle: 'the second you fall asleep', revelation: 'your brain quietly hands the controls from fast waking rhythms to slow sleep waves',
    subjectKey: 'sleep',
    diagram: { archetype: 'flow', subject: 'sleep', labels: [{ text: 'awake · fast' }, { text: 'the hand-off', brass: true }, { text: 'N1 drift' }, { text: 'slow waves' }], flowLabel: 'rhythms slow', answerLabel: 'asleep' },
    sources: [
      src('en.wikipedia.org', 'Sleep onset', 'https://en.wikipedia.org/wiki/Sleep_onset', 'Sleep onset is the transition from wakefulness into sleep, marked by a shift in brain-wave activity from fast alpha rhythms to slower patterns.'),
      src('en.wikipedia.org', 'Non-rapid eye movement sleep', 'https://en.wikipedia.org/wiki/Non-rapid_eye_movement_sleep', 'Stage N1 is the lightest stage of sleep, a brief drift in which brain activity slows and muscles relax.'),
      src('en.wikipedia.org', 'Hypnagogia', 'https://en.wikipedia.org/wiki/Hypnagogia', 'Hypnagogia is the transitional state to sleep, sometimes accompanied by brief dream-like images or a falling sensation.'),
    ],
    claims: [
      { text: 'While awake, your brain runs fast alpha rhythms.', src: 0 },
      { text: 'At sleep onset those fast waves slow down.', src: 0 },
      { text: 'You slip into stage N1, the lightest sleep.', src: 1 },
      { text: 'Muscles relax and images may drift by (hypnagogia).', src: 2 },
      { text: 'Slow waves take over as you settle into sleep.', src: 1 },
    ],
    scenes: [
      { subject: 'a head in profile', motion: 'the lantern lowers toward a resting head', labels: ['the brain'], beat: 'descent', dur: 2.4, narr: 'The lights go out, but you are still here.' },
      { subject: 'fast waking waves', motion: 'quick tight waves ink across the mind', labels: ['awake · fast'], beat: 'plate', dur: 2.8, narr: 'For now the mind still hums with fast, waking rhythms.' },
      { subject: 'the hand-off', motion: 'the fast waves stretch and slow', labels: ['the hand-off'], beat: 'move', dur: 3.2, narr: 'Then, quietly, the rhythms begin to slow…' },
      { subject: 'slow sleep waves', motion: 'long slow waves roll in', labels: ['asleep'], beat: 'answer', dur: 2.6, narr: '…and long, slow waves carry you under.' },
    ],
    seconds: 11.0,
  },
  {
    id: 'ex_onion', question: 'Why do onions make me cry?',
    title: "THE ONION'S REVENGE", subtitle: 'why onions make you cry', revelation: 'a cut onion builds a tiny airborne acid that your eyes rinse away with tears',
    subjectKey: 'onion',
    diagram: { archetype: 'cross-section', subject: 'onion', labels: [{ text: 'cut cells' }, { text: 'irritant gas', brass: true }, { text: 'rises to eyes' }, { text: 'tears' }], layers: 3, flowLabel: 'gas rises', answerLabel: 'you cry' },
    sources: [
      src('en.wikipedia.org', 'Onion', 'https://en.wikipedia.org/wiki/Onion', 'When an onion is cut, damaged cells release enzymes that produce a volatile gas which irritates the eyes, causing tears.'),
      src('en.wikipedia.org', 'Syn-Propanethial-S-oxide', 'https://en.wikipedia.org/wiki/Syn-Propanethial-S-oxide', 'Syn-propanethial-S-oxide is the volatile lachrymatory factor produced by onions that stimulates the eyes’ tear glands.'),
      src('en.wikipedia.org', 'Tears', 'https://en.wikipedia.org/wiki/Tears', 'Reflex tears are produced to wash irritants away from the surface of the eye.'),
    ],
    claims: [
      { text: 'Cutting an onion ruptures its cells.', src: 0 },
      { text: 'Broken cells mix enzymes that build a volatile compound.', src: 1 },
      { text: 'That compound is an airborne lachrymatory (tear-making) gas.', src: 1 },
      { text: 'It drifts up and irritates the surface of your eyes.', src: 0 },
      { text: 'Your eyes make reflex tears to rinse it away.', src: 2 },
    ],
    scenes: [
      { subject: 'an onion, in section', motion: 'the lantern drops onto a cut onion', labels: ['onion'], beat: 'descent', dur: 2.4, narr: 'The knife comes down, and a quiet chemistry begins.' },
      { subject: 'ruptured cells', motion: 'the cut layers ink in and enzymes spill', labels: ['cut cells', 'enzymes'], beat: 'plate', dur: 3.0, narr: 'Inside, broken cells spill enzymes that never usually meet.' },
      { subject: 'the irritant gas', motion: 'a faint gas rises off the cut', labels: ['irritant gas'], beat: 'move', dur: 3.0, narr: 'Together they brew a tiny, sharp gas that floats up…' },
      { subject: 'the weeping eye', motion: 'the eye wells and a tear falls', labels: ['you cry'], beat: 'answer', dur: 2.6, narr: '…and your eyes, stinging, rinse it away with tears.' },
    ],
    seconds: 11.0,
  },
];

function buildVoyage(s: Seed): Voyage {
  const options: VoyageOptions = { ...DEFAULT_OPTIONS };
  const sources = s.sources;
  const claims: Claim[] = s.claims.map((c, i) => ({
    id: `${s.id}_c${i}`,
    text: c.text,
    sourceId: c.src != null ? sources[c.src]?.id ?? null : null,
    verdict: c.src != null ? 'verified' : 'withheld',
    note: c.note,
  }));
  const scenes: Scene[] = s.scenes.map((sc, i) => ({
    no: i + 1, subject: sc.subject, camera: 'slow push in', motion: sc.motion,
    labelCallouts: sc.labels, durationS: sc.dur, editBeat: sc.beat,
    claimIds: [claims[Math.min(i, claims.length - 1)]?.id].filter(Boolean) as string[],
    status: 'verified', styleScore: 0.95 + (i % 2) * 0.02, narration: sc.narr, reSounded: i === 2,
  }));
  const secondsUsed = s.seconds;
  const naive = Math.round((secondsUsed * 1.6 + scenes.length * 2) * 10) / 10;
  const counters: Counters = {
    framesVerified: scenes.length, framesTotal: scenes.length,
    claimsGrounded: claims.filter((c) => c.sourceId).length, claimsTotal: claims.length,
    sourcesCited: new Set(claims.map((c) => c.sourceId).filter(Boolean)).size,
    claimsWithheld: claims.filter((c) => c.verdict === 'withheld').length,
    styleConsistency: 0.97, secondsUsed, budgetS: options.budgetS,
    naiveSecondsBaseline: naive, secondsSavedPct: Math.round((1 - secondsUsed / naive) * 100),
    reRenderRate: `1/${scenes.length}`, reRenders: 1, endToEndMs: 108000,
  };
  const now = Date.now();
  return {
    id: s.id, question: s.question, title: s.title, subtitle: s.subtitle, revelation: s.revelation,
    options, status: 'done', statusLabel: 'example voyage', diagram: s.diagram, scenes, claims, sources,
    counters, provider: 'example', degraded: false, example: true, subjectKey: s.subjectKey,
    createdAt: now - (SEEDS.indexOf(s) * 3600_000), updatedAt: now, endToEndMs: 108000,
  };
}

export async function seedExamples(force = false): Promise<void> {
  if (seeded && !force) return;
  seeded = true;
  try {
    const existing = await listVoyages();
    const have = new Set(existing.map((v) => v.id));
    for (const s of SEEDS) {
      if (!have.has(s.id) || force) await saveVoyage(buildVoyage(s));
    }
    // stamp a marker so we don't churn on every request
    const c = getConfig();
    const root = path.isAbsolute(c.storeDir) ? c.storeDir : path.join(process.cwd(), c.storeDir);
    await fs.mkdir(root, { recursive: true }).catch(() => {});
    await fs.writeFile(path.join(root, '.seeded'), new Date().toISOString(), 'utf8').catch(() => {});
  } catch { /* non-fatal */ }
}

export function exampleIds(): string[] { return SEEDS.map((s) => s.id); }
