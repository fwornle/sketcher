import { KeyRound, AlertTriangle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { updatePreferences } from '@/store/slices/preferencesSlice';
import { VLM_PROVIDERS, getVlmProvider } from '../vlmProviders';

interface VlmSelectorProps {
  disabled?: boolean;
}

// View - Lets the user pick the VLM; selection is persisted via the preferences slice
export function VlmSelector({ disabled = false }: VlmSelectorProps) {
  const dispatch = useAppDispatch();
  const preferences = useAppSelector(state => state.preferences);
  const provider = getVlmProvider(preferences.selectedVlm);
  const hasKey = !!preferences[provider.apiKeyField];

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <label htmlFor="vlm-select" className="text-sm font-medium text-muted-foreground">
        Vision model
      </label>
      <select
        id="vlm-select"
        value={provider.key}
        disabled={disabled}
        onChange={(e) => dispatch(updatePreferences({ selectedVlm: e.target.value }))}
        className="w-full sm:w-72 rounded-lg border border-gray-300 dark:border-primary-600 bg-white dark:bg-primary-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500 disabled:opacity-60"
      >
        {VLM_PROVIDERS.map(p => (
          <option key={p.key} value={p.key}>
            {p.label}{p.implemented ? '' : ' (not yet supported)'}
          </option>
        ))}
      </select>

      {!provider.implemented ? (
        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5" /> No adapter yet — returns an empty dummy result
        </span>
      ) : !hasKey ? (
        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
          <KeyRound className="h-3.5 w-3.5" /> No API key set — add one in Settings
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
          <KeyRound className="h-3.5 w-3.5" /> API key configured
        </span>
      )}
    </div>
  );
}

export default VlmSelector;
