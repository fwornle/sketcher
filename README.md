# Sketcher

[![docs](https://github.com/fwornle/sketcher/actions/workflows/docs.yml/badge.svg)](https://github.com/fwornle/sketcher/actions/workflows/docs.yml)

📖 **Documentation: <https://fwornle.github.io/sketcher/>**: getting started, sketch-to-diagram walkthrough, vision models and API keys, architecture.

A React application that uses Vision-Language Models (VLM/LLM) to analyze whiteboard images and extract structured diagram data.

## Quick Start

After cloning the repository:

```bash
# Install dependencies
npm install
npm install --prefix app

# Start the development server
npm run dev
```

Open http://localhost:5173 in your browser.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build the app for production |
| `npm run preview` | Preview the production build |
| `npm run test` | Run tests |
| `npm run tasks:list` | List task-master tasks |
| `npm run tasks:generate` | Generate task files |
| `npm run tasks:parse-prd` | Parse PRD documents |

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

## Tech Stack

- React 19 + TypeScript
- Vite 7
- Tailwind CSS v4 with shadcn/ui design tokens, lucide-react icons, Headless UI
- Redux Toolkit (MVI) + React Redux
- React Router 7
- Vitest for testing

## VLM/LLM Integration

The app integrates with Gemini API to analyze uploaded whiteboard images:

1. User uploads an image
2. Image is sent to the VLM service
3. Model returns structured JSON diagram (shapes, relationships, styles)
4. Results are cached by image hash for performance

### Setup

1. Start the app: `npm run dev`
2. Open Settings (gear icon) → API Keys and enter your Gemini (or Claude / GPT-4o) API key
3. Upload a whiteboard image to extract diagram data

### Troubleshooting

- **API Key Issues:** Ensure a valid API key for the selected model is set in Settings
- **Debugging:** Use the log icon in the top bar to enable DEBUG/TRACE levels per category
- **Quota/Rate Limits:** Wait and retry, or check API usage
- **Network Errors:** Check internet connection and API endpoint
- **Malformed Responses:** Check prompt version and model output
