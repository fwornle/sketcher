# Sketcher

[![docs](https://github.com/fwornle/sketcher/actions/workflows/docs.yml/badge.svg)](https://github.com/fwornle/sketcher/actions/workflows/docs.yml)

📖 **Documentation: <https://fwornle.github.io/sketcher/>**: getting started, sketch-to-diagram walkthrough, vision models and API keys, architecture.

A React application that uses Vision-Language Models (VLM/LLM) to analyze whiteboard images and extract structured diagram data.

## Quick Start

Install the `sketcher` command from the latest release (needs Node.js 20.19+ and the
GitHub CLI, logged in with `gh auth login`):

```bash
gh release download --repo fwornle/sketcher --pattern 'sketcher-*.tgz'
npm install -g ./sketcher-*.tgz
sketcher doctor   # check the setup
sketcher          # start in the background and open http://localhost:5180
```

`sketcher stop`, `sketcher status`, `sketcher update` and `sketcher uninstall` do what
they say; see [Getting Started](https://fwornle.github.io/sketcher/getting-started/) for
details.

## Develop

To work on the app itself, run it from source:

```bash
npm install
npm install --prefix app
npm run dev        # Vite dev server at http://localhost:5173
```

API keys live in the browser per address, so the dev server (5173) and the installed app
(5180) keep separate settings.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build the app for production |
| `npm run preview` | Preview the production build |
| `npm run test` | Run tests |
| `npm run release:pack` | Build the app and pack it with the CLI into `release/sketcher-<version>.tgz` |
| `npm run tasks:list` | List task-master tasks |
| `npm run tasks:generate` | Generate task files |
| `npm run tasks:parse-prd` | Parse PRD documents |

Releases: push a tag `v<x.y.z>`; the `release` workflow packs the tarball and publishes it
as a GitHub release asset, which `sketcher update` installs.

## Project Structure

The app follows the [ui-template](https://github.com/fwornle/ui-template) layout and its MVI pattern
(Model = slice state, View = components, Intent = actions/thunks):

```
app/src/
├── components/
│   ├── Layout.tsx          # App shell: TopBar + SidebarMenu + <Outlet/> + BottomBar
│   ├── layout/             # TopBar, BottomBar, SidebarMenu (hover left edge), AppLogo
│   ├── settings/           # SettingsModal (theme, vision model, export format, API keys)
│   └── ui/                 # LoggingControl (log levels / categories)
├── features/sketch/        # Sketch-to-diagram feature (MVI)
│   ├── sketchSlice.ts      # Model + intents (analyzeSketch thunk) + selectors (drawio XML)
│   ├── vlmProviders.ts     # Supported VLMs and their API-key fields
│   └── components/         # SketchWorkspace, ImageUpload, VlmSelector, AnalysisResult, DrawioViewer
├── store/                  # Redux store + preferences / sidebar slices
├── hooks/                  # Typed useAppDispatch / useAppSelector
├── context/ThemeProvider   # Applies light / dark / system theme from preferences
├── routes/                 # createBrowserRouter config
├── pages/                  # HomePage, AboutPage
├── services/               # VLM adapters, shape parser, drawio converter, storage
└── utils/logging/          # Categorised console Logger (VLM, PARSER, DIAGRAM, UI, ...)
```

The `sketcher` command lives in `cli/` (`bin/sketcher.mjs`, with the static server, state
and release helpers in `lib/`); `scripts/pack-release.mjs` copies the built app into it
and packs the release tarball.

## Tech Stack

- React 19 + TypeScript
- Vite 7
- Tailwind CSS v4 with shadcn/ui design tokens, lucide-react icons, Headless UI
- Redux Toolkit (MVI) + React Redux
- React Router 7
- Vitest for testing

## VLM/LLM Integration

The app sends uploaded whiteboard images to a vision-language model (Gemini 4 Argon by default; Claude Fable 5.1, Claude Opus 5.5 and OpenAI GPT-6 Astra are also supported):

1. User uploads an image
2. Image is sent to the VLM service
3. Model returns structured JSON diagram (shapes, relationships, styles)
4. Results are cached by image hash for performance

### Setup

1. Start the app: `npm run dev`
2. Open Settings (gear icon) → API Keys and enter your Gemini (or Claude / OpenAI) API key
3. Upload a whiteboard image to extract diagram data

### Troubleshooting

- **API Key Issues:** Ensure a valid API key for the selected model is set in Settings
- **Debugging:** Use the log icon in the top bar to enable DEBUG/TRACE levels per category
- **Quota/Rate Limits:** Wait and retry, or check API usage
- **Network Errors:** Check internet connection and API endpoint
- **Malformed Responses:** Check prompt version and model output
