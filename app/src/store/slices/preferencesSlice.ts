import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { loadPreferences, savePreferences, type Preferences } from '@/services/storage';

interface PreferencesState extends Preferences {
  isLoaded: boolean;
}

const initialState: PreferencesState = {
  ...loadPreferences(),
  isLoaded: true,
};

function persist(state: PreferencesState) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isLoaded: _, ...prefs } = state;
  savePreferences(prefs);
}

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    updatePreferences: (state, action: PayloadAction<Partial<Preferences>>) => {
      Object.assign(state, action.payload);
      persist(state);
    },
    setPreferences: (state, action: PayloadAction<Preferences>) => {
      savePreferences(action.payload);
      return { ...action.payload, isLoaded: state.isLoaded };
    },
    refreshPreferences: () => {
      return { ...loadPreferences(), isLoaded: true };
    },
    clearPreferences: () => {
      savePreferences({});
      return { isLoaded: true };
    },
  },
});

export const { updatePreferences, setPreferences, refreshPreferences, clearPreferences } = preferencesSlice.actions;
export default preferencesSlice.reducer;
