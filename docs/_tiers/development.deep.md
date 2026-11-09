## Repository layout

| Path | Contents |
|---|---|
| `app/` | The React app (its own `package.json`) |
| `cli/` | The installed `sketcher` command |
| `eval/` | Eval set and scoring script for the analysis prompt |
| `docs/` | This documentation site (MkDocs Material) |
| `docs/_tiers/` | Deep Dive content, included into each page |
| `docs/assets/` | Site CSS and JavaScript |
| `docs/images/` | Screenshots and rendered diagrams |
| `docs/puml/` | PlantUML sources of the diagrams |
| `overrides/` | MkDocs theme override (header shortcut icons) |
| `mkdocs.yml` | Site configuration and navigation |
| `.github/workflows/` | `docs.yml` publishes this site, `release.yml` the `sketcher` tarball |

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

## Evaluate the prompt

`eval/` measures how well each model turns sketches into elements, so a prompt or schema
change can be judged on numbers instead of one screenshot. It calls the app's real
adapters and prompt (`app/src/services/vlmService.ts`); nothing is copied.

```sh
npm run eval:check                                   # no API calls: cases and scorer
npm run eval                                         # every model with a key
npm run eval -- --models gemini,claude --repeat 3    # chosen models, 3 runs per case
npm run eval -- --cases house,pine-trees-road        # a subset
npm run eval -- --rescore eval/results/<run>         # rescore saved answers, no API calls
```

Keys are read from the environment or a `.env` in the repository root: `GEMINI_API_KEY`,
`ANTHROPIC_API_KEY` (Fable 5.1 and Opus 5.5) and `OPENAI_API_KEY`. Without `--models`,
every model whose key is set runs, and every answer is a paid API call. The eval needs
Node 22.18 or later for its type stripping.

### The cases

`eval/cases/` holds 15 synthetic sketches, each a PNG plus a ground-truth JSON:

- **Pictures:** a house, pine trees beside a winding road (the case that used to come back
  as rectangles), a stick figure, weather, a car, and mountains with a river.
- **Diagrams:** a flowchart, architecture boxes, a mind map, a bar chart and a state
  machine.
- **Single features:** the eight primitives, a star with a block arrow, arrow directions
  and coloured shapes.

They are drawn in code (`eval/cases.mjs`) with a wobbly pen and hand-printed capitals.
Each builder records the element a perfect answer would contain as it draws, so picture
and ground truth cannot drift apart. `npm run eval:generate` rewrites them, and the output
is deterministic.

To add a real photo:

1. Put `<id>.png` in `eval/cases/`. Keep it to about 1500 px on the long edge, so no model
   resizes it and pixel coordinates stay comparable.
2. Next to it, write an `<id>.json` in the same format as the generated ones:
    - `width` and `height`;
    - `keywords` that the summary should mention;
    - `elements`, each with a `label`, its `type`, the `accept` list of types that count
      as right, and a `bbox` `[x1, y1, x2, y2]` in pixels;
    - where they should be scored: `text`, `points` (`[tail, head]` for arrows) or `color`.

### The score

Each predicted element is matched to at most one expected element by bounding-box overlap
(IoU ≥ 0.3). Both boxes are first padded by 1.5 % of the image diagonal, so thin lines can
overlap at all. The score runs from 0 to 100:

| Part | Weight | Measures |
|---|---|---|
| F1 | 40 % | Elements found (recall) without inventing others (precision) |
| Right type | 30 % | Expected elements found **with** an accepted type; a polygon through a triangle's corners counts, a rectangle does not |
| Text | 10 % | Labels read exactly (case and punctuation ignored) |
| Arrow direction | 10 % | The head is at the drawn end |
| Colour | 5 % | Stroke colour in the same colour family |
| Summary | 5 % | `composition_interpretation` names what the sketch shows |

Parts a case does not test drop out of its weighting, and a failed call scores 0. The
report also:

- **counts box stand-ins:** a rectangle answered for a shape that is not one;
- **flags off-scale answers:** answers whose overall extent differs from the drawing's,
  which is how a model answering in another coordinate space shows up.

Every run writes `eval/results/<time>/`, which git ignores:

- the raw answers, which `--rescore` reuses;
- `scores.json`;
- `report.md`: the model table, a case × model score grid and what each model missed;
- `meta.json`: the commit and a hash of the prompt, so runs from before and after a
  prompt change can be told apart.

## Dependency overrides

`app/package.json` has one npm `overrides` entry: it makes
`@typescript-eslint/typescript-estree` use `minimatch` 11 instead of 10, which clears
advisory [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)
(fixed only in `minimatch` ≥ 11.0.1). `typescript-eslint` 8.72 still declares
`minimatch ^10.2.2`.

**Remove the override** once a `typescript-eslint` release depends on `minimatch` 11 or
later (check with `npm view @typescript-eslint/typescript-estree dependencies.minimatch`).
Left in place after that, it could hold the dependency back.

## Add a vision model

1. **Write an adapter** in `app/src/services/vlmService.ts` that implements `VLMService`:

    ```ts
    class MyModelAdapter implements VLMService {
      private apiKey: string;
      constructor(apiKey: string) {
        this.apiKey = apiKey;
      }
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
5. **Add it to the eval:** map its provider key to its API key variable in `MODEL_KEYS`
   at the top of `eval/run.mjs`.

Keep to erasable TypeScript (`erasableSyntaxOnly` in `tsconfig.app.json`): no parameter
properties, enums or namespaces. The eval imports the adapters with Node's built-in type
stripping, which rejects anything else.

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
