## Requirements

- **Node.js 20 or newer** (Vite 7 needs 20.19+). Check with `node --version`.
- **An API key** for at least one supported model: Google Gemini, Anthropic Claude or
  OpenAI GPT. See [Vision Models & API Keys](vision-models.md).
- **Internet access** from the browser: the model APIs and the draw.io preview
  (`embed.diagrams.net`) are called directly from the page.

## Install

The repository has two `package.json` files. The root one holds task tooling and forwards
the app scripts; the app itself lives in `app/`.

```sh
git clone https://github.com/fwornle/sketcher.git
cd sketcher
npm install                # root: task-master tooling
npm install --prefix app   # the React app
```

## Start the app

```sh
npm run dev
```

Vite serves the app at <http://localhost:5173> and reloads on every change.

| Script (run from the repo root) | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build the production bundle into `app/dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run test` | Run the Vitest suite once |

## Add an API key

1. Click the **gear icon** in the top bar.
2. Open the **API Keys** tab.
3. Paste the key into the field for your model. The eye icon shows what you typed.
4. Click **Save Changes**.

![Settings, API Keys tab](images/ui-settings-api-keys.png){ .screenshot }

Keys stay in this browser's `localStorage` and go only to the model provider you
selected. They are obfuscated, not encrypted: anyone with access to this browser
profile can read them. See [Settings & Logging](settings.md#where-settings-are-stored).

## Check it works

Back on the home page, the hint next to **Vision model** reads **API key configured**.
Drop any whiteboard photo on the upload area; [Sketch to Diagram](sketch-to-diagram.md)
explains what you see next.
