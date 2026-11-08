import { Logger } from '@/utils/logging';

const STORAGE_KEY = 'sketcher_prefs';
/** Pre-Redux builds stored the selected VLM under its own key; read it once as a fallback. */
const LEGACY_VLM_KEY = 'selectedVLM';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ExportFormat = 'drawio' | 'svg' | 'png';

/** API-key preference fields, one per supported VLM provider. */
export type ApiKeyField =
  | 'geminiApiKey'
  | 'gemma4ApiKey'
  | 'claudeApiKey'
  | 'gpt4oApiKey'
  | 'qwenApiKey'
  | 'florenceApiKey'
  | 'cogvlmApiKey'
  | 'llavaApiKey';

export type Preferences = Partial<Record<ApiKeyField, string>> & {
  theme?: ThemePreference;
  exportFormat?: ExportFormat;
  selectedVlm?: string;
};

// Simple obfuscation (not real encryption)
function encode(str: string) {
  return btoa(encodeURIComponent(str));
}

function decode(str: string) {
  try {
    return decodeURIComponent(atob(str));
  } catch {
    return '';
  }
}

/** Decode both the current format and the legacy `btoa(unescape(...))` format. */
function decodeAny(str: string): Preferences {
  for (const candidate of [decode(str), legacyDecode(str)]) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate) as Preferences;
    } catch {
      // try next format
    }
  }
  return {};
}

function legacyDecode(str: string) {
  try {
    const binary = atob(str);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}

export function savePreferences(prefs: Preferences) {
  try {
    localStorage.setItem(STORAGE_KEY, encode(JSON.stringify(prefs)));
    Logger.trace(Logger.Categories.STORAGE, 'Preferences saved');
  } catch (e) {
    Logger.error(Logger.Categories.STORAGE, 'Failed to save preferences', e);
  }
}

export function loadPreferences(): Preferences {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const prefs = data ? decodeAny(data) : {};
    if (!prefs.selectedVlm) {
      const legacyVlm = localStorage.getItem(LEGACY_VLM_KEY);
      if (legacyVlm) prefs.selectedVlm = legacyVlm;
    }
    return prefs;
  } catch (e) {
    Logger.error(Logger.Categories.STORAGE, 'Failed to load preferences', e);
    return {};
  }
}

export function clearPreferences() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_VLM_KEY);
  } catch (e) {
    Logger.error(Logger.Categories.STORAGE, 'Failed to clear preferences', e);
  }
}
