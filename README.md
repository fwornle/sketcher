# Sketcher

A React application that uses Vision-Language Models (VLM/LLM) to analyze whiteboard images and extract structured diagram data.

## Quick Start

After cloning the repository:

```bash
# Install dependencies
npm install
npm install --prefix app

# Start the development server
npm run dev
```

Open http://localhost:5173 in your browser.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build the app for production |
| `npm run preview` | Preview the production build |
| `npm run test` | Run tests |
| `npm run tasks:list` | List task-master tasks |
| `npm run tasks:generate` | Generate task files |
| `npm run tasks:parse-prd` | Parse PRD documents |

## Project Structure

```
sketcher/
├── app/                    # React application (Vite + TypeScript)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── layouts/        # Layout templates
│   │   ├── pages/          # Page components
│   │   ├── services/       # API and data services
│   │   ├── utils/          # Utility functions
│   │   └── assets/         # Static assets
│   └── package.json
├── .taskmaster/            # Task-master configuration and tasks
└── package.json            # Root package (scripts + task-master)
```

## Tech Stack

- React 19 + TypeScript
- Vite for development and building
- Bootstrap 5 for UI
- React Router for navigation
- Vitest for testing

## VLM/LLM Integration

The app integrates with Gemini API to analyze uploaded whiteboard images:

1. User uploads an image
2. Image is sent to the VLM service
3. Model returns structured JSON diagram (shapes, relationships, styles)
4. Results are cached by image hash for performance

### Setup

1. Start the app: `npm run dev`
2. Open Preferences (gear icon) and enter your Gemini API key
3. Upload a whiteboard image to extract diagram data

### Troubleshooting

- **API Key Issues:** Ensure a valid Gemini API key is set in preferences
- **Quota/Rate Limits:** Wait and retry, or check API usage
- **Network Errors:** Check internet connection and API endpoint
- **Malformed Responses:** Check prompt version and model output
