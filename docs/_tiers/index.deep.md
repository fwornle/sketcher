## Why Sketcher

Whiteboard sessions end with a photo nobody edits again. Redrawing the sketch by hand in
draw.io takes longer than the meeting did. Sketcher does the redrawing: it asks a
vision-language model (VLM) for a structured description of every element in the photo,
then generates draw.io shapes at the same relative positions and sizes.

![Sketcher with an analysed sketch, dark theme](images/ui-dark-mode.png){ .screenshot }

## What it recognises

| Element | Becomes in draw.io |
|---|---|
| Rectangle, square | `rectangle` |
| Circle, ellipse | `ellipse` |
| Triangle | `triangle` (drawn on top, so roofs and arrows heads stay visible) |
| Trapezoid, parallelogram, rhombus / diamond | the matching draw.io shape |
| Hexagon, octagon | the matching draw.io shape |
| Arrow, line segment | an edge, with or without an arrow head, from start to end point |
| Polyline: a curved or freehand stroke | an edge through the stroke's points, smoothed when densely sampled |
| Polygon: an irregular closed outline | a closed edge along its corners |
| Text | a text cell with the recognised words |

Drawn objects such as trees, people or houses come out as the parts they are made of: a
pine tree as stacked triangles and a trunk, a stick figure as a circle and lines.

Line colour, line style (solid, dashed, dotted) and fill are carried over when the model
reports them.

## What it does not do (yet)

- **Connectors between shapes.** The model reports relationships ("above", "inside",
  "points to"), and Sketcher parses them, but the draw.io output does not draw them as
  connectors yet. Arrows that are drawn on the board do become edges.
- **SVG or PNG export.** The download button writes `.drawio`. Open that file in draw.io
  to export SVG or PNG.
- **Local models.** Qwen2.5-VL, Florence-2, CogVLM and LLaVA are listed in the model
  picker as *not yet supported*; selecting one returns an empty result.

## Where to go next

| You want to… | Read |
|---|---|
| Install and run it | [Getting Started](getting-started.md) |
| Turn your first photo into a diagram | [Sketch to Diagram](sketch-to-diagram.md) |
| Choose a model, get an API key | [Vision Models & API Keys](vision-models.md) |
| Understand the code | [Architecture](architecture.md), [Analysis Pipeline](analysis-pipeline.md) |
| Fix a problem | [Troubleshooting](troubleshooting.md) |
