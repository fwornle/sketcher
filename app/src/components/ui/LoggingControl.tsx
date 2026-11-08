/**
 * LoggingControl.tsx
 *
 * Logging levels and categories, shown as the Logging tab of the settings dialog.
 * Features color-coded categories and intelligent level activation logic.
 * Changes apply to the Logger immediately; there is nothing to save.
 */

import React, { useState } from 'react';
import { Logger } from '@/utils/logging/Logger';
import { loggingColors } from '@/utils/logging/config/loggingColors';
import { categoriesConfig } from '@/utils/logging/config/loggingConfig';

// The tab mounts only while it is shown, so its state is read fresh from the Logger on
// every visit - no effect is needed to sync it.
export const LoggingControl: React.FC = () => {
  // Local state for UI, initialized from the Logger when the panel mounts
  const [activeLevels, setActiveLevels] = useState<Set<string>>(() => Logger.getActiveLevels());
  const [activeCategories, setActiveCategories] = useState<Set<string>>(() => Logger.getActiveCategories());

  // Helper function to get level colors
  const getLevelColor = (level: string) => {
    switch (level) {
      case Logger.Levels.ERROR: return '#dc3545';
      case Logger.Levels.WARN: return '#fd7e14';
      case Logger.Levels.INFO: return '#0d6efd';
      case Logger.Levels.DEBUG: return '#198754';
      case Logger.Levels.TRACE: return '#6f42c1';
      default: return '#6c757d';
    }
  };

  // Helper function to get level descriptions
  const getLevelDescription = (level: string) => {
    switch (level) {
      case Logger.Levels.ERROR: return 'Critical errors and failures';
      case Logger.Levels.WARN: return 'Warnings and potential issues';
      case Logger.Levels.INFO: return 'General information messages';
      case Logger.Levels.DEBUG: return 'Detailed debugging information';
      case Logger.Levels.TRACE: return 'Very detailed execution traces';
      default: return '';
    }
  };

  // Helper function to get category colors
  const getCategoryColor = (category: string) => {
    const key = categoriesConfig[category]?.logColorKey as keyof typeof loggingColors | undefined;
    return (key && loggingColors[key]) || loggingColors.logDefault;
  };

  const handleLevelChange = (level: string, checked: boolean) => {
    const newLevels = new Set(activeLevels);

    if (checked) {
      newLevels.add(level);
      // TRACE activates DEBUG and INFO
      if (level === Logger.Levels.TRACE) {
        newLevels.add(Logger.Levels.DEBUG);
        newLevels.add(Logger.Levels.INFO);
      }
      // DEBUG activates INFO
      else if (level === Logger.Levels.DEBUG) {
        newLevels.add(Logger.Levels.INFO);
      }
    } else {
      newLevels.delete(level);
    }

    setActiveLevels(newLevels);
    Logger.setActiveLevels(newLevels);
  };

  const handleCategoryChange = (category: string, checked: boolean) => {
    const newCategories = new Set(activeCategories);
    if (checked) {
      newCategories.add(category);
    } else {
      newCategories.delete(category);
    }
    setActiveCategories(newCategories);
    Logger.setActiveCategories(newCategories);
  };

  const handleSelectAllLevels = () => {
    const allLevels = new Set(Object.values(Logger.Levels) as string[]);
    setActiveLevels(allLevels);
    Logger.setActiveLevels(allLevels);
  };

  const handleSelectNoLevels = () => {
    const noLevels = new Set<string>();
    setActiveLevels(noLevels);
    Logger.setActiveLevels(noLevels);
  };

  const handleSelectAllCategories = () => {
    const allCategories = new Set(Object.values(Logger.Categories) as string[]);
    setActiveCategories(allCategories);
    Logger.setActiveCategories(allCategories);
  };

  const handleSelectNoCategories = () => {
    const noCategories = new Set<string>();
    setActiveCategories(noCategories);
    Logger.setActiveCategories(noCategories);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Log Levels Section */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-primary-900 dark:text-white">
              Log Levels
            </h3>
            <div className="flex gap-1">
              <button
                onClick={handleSelectAllLevels}
                className="px-2 py-1 text-xs bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 rounded hover:bg-accent-200 dark:hover:bg-accent-900/50 transition-colors"
              >
                All
              </button>
              <button
                onClick={handleSelectNoLevels}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-primary-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-primary-600 transition-colors"
              >
                None
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {(Object.values(Logger.Levels) as string[]).map((level) => {
              const levelColor = getLevelColor(level);
              const isActive = activeLevels.has(level);
              return (
                <label
                  key={level}
                  className={`flex items-center p-2 rounded-lg cursor-pointer transition-all ${
                    isActive
                      ? 'bg-gray-100 dark:bg-primary-700'
                      : 'hover:bg-gray-50 dark:hover:bg-primary-700/50'
                  }`}
                  style={{
                    borderLeft: `3px solid ${levelColor}`,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => handleLevelChange(level, e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-primary-600 accent-accent-600"
                  />
                  <div className="ml-3">
                    <span
                      className="font-medium text-sm"
                      style={{ color: isActive ? levelColor : undefined }}
                    >
                      {level}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {getLevelDescription(level)}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Smart Activation Note */}
          <div className="mt-3 p-2 bg-accent-50 dark:bg-accent-900/20 rounded-lg border border-accent-200 dark:border-accent-800">
            <p className="text-xs text-accent-700 dark:text-accent-300">
              <strong>Smart Activation:</strong> Enabling TRACE also enables DEBUG + INFO.
              Enabling DEBUG also enables INFO.
            </p>
          </div>
        </div>

        {/* Log Categories Section */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-primary-900 dark:text-white">
              Categories
            </h3>
            <div className="flex gap-1">
              <button
                onClick={handleSelectAllCategories}
                className="px-2 py-1 text-xs bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 rounded hover:bg-accent-200 dark:hover:bg-accent-900/50 transition-colors"
              >
                All
              </button>
              <button
                onClick={handleSelectNoCategories}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-primary-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-primary-600 transition-colors"
              >
                None
              </button>
            </div>
          </div>
          <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2">
            {(Object.values(Logger.Categories) as string[]).map((category) => {
              const categoryColor = getCategoryColor(category);
              const isActive = activeCategories.has(category);
              return (
                <label
                  key={category}
                  className={`flex items-center p-2 rounded cursor-pointer transition-all ${
                    isActive
                      ? 'bg-gray-100 dark:bg-primary-700'
                      : 'hover:bg-gray-50 dark:hover:bg-primary-700/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => handleCategoryChange(category, e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-primary-600 accent-accent-600"
                  />
                  <div
                    className="w-3 h-3 rounded-sm ml-3 mr-2"
                    style={{ backgroundColor: categoryColor }}
                  />
                  <span
                    className="text-sm font-medium"
                    style={{ color: isActive ? categoryColor : undefined }}
                  >
                    {category}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400">
        <span className="font-medium">{activeLevels.size}</span> levels,{' '}
        <span className="font-medium">{activeCategories.size}</span> categories active
      </div>
    </div>
  );
};

export default LoggingControl;
