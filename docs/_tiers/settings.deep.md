## Settings

### General tab

![Settings, General tab](images/ui-settings-general.png){ .screenshot }

| Setting | Values | Effect |
|---|---|---|
| **Theme** | Light, Dark, System | *System* follows the operating system and switches live when it changes |
| **Vision model** | any model in the list | The model preselected on the home page |
| **Export format** | drawio, SVG, PNG | Stored as a preference; the download button writes `.drawio` today |

### API Keys tab

![Settings, API Keys tab](images/ui-settings-api-keys.png){ .screenshot }

One field per model. The eye icon shows the key in clear text. Fields for models that are
not yet supported are there so the key is ready once their adapter exists.

### Where settings are stored

All settings, including API keys, are saved in this browser's `localStorage` under the key
`sketcher_prefs`. The value is Base64-encoded, which keeps keys out of casual sight but is
**not encryption**: browser extensions and anyone using this browser profile can read
them. Use keys with spending limits, and clear them on shared machines.

To remove everything, open the browser's developer tools and run:

```js
localStorage.removeItem('sketcher_prefs')
```

## Logging

![Logging configuration](images/ui-logging-control.png){ .screenshot }

Sketcher writes coloured, categorised log lines to the browser console. The logging dialog
decides which of them appear.

**Levels**, from least to most verbose: `ERROR`, `WARN`, `INFO`, `DEBUG`, `TRACE`.
Turning on `TRACE` also turns on `DEBUG` and `INFO`; turning on `DEBUG` also turns on
`INFO`. The default is `ERROR` + `WARN` + `INFO`.

**Categories** follow the pipeline:

| Category | Logs |
|---|---|
| `APP` | Start-up and general app events |
| `VLM` | Model requests and raw responses |
| `PARSER` | Turning the model's answer into shapes; skipped elements |
| `DIAGRAM` | draw.io XML generation and the embedded viewer |
| `STORE` | Redux state changes |
| `UI` | Clicks, uploads, dialogs |
| `THEME` | Theme switches |
| `STORAGE` | Reading and writing `localStorage` |

The selection is saved in `localStorage` and survives reloads.

!!! tip "Debugging a bad diagram"
    Enable `DEBUG` for `VLM` and `PARSER`, then analyse the photo again. The console shows
    the model's exact answer and every element the parser skipped, and why.

## Other parts of the window

- **Sidebar menu**: move the mouse to the left edge of the window to open it; it holds
  the same pages as the top bar (Home, About).
- **Status bar**: shows what the app is doing (*Ready*, *Analyzing sketch…*,
  *Diagram extracted (7 shapes)*), the environment, the time and the app version.
