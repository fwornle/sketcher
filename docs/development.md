# Development

Run the tests, evaluate the prompt, add a model, build these docs.

=== "⚡ Quick (~2 min)"

    ## Everyday commands

    ```sh
    npm run dev                    # dev server, http://localhost:5173
    npm run test                   # Vitest, once
    npm run lint --prefix app      # ESLint
    npm run typecheck --prefix app # TypeScript, no output
    npm run build                  # production bundle → app/dist/
    npm run eval:check             # eval cases and scorer, no API calls
    npm run eval                   # score every model that has an API key
    ```

    Docs preview: `pip install "mkdocs<2" mkdocs-material mkdocs-minify-plugin`, then
    `mkdocs serve`. Every push to `main` that touches `docs/` republishes this site.

=== "📚 Deep Dive (full)"

    --8<-- "_tiers/development.deep.md"
