## Repository layout

```text
sketcher/
├── app/                 # The React app (its own package.json)
├── docs/                # This documentation site (MkDocs Material)
│   ├── _tiers/          # Deep Dive content, included into each page
│   ├── assets/          # Site CSS and JavaScript
│   ├── images/          # Screenshots and rendered diagrams
│   └── puml/            # PlantUML sources of the diagrams
├── overrides/           # MkDocs theme override (header shortcut icons)
├── mkdocs.yml           # Site configuration and navigation
└── .github/workflows/   # docs.yml: build and publish the site
```

## Tests

```sh
npm run test                       # once
npm run test:watch --prefix app    # re-run on change
```

The suite covers the model-independent core in `app/src/services/`:

| File | Tests |
|---|---|
| `vlmService.test.ts` | Response shape, caching and cache eviction, adapter error handling |
| `shapeParser.test.ts` | Element → shape mapping, type aliases, minimum sizes, relationship flattening, incomplete input |
| `drawioConverter.test.ts` | Scaling, styles and dotted lines, arrows as edges, z-order, XML escaping, encoding |

Tests run in `jsdom`; network calls are mocked, so no API key is needed.

## Add a vision model

1. **Write an adapter** in `app/src/services/vlmService.ts` that implements `VLMService`:

    ```ts
    class MyModelAdapter implements VLMService {
      constructor(private apiKey: string) {}
      async analyzeImage(dataUrl: string, apiKey?: string): Promise<VLMServiceResponse> {
        // send the image + getGeminiPrompt() to the API,
        // parse the JSON, run validateStructuredDiagram(), return it
      }
    }
    ```

2. **Register it** in `getVlmAdapter()` under the provider key.
3. **Mark it implemented** in `app/src/features/sketch/vlmProviders.ts`
   (`implemented: true`), with the right `apiKeyField` and `keyHint`.
4. **Add tests** next to the existing ones in `vlmService.test.ts`.

Everything after the adapter (parser, converter, viewer) works unchanged as long as the
adapter returns the standard response shape.

## Documentation

The site is built with [MkDocs Material](https://squidfunk.github.io/mkdocs-material/).

### Preview locally

```sh
python3 -m venv .venv && . .venv/bin/activate
pip install "mkdocs<2" mkdocs-material mkdocs-minify-plugin
mkdocs serve            # http://127.0.0.1:8000, reloads on save
mkdocs build --strict   # what CI runs: warnings fail the build
```

### Page structure

Every page has two tabs: **⚡ Quick** for the essentials and **📚 Deep Dive** for
everything else. The Quick content sits in the page itself; the Deep Dive content is a
partial in `docs/_tiers/<page>.deep.md`, pulled in with a snippet include:

```markdown
=== "⚡ Quick (~3 min)"

    ## Short heading
    The essentials.

=== "📚 Deep Dive (full)"

    ;--8<-- "_tiers/<page>.deep.md"
```

Keep the tab labels identical on every page: `content.tabs.link` uses the label text to
remember the reader's choice across pages. `assets/tabbed-toc.js` hides the right-hand
contents entries of the tab that is not open.

### Diagrams

PlantUML sources live in `docs/puml/` and include `_standard-style.puml`. Render them into
`docs/images/` and commit both:

```sh
plantuml -tpng docs/puml/*.puml -o ../images/
```

### Publishing

`.github/workflows/docs.yml` builds the site with `--strict` on every pull request that
touches the docs, and builds and deploys it to GitHub Pages on every push to `main` that
touches them (a merged pull request is such a push). It can also be started by hand from
the **Actions** tab.
