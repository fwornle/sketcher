// Imports the app's VLM service (adapters, prompt, schema) into Node.
import { register } from 'node:module';

// Node 22 announces type stripping as experimental on every run; keep other warnings.
process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.name !== 'ExperimentalWarning') process.stderr.write(`${w.name}: ${w.message}\n`);
});

register('./app-hooks.mjs', import.meta.url);

// The Gemini adapter hashes images with window.crypto; Node has the same API on globalThis.
globalThis.window ??= globalThis;

export async function loadVlmService() {
  return import('../../app/src/services/vlmService.ts');
}
