# eval

Scores how well each vision model turns sketches into diagram elements, using the app's
real adapters and prompt. Full description: the **Evaluate the prompt** section of
[docs/_tiers/development.deep.md](../docs/_tiers/development.deep.md).

```sh
npm run eval:check                                  # no API calls: cases + scorer tests
npm run eval -- --models claude,gemini --repeat 3   # paid API calls; keys from env or .env
npm run eval -- --rescore eval/results/<run>        # rescore saved answers
npm run eval:generate                               # redraw eval/cases/ from cases.mjs
```

| File | Role |
|---|---|
| `cases.mjs` | The synthetic sketches, drawn in code with their ground truth |
| `cases/` | Rendered `<id>.png` + `<id>.json`; hand-labelled photos can go here too |
| `run.mjs` | Calls the models, saves answers to `results/` (git-ignored), writes the report |
| `score.mjs` | Matching and metrics; pure, unit-tested in `test/` |
| `lib/` | Stroke rasteriser and PNG encoder, stroke font, scene builder, TypeScript loader |
