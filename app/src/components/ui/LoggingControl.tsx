/**
 * LoggingControl.tsx
 *
 * Professional UI component for controlling logging levels and categories.
 * Features color-coded categories and intelligent level activation logic.
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Logger } from '@/utils/logging/Logger';
import { loggingColors } from '@/utils/logging/config/loggingColors';
import { categoriesConfig } from '@/utils/logging/config/loggingConfig';

interface LoggingControlProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoggingControl: React.FC<LoggingControlProps> = ({ isOpen, onClose }) => {
  // Local state for UI (initialized lazily on first render)
  const [activeLevels, setActiveLevels] = useState<Set<string>>(() => Logger.getActiveLevels());
  const [activeCategories, setActiveCategories] = useState<Set<string>>(() => Logger.getActiveCategories());

  // Helper function to compare Sets
  const setsEqual = (a: Set<string>, b: Set<string>): boolean => {
    if (a.size !== b.size) return false;
    for (const item of a) {
      if (!b.has(item)) return false;
    }
    return true;
  };

  // Sync local state with Logger when modal opens
  useEffect(() => {
    if (isOpen) {
      // Modal just opened - refresh from Logger
      const currentLevels = Logger.getActiveLevels();
      const currentCategories = Logger.getActiveCategories();

      // Only update if different to avoid unnecessary renders
      setActiveLevels((prev) => (setsEqual(prev, currentLevels) ? prev : currentLevels));
      setActiveCategories((prev) => (setsEqual(prev, currentCategories) ? prev : currentCategories));
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-primary-800 rounded-lg shadow-lg w-full max-w-3xl max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-primary-700">
          <h2 className="text-lg font-semibold text-primary-900 dark:text-white">
            Logging Configuration
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(85vh-120px)]">
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
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t border-gray-200 dark:border-primary-700 bg-gray-50 dark:bg-primary-900/50">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium">{activeLevels.size}</span> levels,{' '}
            <span className="font-medium">{activeCategories.size}</span> categories active
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-white bg-accent-600 rounded-lg text-sm font-medium hover:bg-accent-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoggingControl;
