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
