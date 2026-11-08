/**
 * loggingConfig.ts
 *
 * Configuration for the Logger module.
 * Defines levels, categories, and their associated properties.
 */

// Configure individual level properties
interface LogLevelConfig {
  name: string;
  value: number;
}

interface LogCategoryConfig {
  name: string;
  logColorKey: string;
}

// Define levels with names and values for potential numeric comparison later
const LOG_LEVELS: Record<string, LogLevelConfig> = {
  ERROR: { name: 'ERROR', value: 0 },
  WARN:  { name: 'WARN',  value: 1 },
  INFO:  { name: 'INFO',  value: 2 },
  DEBUG: { name: 'DEBUG', value: 3 },
  TRACE: { name: 'TRACE', value: 4 },
};

// Configure individual category properties for the application
// Categories are tailored for the Sketcher sketch-to-diagram pipeline
const LOG_CATEGORIES: Record<string, LogCategoryConfig> = {
  APP:             { name: 'APP',             logColorKey: 'logDefault' },     // General app-level logs
  VLM:             { name: 'VLM',             logColorKey: 'logApi' },         // Vision-language model requests/responses
  PARSER:          { name: 'PARSER',          logColorKey: 'logData' },        // VLM response -> shape parsing
  DIAGRAM:         { name: 'DIAGRAM',         logColorKey: 'logConfig' },      // drawio XML generation / viewer
  STORE:           { name: 'STORE',           logColorKey: 'logStore' },       // Redux state management
  UI:              { name: 'UI',              logColorKey: 'logUi' },          // UI components and interactions
  THEME:           { name: 'THEME',           logColorKey: 'logLifecycle' },   // Theme switching
  STORAGE:         { name: 'STORAGE',         logColorKey: 'logCache' },       // localStorage operations
};

// Export constants for use in the Logger and potentially elsewhere
export const LogLevels = Object.keys(LOG_LEVELS).reduce((acc, key) => {
  acc[key] = LOG_LEVELS[key].name;
  return acc;
}, {} as Record<string, string>);

export const LogCategories = Object.keys(LOG_CATEGORIES).reduce((acc, key) => {
  acc[key] = LOG_CATEGORIES[key].name;
  return acc;
}, {} as Record<string, string>);

// Export the raw configuration objects as well, needed by the Logger for styling/filtering
export const levelsConfig = LOG_LEVELS;
export const categoriesConfig = LOG_CATEGORIES;

// Define initial active state separately - Logger will handle this internally
export const initialActiveLevels = [LogLevels.ERROR, LogLevels.WARN, LogLevels.INFO]; // Start without DEBUG for production
export const initialActiveCategories = Object.values(LogCategories); // Start with all active

// Export types for TypeScript
export type LogLevel = keyof typeof LogLevels;
export type LogCategory = keyof typeof LogCategories;
export type { LogLevelConfig, LogCategoryConfig };
