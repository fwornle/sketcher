## Turn on detailed logs first

Most problems are easier to see in the browser console. Open the
[Logging tab](settings.md#logging) in Settings (gear icon), enable `DEBUG` for `VLM`, `PARSER`
and `DIAGRAM`, open the developer tools (F12, or Cmd+Option+I on macOS) and repeat the action.

## API key problems

**Amber hint *No API key set — add one in Settings*.** The selected model has no key.
Each model has its own field; a Gemini key does not work for Claude.

**Authentication error.** Check for stray spaces when pasting, and that the key is active
in the provider's console. Anthropic and OpenAI keys also need billing set up before they
work.

**Key disappeared.** Keys live in this browser's `localStorage`. A private window, another
browser or clearing site data starts empty.

## Network problems

**Failed to fetch.** The request never reached the provider. Typical causes: offline, a
company proxy or VPN that blocks `generativelanguage.googleapis.com`,
`api.anthropic.com` or `api.openai.com`, or a browser extension blocking the call. The
network tab in the developer tools shows which request failed.

**Diagram preview never loads.** The preview is an iframe from `embed.diagrams.net`. If
that host is blocked, the analysis still succeeds: the result panel shows the shape count
and **Download .drawio** works. Open the file in draw.io desktop.

## Result quality problems

**Shapes missing.** The model did not see them. Thin or faint strokes, glare and shapes
touching the photo's edge are the usual reasons. Retake the photo, or try another model:
they differ in what they pick up.

**Shapes in the wrong place or size.** Perspective distorts positions; photograph the
board straight on and crop to the drawing.

**Warnings under *Diagram extracted*.** The parser skipped elements it could not map,
typically an `other_shape` type. Open **Raw JSON** to see what the model returned.

**Empty result with *Dummy response*.** A *not yet supported* model is selected. Pick
Gemini, Claude or OpenAI GPT-6 Astra.

## Development problems

**`npm run dev` fails with an engine or syntax error.** Vite 7 needs Node.js 20.19 or
newer: `node --version`.

**`mkdocs build --strict` fails on an include.** A `--8<--` line names a file that does not
exist under `docs/_tiers/`; the snippet extension is set to fail instead of publishing an
empty tab.
