# Fathom — *see how anything works*

> **Some things you can't be told. You have to be shown.**

Ask how anything works — *"how does noise-cancelling work?", "why is the sky blue but sunsets red?", "what happens the second I fall asleep?"* — and a whole expedition dives in: it **writes** the voyage, **charts** every scene, **grounds** every claim in real sources, **inks** a hand-drawn cutaway plate, **films** it as a living cross-section that actually *moves*, **checks** every frame against the sources so it's *true*, and **cuts** it into a ~60-second short that finally makes you *see* it — with the sources cited right on the frame.

Fathom is an autonomous, self-checking **AI showrunner**. Its headline is the one axis no other showrunner contests: **is it true?** — a `qwen3-vl` frame-level truth critic plus on-screen citations, which would rather say *"I don't know"* than draw you a lie.

---

## The one mechanic

**Type the one thing you always wanted to understand, press one button, and ~a minute later watch a beautiful hand-inked cutaway voyage of it — a descent, the mechanism moving in front of you until it clicks, and the real sources cited on the frame.**

There is no canned answer: the viewer supplies the live question, and the voyage — script, grounding, plate, moving scenes, audit and cited edit — is generated *for that exact question, at run time*.

## The screens

`/` **The Surface** (ask) → `/sounding/[id]` **The Sounding** (watch the pipeline work, streamed) → `/voyage/[id]` **The Voyage** (the ~60s cutaway short: descent → cutaway → *it moves* → recap → sources) → `/grounding/[id]` **The Grounding** (claim → source → verdict) · `/chart-room/[id]` **The Chart Room** (direct it) · `/logbook` **The Logbook** (the shelf of plates) · `/send/[id]` **The Send** · `/edges` **Honest edges**.

---

## Architecture

Fathom is a single **Next.js 15 / React 19** app (App Router, TypeScript). One codebase serves the UI, the streaming orchestrator, the persistence, and the MCP tool surface.

```
repo/
├── src/
│   ├── app/                     # routes: the 9 screens + the API
│   │   ├── page.tsx             # 01 · The Surface (ask)
│   │   ├── sounding/[id]/       # 02 · The Sounding (SSE-streamed pipeline)
│   │   ├── voyage/[id]/         # 03/04 · The Voyage player (first breath · it moves)
│   │   ├── grounding/[id]/      # 05 · claim → source → verdict
│   │   ├── chart-room/          # 06 · the control room (+ /[id])
│   │   ├── logbook/             # 07 · the shelf of plates
│   │   ├── send/[id]/           # 08 · the share peak
│   │   ├── edges/               # 09 · what we won't fake
│   │   └── api/
│   │       ├── voyage/          # POST create · GET · /stream (SSE) · /resound
│   │       ├── logbook/  health/
│   │       └── mcp/             # the MCP server (JSON-RPC 2.0 over Streamable HTTP)
│   ├── lib/
│   │   ├── art/                 # the procedural engraving library (chart.ts + plate.ts)
│   │   ├── provider/            # the LLM seam (llm.ts) + Qwen media (qwenMedia.ts)
│   │   ├── pipeline/            # the crew: tools.ts, grounding.ts, orchestrator.ts, bus.ts, service.ts, types.ts
│   │   ├── config.ts            # the env seam (nothing hardcoded)
│   │   ├── store.ts             # the Logbook (filesystem default; Alibaba OSS seam)
│   │   └── seed.ts              # the pre-seeded example voyages
│   └── components/              # TopBar, VoyagePlayer, ChartRoom, VoyageNav, art wrappers
├── skill/                       # the custom Qwen Skill (SKILL.md + scripts/)
└── public/                      # PWA manifest, service worker, icons
```

### The pipeline (the Navigator's tool loop)

One button → the orchestrator runs the whole short-video pipeline itself and **streams every stage** to the Sounding view over SSE (`the pipeline is the interface`):

1. **`plot_voyage`** — the Navigator (`qwen3.7-max`) reads the question, decides the one revelation and the arc, writes the claims and picks a diagram archetype.
2. **`ground_claims`** — real, **keyless** retrieval (Wikipedia REST) of the facts + the source URLs each claim must respect. Layered with Qwen `web_search` when a key is present.
3. **`chart_scene`** — the Cartographer (`qwen3.7-plus`) emits the typed shot list + the one seed-locked cutaway diagram, and grounds each claim to a retrieved source (or **withholds** it).
4. **`engrave_plate`** — the seed-locked cutaway plate. **Procedural hand-authored vector** by default (the signature hand-inked look; `src/lib/art`), rasterised via `wan2.6-t2i` when a Qwen key exists.
5. **`sound_scene`** — the Sounding: each scene filmed by `wan2.7-r2v` reference-to-video with the plate as the reference image, so the mechanism moves while keeping the inked look. *(Honest degrade — see below.)*
6. **`assay_frame`** — the Assayer (`qwen3-vl-plus`, or the vision fallback) audits each frame for **truth** (vs the grounded claim) and **style** (vs the plate), re-renders only the shot it rejects, and **withholds** what it cannot back.
7. **`cut_short`** — the deterministic Cutter assembles the cited edit and computes every live number.

Every on-screen counter (frames verified/withheld, sources cited, seconds used vs a naive baseline, style-consistency, re-render rate, end-to-end) is **computed from what actually happened** — never canned.

### The provider seam

Nothing is hardcoded. `src/lib/config.ts` reads the environment and picks a provider:

- **Qwen Cloud** (`DASHSCOPE_API_KEY`, base `https://dashscope-intl.aliyuncs.com`) — the production engine (chat / vision / image / video / tts), OpenAI-compatible for text+vision.
- **Anthropic** (`ANTHROPIC_API_KEY`) — a dev fallback so the whole orchestration (script, grounding, structured shot list, vision audit) runs end-to-end **without** a Qwen key.
- **Neither** — the app still serves the pre-seeded example voyages and honestly reports that an engine is needed.

**Honest degrade:** the one thing that genuinely needs Qwen video-gen is the *moving video*. Without `DASHSCOPE_API_KEY`, each scene is the **procedural inked plate animated in the player** — a clearly-labelled "still preview" — and the real `wan2.7-r2v` path activates the moment the key exists, with no code change. Narration falls back to the browser Speech API; the Qwen `cosyvoice`/`qwen-tts` path activates with the key.

### Persistence — the Logbook

Fathom owns its record: question, shot list, claims, source URLs, verdicts, counters (+ the downloaded media). Default backend is the **filesystem** (`.fathom-store/` JSON + media served from `/public/voyages`), so voyages survive a closed tab and a cold session. An **Alibaba Cloud OSS** object-storage seam (`ALIBABA_OSS_*`) and an external-DB seam (`DATABASE_URL`) activate when configured.

### The MCP + Skill surface

The same six tools are exposed as an **MCP server** (JSON-RPC 2.0 over Streamable HTTP) at **`/api/mcp`**, mountable by any agent, plus a convenience `sound_voyage` tool that runs the whole loop. The `skill/` folder packages it as a reusable **Qwen Skill** (`SKILL.md` + `scripts/`) — a drop-in *"explain-anything-as-a-checked-short"* primitive.

```bash
