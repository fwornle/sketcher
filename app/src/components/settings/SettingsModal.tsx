import { useCallback, useEffect, useState } from 'react';
import { X, Check, Eye, EyeOff } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store';
import { updatePreferences } from '@/store/slices/preferencesSlice';
import type { ApiKeyField, Preferences } from '@/services/storage';
import { VLM_PROVIDERS } from '@/features/sketch/vlmProviders';
import { LoggingControl } from '@/components/ui/LoggingControl';
import { cn } from '@/lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'apiKeys' | 'logging';

const TABS: ReadonlyArray<readonly [Tab, string]> = [['apiKeys', 'API Keys'], ['logging', 'Logging']];

/** API key fields shown in the settings, in display order; providers sharing a key get one field. */
const API_KEY_FIELDS: Array<{ field: ApiKeyField; label: string; hint: string }> = [
  ...VLM_PROVIDERS
    .filter((p, i) => VLM_PROVIDERS.findIndex(q => q.apiKeyField === p.apiKeyField) === i)
    .map(p => ({ field: p.apiKeyField, label: p.keyLabel ?? p.label, hint: p.keyHint })),
  { field: 'gemma4ApiKey', label: 'Gemma4', hint: 'Get your key from the Gemma4 provider.' },
];

const MIN_KEY_LENGTH = 10;

const inputClass =
  'w-full rounded-lg border border-gray-300 dark:border-primary-600 bg-white dark:bg-primary-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500';

const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2';
const hintClass = 'mt-1 text-xs text-gray-500 dark:text-gray-400';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  // Mount the dialog only while open so its draft state is initialised fresh from the store each time
  if (!isOpen) return null;
  return <SettingsDialog onClose={onClose} />;
};

function SettingsDialog({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch();
  const preferences = useAppSelector(state => state.preferences);
  const [activeTab, setActiveTab] = useState<Tab>('apiKeys');
  const [draft, setDraft] = useState<Preferences>(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { isLoaded: _, ...prefs } = preferences;
    return prefs;
  });
  const [errors, setErrors] = useState<Partial<Record<ApiKeyField, string>>>({});
  const [revealed, setRevealed] = useState<Partial<Record<ApiKeyField, boolean>>>({});
  const [success, setSuccess] = useState(false);

  const setField = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = useCallback(() => {
    const errs: Partial<Record<ApiKeyField, string>> = {};
    for (const { field, label } of API_KEY_FIELDS) {
      const value = draft[field]?.trim();
      if (value && value.length < MIN_KEY_LENGTH) {
        errs[field] = `${label} API key looks too short.`;
      }
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setActiveTab('apiKeys');
      return;
    }

    dispatch(updatePreferences(draft));
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 800);
  }, [dispatch, draft, onClose]);

  // Keyboard shortcuts: Esc closes, Enter saves
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          handleSave();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleSave]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="bg-white dark:bg-primary-800 rounded-lg shadow-lg w-full max-w-3xl max-h-[85vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-primary-700">
          <h2 id="settings-title" className="text-lg font-semibold text-primary-900 dark:text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 border-b border-gray-200 dark:border-primary-700" role="tablist">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'px-3 py-2 -mb-px rounded-none rounded-t-md text-sm font-medium border-b-2 transition-colors',
                activeTab === key
                  ? 'border-accent-600 text-accent-700 dark:text-accent-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 space-y-5 overflow-y-auto">
          {activeTab === 'apiKeys' && (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Keys are stored locally in this browser only (obfuscated, not encrypted).
              </p>
              {API_KEY_FIELDS.map(({ field, label, hint }) => (
                <div key={field}>
                  <label htmlFor={`key-${field}`} className={labelClass}>{label} API Key</label>
                  <div className="relative">
                    <input
                      id={`key-${field}`}
                      type={revealed[field] ? 'text' : 'password'}
                      autoComplete="off"
                      placeholder={`Enter ${label} API key`}
                      value={draft[field] || ''}
                      onChange={(e) => setField(field, e.target.value)}
                      aria-invalid={!!errors[field]}
                      className={cn(inputClass, 'pr-10', errors[field] && 'border-red-500 focus:ring-red-500')}
                    />
                    <button
                      type="button"
                      onClick={() => setRevealed(prev => ({ ...prev, [field]: !prev[field] }))}
                      className="absolute inset-y-0 right-0 px-3 py-0 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                      aria-label={revealed[field] ? `Hide ${label} key` : `Show ${label} key`}
                    >
                      {revealed[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors[field]
                    ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors[field]}</p>
                    : <p className={hintClass}>{hint}</p>}
                </div>
              ))}
            </>
          )}

          {activeTab === 'logging' && (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Controls what the app writes to the browser console. Changes apply immediately.
              </p>
              <LoggingControl />
            </>
          )}

          {success && (
            <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
              <Check className="w-4 h-4" />
              <span className="text-sm">Settings saved successfully!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-primary-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-primary-700 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-primary-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-white bg-accent-600 rounded-lg text-sm font-medium hover:bg-accent-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
