#!/usr/bin/env node
/* Fathom Skill helper — run the whole pipeline on a question via the MCP server and print the
   finished, fact-checked voyage. Usage:
     FATHOM_URL=https://your-fathom.example node scripts/sound_voyage.mjs "how does X work?"
   Defaults FATHOM_URL to http://localhost:3000. No dependencies (uses global fetch). */

const base = process.env.FATHOM_URL || 'http://localhost:3000';
const question = process.argv.slice(2).join(' ').trim();
if (!question) { console.error('usage: node scripts/sound_voyage.mjs "how does X work?"'); process.exit(1); }

async function call(name, args) {
  const res = await fetch(`${base}/api/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'tools/call', params: { name, arguments: args } }),
  });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const j = await res.json();
  const text = j?.result?.content?.[0]?.text ?? '';
  try { return JSON.parse(text); } catch { return text; }
}

const v = await call('sound_voyage', { question });
if (typeof v === 'string') { console.log(v); process.exit(0); }

console.log(`\n${v.title}\n${'—'.repeat(v.title.length)}`);
console.log(v.subtitle, '\n');
console.log('Scenes:', (v.scenes || []).map((s) => `${s.no}·${s.editBeat}`).join('  '));
console.log('\nClaims:');
for (const c of v.claims || []) {
  const src = (v.sources || []).find((s) => s.id === c.sourceId);
  console.log(`  [${c.verdict}] ${c.text}${src ? `  → ${src.url}` : c.note ? `  (withheld: ${c.note})` : ''}`);
}
const k = v.counters || {};
console.log(`\nLedger: ${k.framesVerified}/${k.framesTotal} frames · ${k.sourcesCited} sources · ${k.claimsWithheld} withheld · style ${k.styleConsistency} · ${k.secondsSavedPct}% under naive · ${Math.round((k.endToEndMs || 0) / 1000)}s`);
console.log(`\nWatch: ${base}/voyage/${v.id}\n`);
