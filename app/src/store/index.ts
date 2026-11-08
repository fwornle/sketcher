import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import type { TypedUseSelectorHook } from 'react-redux'
import sketchReducer from '@/features/sketch/sketchSlice'
import preferencesReducer from './slices/preferencesSlice'
import sidebarReducer from './slices/sidebarSlice'

export const store = configureStore({
  reducer: {
    sketch: sketchReducer,
    preferences: preferencesReducer,
    sidebar: sidebarReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Typed hooks for use throughout the app
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
