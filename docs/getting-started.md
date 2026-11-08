# Getting Started

Clone, install, start the dev server and add one API key.

=== "⚡ Quick (~3 min)"

    ## Run it in four commands

    Needs Node.js 20 or newer.

    ```sh
    git clone https://github.com/fwornle/sketcher.git && cd sketcher
    npm install
    npm install --prefix app
    npm run dev
    ```

    Open <http://localhost:5173>.

    ![Sketcher home page](images/ui-home.png){ .screenshot }

    The amber hint next to **Vision model** means no key is set yet. Click the gear icon,
    open **API Keys**, paste a [Gemini key](vision-models.md#get-an-api-key), and
    **Save Changes**. The hint turns green: you are ready to
    [convert a sketch](sketch-to-diagram.md).

=== "📚 Deep Dive (full)"

    --8<-- "_tiers/getting-started.deep.md"
