## Sequence

![Analysis sequence](images/sketch-analysis-flow.png)

## 1. Upload

`ImageUpload` accepts a drop or a file picker selection and rejects anything that is not
`image/jpeg` or `image/png`, or is larger than 10 MB. The file is read as a data URL and
`analyzeSketch({ dataUrl, fileName })` is dispatched.

The `pending` handler resets the previous result and shows the preview at once. The thunk
then loads the image to read its natural width and height; the converter needs them later
to scale coordinates.

## 2. Ask the model

The thunk reads the selected model and its key from `preferences`, gets the matching
adapter from `getVlmAdapter()`, and calls `analyzeImage()`.

The prompt asks for one JSON object and spells out the schema: element types, pixel
bounding boxes (`x1, y1, x2, y2`, origin top-left), stroke points, dimensions,
orientation, line style, colour, fill, text and spatial relationships. It is written for
any sketch, not one subject:

- A primitive type is used only when the stroke really is that primitive; nothing is
  approximated by its bounding rectangle.
- Drawn objects are described by their parts (a pine tree as stacked triangles and a
  trunk, a stick figure as a circle and lines).
- Curved and freehand strokes are `polyline`s and irregular closed outlines `polygon`s,
  each with its vertices in `points`; lines and arrows give their start and end there.

The model checks its own output (points inside boxes, "above" meaning a smaller y, the
element count) and writes what it checked into `plausibility_check_notes`. The full prompt
is in `app/src/services/vlmService.ts`.

The same format is also sent as a JSON schema, which each provider enforces (structured
outputs), so the answer is always parseable JSON; see
[Vision Models](vision-models.md#guaranteed-json-structured-outputs).

Gemini answers are cached in memory by a SHA-256 hash of the image (50 entries, least
recently used evicted first).

## 3. Validate and parse

### Validate

`validateStructuredDiagram()` checks the parsed JSON. The answer must be an object with an
`elements` array; without one the analysis fails. Individual elements are repaired rather
than rejected: a missing `type` defaults to `rectangle`, a missing `bounding_box` gets a
default box. A malformed answer that still contains usable elements is kept as a partial
result rather than thrown away.

### Parse

`parseShapesFromVLMResponse()` turns each element into a typed `Shape`:

- **Types are normalised.** `square` becomes `rectangle`, `line_segment` becomes `line`,
  `other_shape` becomes `rectangle`; a `polyline` with fewer than two points becomes a
  `line` and a `polygon` with fewer than three a `rectangle`. Unknown types are skipped
  with a warning.
- **Points are kept** for polylines, polygons, lines and arrows.
- **Boxes become position and size.** Text shapes get a minimum size derived from their
  character count so labels do not wrap into unreadable columns.
- **Styles are mapped.** `line_style`, `color`, `fill` and `line_thickness` become draw.io
  style properties.
- **Relationships are flattened.** Each element's nested `relationships` list becomes
  top-level `ShapeRelationship` records (`left_of` → `left-of`, `points_to` → `connects`,
  `inside` → `contains`, …).

Anything skipped is collected in `errors` and shown as warnings in the result panel.

## 4. Generate draw.io XML

`generateDrawioXml()` in `services/drawioConverter.ts`:

1. Computes one scale factor that fits the original image into an 850 × 1100 page while
   keeping its aspect ratio, inside a 50 px margin.
2. Emits shapes largest first, so smaller ones lie on top, and triangles last, so roofs
   and arrow heads are drawn on top.
3. Maps each type to a draw.io style (`shape=trapezoid;perimeter=trapezoidPerimeter`,
   `shape=rhombus`, `shape=triangle;direction=north`, …) and adds stroke colour, dash
   pattern and fill. Triangles point up through `direction=north`, which keeps their box,
   rather than a rotation, which would squash tall ones.
4. Draws lines, arrows, polylines and polygons as unconnected edges: the first and last
   points are the ends, the others waypoints. Densely sampled polylines are drawn
   `curved=1`; polygons end on their first point.
5. Wraps the cells in an `mxfile` document.

Relationships are passed in but not drawn yet; connectors between shapes are a planned
extension.

`selectEncodedDrawioXml` additionally deflates and Base64-encodes the XML, the format the
draw.io embed expects.

## 5. Show

`DrawioViewer` loads `https://embed.diagrams.net/?embed=1&ui=min` in an iframe, waits for
its `ready` message, then posts the XML. Because draw.io sends `ready` only once per
iframe, `SketchWorkspace` remounts the viewer (`key={encodedXml}`) for every new diagram.
