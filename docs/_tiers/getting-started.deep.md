## Requirements

- **Node.js 20.19 or newer.** Check with `node --version`.
- **The GitHub CLI (`gh`)**, logged in once with `gh auth login`. It downloads releases
  for install and update. Without it, download the tarball by hand (see below).
- **An API key** for at least one supported model: Google Gemini, Anthropic Claude or
  OpenAI GPT. See [Vision Models & API Keys](vision-models.md).
- **Internet access** from the browser: the model APIs and the draw.io preview
  (`embed.diagrams.net`) are called directly from the page.

## Install

Sketcher ships as a release tarball, `sketcher-<version>.tgz`, installed globally with npm.
It holds the built web app and the `sketcher` command, and has no dependencies, so the
install needs no npm registry access and runs no install scripts.

```sh
gh release download --repo fwornle/sketcher --pattern 'sketcher-*.tgz'
npm install -g ./sketcher-*.tgz
sketcher doctor
```

Without `gh`, download `sketcher-<version>.tgz` from the
[latest release](https://github.com/fwornle/sketcher/releases/latest) and run the same
`npm install -g` on it.

`sketcher doctor` checks Node, the installed web app, the data directory, the port, `gh`
and whether a newer release exists. Problems are marked with ✗.

## Start and stop

```sh
sketcher          # start in the background (if needed) and open the browser
sketcher status   # running? on which port, which version
sketcher stop
```

The server listens on `127.0.0.1` only, at <http://localhost:5180> by default. Its process
id and port are kept in `~/.sketcher/server.json`, its log in `~/.sketcher/server.log`.
Starting again while it runs just reopens the browser.

!!! note "Settings belong to the address"
    API keys and preferences live in the browser's `localStorage`, which is separate for
    every address. The installed app (port 5180) and the dev server (port 5173) therefore
    keep separate settings, and so does `sketcher --port <n>`. Stay on one port to keep
    your keys.

## Update

```sh
sketcher update --check   # only say whether a newer release exists
sketcher update           # download it with gh and npm install -g it
```

A running server is stopped before the install and started again on the same port with
the new version. Your settings stay in the browser and are not touched.

## Uninstall

```sh
sketcher uninstall        # stops the server, deletes ~/.sketcher (asks first; --yes skips)
npm rm -g sketcher
```

API keys stay in the browser until you clear them in the app or the browser.

## Commands

| Command | What it does |
|---|---|
| `sketcher` / `sketcher start` | Start the server in the background if needed, open the browser |
| `sketcher stop` | Stop the background server |
| `sketcher status` | Show the server's pid, URL and version, and the installed version |
| `sketcher doctor` | Check the setup; problems are marked with ✗ |
| `sketcher update [--check]` | Install the latest release, or only check for one |
| `sketcher uninstall [--yes]` | Stop the server and delete `~/.sketcher` |
| `sketcher serve` | Run the server in the foreground (what `start` runs in the background) |
| `--port <n>` | Use another port (default 5180) |
| `--no-open` | Start without opening the browser |

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

## Develop

To change Sketcher itself, run it from source. The repository has two `package.json`
files: the root one holds task tooling and forwards the app scripts; the app lives in
`app/`, the `sketcher` command in `cli/`.

```sh
git clone https://github.com/fwornle/sketcher.git
cd sketcher
npm install                # root: task-master tooling
npm install --prefix app   # the React app
npm run dev
```

Vite serves the app at <http://localhost:5173> and reloads on every change.

| Script (run from the repo root) | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build the production bundle into `app/dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run test` | Run the Vitest suite once |
| `npm run release:pack` | Build the app and pack it with the CLI into `release/sketcher-<version>.tgz` |

A release is published by pushing a tag `v<x.y.z>`: the `release` workflow sets that
version in `app/` and `cli/`, runs the tests, packs the tarball and attaches it to a new
GitHub release.
