# Development

Run the tests, add a model, build these docs.

=== "⚡ Quick (~2 min)"

    ## Everyday commands

    ```sh
    npm run dev                    # dev server, http://localhost:5173
    npm run test                   # Vitest, once
    npm run lint --prefix app      # ESLint
    npm run typecheck --prefix app # TypeScript, no output
    npm run build                  # production bundle → app/dist/
    ```

    Docs preview: `pip install "mkdocs<2" mkdocs-material mkdocs-minify-plugin`, then
    `mkdocs serve`. Every push to `main` that touches `docs/` republishes this site.

=== "📚 Deep Dive (full)"

    --8<-- "_tiers/development.deep.md"
