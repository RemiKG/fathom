---
name: fathom
description: >
  Explain how anything works as a fact-checked, hand-inked cutaway short. Given a "how does X
  work?" question, Fathom writes the voyage, grounds every claim in real sources, inks a seed-locked
  cutaway plate, films the mechanism moving (reference-to-video), audits every frame for truth and
  style (re-rendering or honestly withholding), narrates it, and cuts a cited ~60s short.
  A drop-in "explain-anything-as-a-checked-short" primitive.
license: MIT
---

# Fathom — the autonomous, self-checking explainer studio

Fathom turns one honest question — *"how does noise-cancelling actually work?"* — into a short,
beautiful, **true** cutaway voyage. It runs the whole short-video pipeline itself and, uniquely,
**checks its own work**: every drawn claim is grounded to a real source, and the Assayer withholds
anything it cannot back rather than animate a confident lie.

## The tool loop (six tools, chained in order)

| tool | crew | what it does |
|---|---|---|
| `plot_voyage`  | Navigator (`qwen3.7-max`) | reads the question, decides the one revelation + arc, writes the claims, picks the diagram archetype |
| `ground_claims`| Cartographer grounding    | retrieves the real facts + **source URLs** each claim must respect (Wikipedia REST; Qwen `web_search` when available) |
| `chart_scene`  | Cartographer (`qwen3.7-plus`) | the typed shot list + the one seed-locked cutaway diagram; grounds each claim to a retrieved source or **withholds** it |
| `engrave_plate`| Engraver (`wan2.6-t2i`)   | inks the seed-locked cutaway plate (procedural vector by default; raster via Qwen image when a key exists) |
| `sound_scene`  | Sounding (`wan2.7-r2v`)   | films each scene reference-to-video with the plate as the reference image, so the mechanism moves while keeping the inked look |
| `assay_frame`  | Assayer (`qwen3-vl-plus`) | truth + style audit of each frame; re-renders only the shot it rejects; **withholds** unverifiable claims |
| `cut_short`    | Cutter (deterministic)    | assembles the cited edit and computes every live number |

Plus `sound_voyage(question)` — the convenience tool that runs the entire loop and returns the
finished voyage (title, scenes, grounded+verified claims with source URLs, and every counter).

## How to call it

The same studio is exposed as an **MCP server** (JSON-RPC 2.0 over Streamable HTTP) at `/api/mcp`:

```bash
# list the tools
curl -s $FATHOM_URL/api/mcp -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# run the whole pipeline on your own question
curl -s $FATHOM_URL/api/mcp -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"sound_voyage","arguments":{"question":"how does a black hole bend light?"}}}'
```

Or use the helper in `scripts/`:

```bash
FATHOM_URL=https://your-fathom.example node scripts/sound_voyage.mjs "why is the sky blue but sunsets red?"
```

## What is real (and what is honest)

- **Real:** the live question; the grounded script; the retrieved source URLs; the seed-locked plate;
  the style-locked reference-to-video scenes (when a Qwen video key is present); the frame-level
  truth+style audit with targeted re-render and honest withholding; the narration; the cited edit;
  the persistent Logbook; every on-screen counter.
- **Honest degrade:** without a Qwen video key, scenes are the procedural inked plate animated in the
  player (a labelled "still preview"); the real `wan2.7-r2v` path activates the moment
  `DASHSCOPE_API_KEY` exists — no code change.
- **Not faked:** labels & citations are deterministic post (disclosed); the Assayer is bounded and
  says "I don't know" rather than bluff; the measured numbers are labelled small-N demonstrations.

Set `DASHSCOPE_API_KEY` (a plain `sk-` key on `dashscope-intl`) for the full Qwen Cloud engine.
