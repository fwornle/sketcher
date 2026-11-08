import React, { useRef, useState } from 'react';
import { CloudUpload, Loader2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logger } from '@/utils/logging';

const MAX_SIZE_MB = 10;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png'];

interface ImageUploadProps {
  /** Data URL of the currently selected image (controlled). */
  preview: string | null;
  /** Disable interaction, e.g. while an analysis is running. */
  busy?: boolean;
  onImageSelected: (file: File, dataUrl: string) => void;
  onReset: () => void;
}

function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Only JPG and PNG images are supported.';
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return `File size must be less than ${MAX_SIZE_MB}MB.`;
  }
  return null;
}

// View - Renders the drop zone and reports user intents via callbacks
const ImageUpload: React.FC<ImageUploadProps> = ({ preview, busy = false, onImageSelected, onReset }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (busy || !files || files.length === 0) return;
    const selected = files[0];
    const validationError = validateFile(selected);
    if (validationError) {
      Logger.warn(Logger.Categories.UI, 'Rejected upload:', validationError);
      setError(validationError);
      return;
    }
    setError(null);
    setReading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      setReading(false);
      onImageSelected(selected, e.target?.result as string);
    };
    reader.onerror = () => {
      setReading(false);
      setError('Failed to read file.');
    };
    reader.readAsDataURL(selected);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
    onReset();
  };

  const openPicker = () => {
    if (!busy) inputRef.current?.click();
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a whiteboard photo"
        aria-disabled={busy}
        className={cn(
          'relative flex min-h-48 flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors',
          busy ? 'cursor-wait' : 'cursor-pointer',
          dragActive
            ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20'
            : 'border-gray-300 dark:border-primary-600 bg-card hover:border-accent-400 hover:bg-gray-50 dark:hover:bg-primary-800/60',
        )}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFiles(e.dataTransfer.files);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragActive(false);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {reading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Reading file…
          </div>
        )}

        {!preview && !reading && (
          <>
            <CloudUpload className="mb-3 h-12 w-12 text-accent-500" aria-hidden="true" />
            <div className="font-semibold">Drag &amp; drop a whiteboard photo here, or click to select</div>
            <div className="mt-1 text-sm text-muted-foreground">JPG, PNG, max {MAX_SIZE_MB}MB</div>
          </>
        )}

        {preview && !reading && (
          <div className="flex flex-col items-center gap-3">
            <img src={preview} alt="Uploaded sketch preview" className="max-h-52 rounded-md shadow-sm" />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 dark:bg-primary-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
            </div>
            {!busy && <div className="text-xs text-muted-foreground">Click or drop another image to replace</div>}
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="mt-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/30 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
