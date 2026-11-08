## Before you start

You need an API key for the model you pick. Without one, the hint next to the model list
is amber and the analysis fails with an authentication error. See
[Getting Started](getting-started.md#add-an-api-key).

## Take a photo the model can read

The model only sees pixels. These habits give it the best chance:

- **Straight on.** Stand in front of the board; strong perspective turns rectangles into
  trapezoids.
- **Even light, no glare.** Reflections on a glossy board hide strokes.
- **Dark, thick markers.** Faint or dried-out markers produce missing shapes.
- **Crop to the sketch.** Shapes are placed relative to the image, so empty board around
  the drawing only shrinks it.

## Upload and analyse

Drop the file on the dashed area, or click the area to open a file picker. Sketcher checks
the file first:

| Check | Message if it fails |
|---|---|
| Type is JPG or PNG | *Only JPG and PNG images are supported.* |
| Size is at most 10 MB | *File size must be less than 10MB.* |

A valid file is shown as a preview and sent to the selected model straight away. The
status bar at the bottom says **Analyzing sketch…** while the request runs. Expect a few
seconds to half a minute, depending on the model and image size.

## Read the result

![Analysis result panel](images/ui-analysis-result.png){ .screenshot }

**Composition** is the model's one-line interpretation of the whole sketch, with the
provider that produced it.

**Diagram extracted** counts the shapes and the spatial relationships the parser kept. Three
buttons sit beside it:

| Button | Does |
|---|---|
| **Raw JSON** | Expands the model's full answer: every element with its bounding box, style and text, plus the model's own plausibility notes |
| **Copy** | Copies that JSON to the clipboard |
| **Download .drawio** | Saves the diagram, named after your image (`whiteboard.jpg` → `whiteboard.drawio`) |

If the parser had to skip or repair something, a warning list appears here too. The
diagram is still built from everything that could be read.

## Edit the diagram

The **Diagram Preview** is a full draw.io editor embedded from `embed.diagrams.net`.
Move, resize, restyle or add shapes there, or download the file and continue in
draw.io desktop.

![A real run with Gemini 4 Argon on the sample sketch: the result and the diagram in the embedded draw.io editor](images/ui-sample-sketch-result.png){ .screenshot }

For the sample sketch on the [home page](index.md), the downloaded file opens as:

![The generated diagram opened in draw.io](images/diagram-sample-house.png)

Each shape lands at the same relative position as on the photo, scaled to fit an
850 × 1100 draw.io page. Triangles are drawn last so they stay on top of the shapes they
overlap.

## Analyse another photo

Drop a new photo on the preview to replace it, or click **Reset** to clear everything
first. Gemini remembers its last 50 answers per browser session: dropping the *same*
image again returns the cached result instantly instead of calling the API.
