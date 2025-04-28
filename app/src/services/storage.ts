const STORAGE_KEY = 'sketcher_prefs';

export interface Preferences {
  geminiApiKey?: string;
  gemma4ApiKey?: string;
  claudeApiKey?: string;
  gpt4oApiKey?: string;
  qwenApiKey?: string;
  florenceApiKey?: string;
  cogvlmApiKey?: string;
  llavaApiKey?: string;
  theme?: 'light' | 'dark' | 'system';
  exportFormat?: 'drawio' | 'svg' | 'png';
}

// Simple obfuscation (not real encryption)
function encode(str: string) {
  return btoa(unescape(encodeURIComponent(str)));
}
function decode(str: string) {
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch {
    return '';
  }
}

export function savePreferences(prefs: Preferences) {
  const data = encode(JSON.stringify(prefs));
  localStorage.setItem(STORAGE_KEY, data);
}

export function loadPreferences(): Preferences {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return {};
  try {
    return JSON.parse(decode(data));
  } catch {
    return {};
  }
}

export function clearPreferences() {
  localStorage.removeItem(STORAGE_KEY);
} 