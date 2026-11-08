import type { ApiKeyField } from '@/services/storage';

export interface VlmProvider {
  key: string;
  label: string;
  apiKeyField: ApiKeyField;
  /** Label of the API key field when several providers share one key (defaults to label). */
  keyLabel?: string;
  /** Whether a VLM adapter exists for this provider (others fall back to a dummy adapter). */
  implemented: boolean;
  keyHint: string;
}

export const VLM_PROVIDERS: VlmProvider[] = [
  { key: 'gemini', label: 'Google Gemini 4 Argon', apiKeyField: 'geminiApiKey', implemented: true, keyHint: 'Get your key from Google AI Studio.' },
  { key: 'claude', label: 'Anthropic Claude Fable 5.1', apiKeyField: 'claudeApiKey', keyLabel: 'Anthropic Claude', implemented: true, keyHint: 'Get your key from the Anthropic Console. Used for Claude Fable 5.1 and Opus 5.5.' },
  { key: 'claude-opus', label: 'Anthropic Claude Opus 5.5', apiKeyField: 'claudeApiKey', keyLabel: 'Anthropic Claude', implemented: true, keyHint: 'Get your key from the Anthropic Console. Used for Claude Fable 5.1 and Opus 5.5.' },
  // Key kept as 'gpt4o' so stored API keys and selections survive the model change.
  { key: 'gpt4o', label: 'OpenAI GPT-6 Astra', apiKeyField: 'gpt4oApiKey', implemented: true, keyHint: 'Get your key from the OpenAI platform.' },
  { key: 'qwen', label: 'Qwen2.5-VL', apiKeyField: 'qwenApiKey', implemented: false, keyHint: 'Get your key from the provider.' },
  { key: 'florence', label: 'Florence-2', apiKeyField: 'florenceApiKey', implemented: false, keyHint: 'Get your key from the provider.' },
  { key: 'cogvlm', label: 'CogVLM (Ollama)', apiKeyField: 'cogvlmApiKey', implemented: false, keyHint: 'Get your key from the provider.' },
  { key: 'llava', label: 'LLaVA', apiKeyField: 'llavaApiKey', implemented: false, keyHint: 'Get your key from the provider.' },
];

export const DEFAULT_VLM = 'gemini';

export function getVlmProvider(key: string | undefined): VlmProvider {
  return VLM_PROVIDERS.find(p => p.key === key) ?? VLM_PROVIDERS.find(p => p.key === DEFAULT_VLM)!;
}
