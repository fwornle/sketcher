// Module resolution hooks that let plain Node import the app's TypeScript sources:
// the `@/` alias from vite.config.ts and extensionless relative imports both resolve
// to the .ts file. Node strips the types itself (22.18+), so the eval calls the
// app's real adapters and prompt with no build step and no bundler.
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../app/src');

function findSource(base) {
  for (const candidate of [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), base]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  let base = null;
  if (specifier.startsWith('@/')) {
    base = path.join(SRC, specifier.slice(2));
  } else if (/^\.\.?\//.test(specifier) && context.parentURL?.startsWith(pathToFileURL(SRC).href)) {
    base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }
  const file = base && findSource(base);
  if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
  return nextResolve(specifier, context);
}
