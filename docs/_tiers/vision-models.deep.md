## How a model is used

Every supported model gets the same job: look at the photo and answer with one JSON
object describing every shape and text block. Sketcher sends the request **directly from
your browser** to the provider. There is no Sketcher backend, so nothing passes through
a third server.

| Model in the list | API model | Notes |
|---|---|---|
| Google Gemini 4 Argon | `gemini-4-argon` | REST call; thought parts are skipped, answers cached per image (see below) |
| Anthropic Claude Fable 5.1 | `claude-fable-5-1` | Anthropic SDK 1.x (API version `2026-10-21`), up to 16000 output tokens (thinking is always on and shares that budget), server-side fallback on refusal |
| OpenAI GPT-6 Astra | `gpt-6-astra` | OpenAI SDK (chat completions), up to 16000 completion tokens including reasoning |

Each is its provider's most capable publicly available model, and all three reason before
answering, so expect an analysis to take tens of seconds. The model IDs are set in `app/src/services/vlmService.ts`.

## Get an API key

### Google Gemini

1. Open [Google AI Studio → API keys](https://aistudio.google.com/apikey) and sign in.
2. **Create API key**, copy it.
3. Paste it under **Settings → API Keys → Google Gemini 4 Argon API Key**.

Gemini has a free tier, which makes it the cheapest way to try Sketcher.

### Anthropic Claude Fable 5.1

1. Open the [Anthropic Console](https://console.anthropic.com/) → **API Keys**.
2. Create a key, copy it.
3. Paste it under **Anthropic Claude Fable 5.1 API Key**.

### OpenAI GPT-6 Astra

1. Open [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
2. Create a secret key, copy it.
3. Paste it under **OpenAI GPT-6 Astra API Key**.

## The answer format

The prompt asks for three top-level fields:

```json
{
  "analysis_summary": {
    "total_distinct_elements": 7,
    "composition_interpretation": "A simple house with a trapezoid roof, …"
  },
  "elements": [
    {
      "id": 2,
      "type": "trapezoid",
      "bounding_box": { "x1": 220, "y1": 220, "x2": 680, "y2": 360 },
      "style_info": { "line_style": "solid", "color": "red", "fill": "none" },
      "text_content": null,
      "relationships": [{ "related_element_id": 1, "relation_type": "above" }]
    }
  ],
  "plausibility_check_notes": "The roof's bottom edge sits on the body's top edge."
}
```

Coordinates are pixels in the uploaded image, origin top-left. The prompt pushes the model
to cross-check its own boxes ("if A is above B, A's `y2` must be below B's `y1`") and to
report that check in `plausibility_check_notes`.

Models sometimes wrap the JSON in Markdown fences or add `//` comments. The Gemini adapter
strips both before parsing and falls back to the first `{…}` block if the text is still not
valid JSON; the Claude and OpenAI adapters take the outermost `{…}` block of the answer.
The parsed object is then [validated](analysis-pipeline.md#3-validate-and-parse). If it is
malformed but still holds usable elements, those are kept and the rest is reported as a
warning.

## Retries and errors

**Gemini** retries a request up to **3 times**, with exponential back-off, when the API
answers HTTP 5xx. Other errors end the attempt at once and are shown as:

| Gemini error | Shown as |
|---|---|
| HTTP 401 / 403 | *Authentication failed. Please check your Gemini API key.* |
| HTTP 429 | *Gemini API rate limit exceeded. Please wait and try again later.* |
| HTTP 402 or a quota message | *Gemini API quota exceeded. Please check your usage or billing.* |
| Network failure (offline, blocked) | *Failed to fetch* |

**Claude and OpenAI** show the error message of the provider's SDK as is (for example
*401 invalid x-api-key*) and do not retry. Claude also reports *Claude response was cut
off* when the answer hits the output limit.

### Refusals and the Claude fallback

Claude Fable 5.1's safety classifiers occasionally decline a request. Sketcher opts into
Anthropic's **server-side fallback** (`fallbacks: "default"`, beta
`server-side-fallback-2026-07-01`): when Fable declines, the API re-runs the same request
on the model Anthropic recommends for that refusal category (Claude Opus 5 or Opus 4.8),
inside the same call. The fallback answer is used like any other; the `VLM` log category
records *claude-fable-5-1 declined; … continued*. Only if the fallback model declines as
well does the app show *Claude declined to analyze this image.*

## Caching (Gemini)

Gemini answers are cached in memory, keyed by a SHA-256 hash of the image. The cache keeps
the 50 most recently used images and lives until you reload the page. Claude and OpenAI
are called every time.

## Models listed but not supported

Qwen2.5-VL, Florence-2, CogVLM (Ollama) and LLaVA appear in the list marked
*(not yet supported)*. Choosing one routes the request to a placeholder adapter that
returns an empty result after half a second. Adding a model means writing one adapter
class that implements `VLMService.analyzeImage()` and registering it in
`getVlmAdapter()`; see [Development](development.md#add-a-vision-model).
