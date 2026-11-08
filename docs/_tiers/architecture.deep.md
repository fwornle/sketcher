## Layers

![Sketcher architecture](images/sketcher-architecture.png)

The app follows the [ui-template](https://github.com/fwornle/ui-template) layout and its
Model–View–Intent split:

| Layer | Lives in | Responsibility |
|---|---|---|
| **View** | `components/`, `features/sketch/components/`, `pages/` | Render state, turn user actions into dispatched intents |
| **Intent** | `features/sketch/sketchSlice.ts` (`analyzeSketch` thunk) | The asynchronous work a user action starts |
| **Model** | `sketchSlice`, `store/slices/` | The single source of truth for what is on screen |
| **Services** | `services/` | Model APIs, parsing, XML generation, persistence |

## Source layout

```text
app/src/
├── components/
│   ├── Layout.tsx          # App shell: TopBar + SidebarMenu + <Outlet/> + BottomBar
│   ├── layout/             # TopBar, BottomBar, SidebarMenu, AppLogo
│   ├── settings/           # SettingsModal (theme, vision model, export format, API keys)
│   └── ui/                 # LoggingControl
├── features/sketch/        # The sketch-to-diagram feature
│   ├── sketchSlice.ts      # State + analyzeSketch thunk + selectors (draw.io XML)
│   ├── vlmProviders.ts     # Model list and which API-key field each uses
│   └── components/         # SketchWorkspace, ImageUpload, VlmSelector,
│                           # AnalysisResult, DrawioViewer
├── store/                  # Redux store, preferences and sidebar slices
├── hooks/                  # Typed useAppDispatch / useAppSelector
├── context/ThemeProvider   # Applies light / dark / system theme
├── routes/                 # Router: / (Home), /about
├── pages/                  # HomePage, AboutPage
├── services/               # vlmService, shapeParser, drawioConverter, storage
└── utils/logging/          # Categorised console logger
```

## State

The store has three slices:

| Slice | Holds | Persisted |
|---|---|---|
| `sketch` | Status (`idle` → `analyzing` → `succeeded` / `failed`), the image, the model's raw answer, parsed shapes and relationships, warnings, error | no |
| `preferences` | Theme, selected model, export format, API keys | yes, `localStorage` |
| `sidebar` | Whether the sidebar menu is open | no |

The draw.io XML is **not** stored. `selectDrawioXml` derives it from the shapes and the
image size with a memoised selector, so it is computed once per analysis and never goes
stale.

## Key design decisions

**Browser-only.** Calling the model APIs from the page keeps deployment to a static
bundle, at the cost of the API key living in the browser. The Anthropic and OpenAI SDKs
are created with `dangerouslyAllowBrowser: true` for that reason. Running Sketcher for
other people would need a small proxy that holds the keys.

**One adapter per model.** Every model implements the same `VLMService` interface
(`analyzeImage(dataUrl, apiKey)`) and returns the same response shape. Everything after
the adapter is model-independent.

**Embedded draw.io instead of a custom canvas.** The preview is the real draw.io editor in
an iframe, fed through its embed protocol. Users get full editing for free; the cost is a
dependency on `embed.diagrams.net` being reachable.

## Tech stack

| Concern | Choice |
|---|---|
| UI | React 19, TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS v4, shadcn/ui tokens, lucide-react icons, Headless UI |
| State | Redux Toolkit, React Redux |
| Routing | React Router 7 |
| Tests | Vitest |
| Model SDKs | `@anthropic-ai/sdk`, `openai` (Gemini over plain `fetch`) |
