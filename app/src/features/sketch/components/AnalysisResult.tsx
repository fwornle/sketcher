import { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Clipboard, ClipboardCheck, Download, AlertTriangle } from 'lucide-react';
import { useAppSelector } from '@/store';
import { Logger } from '@/utils/logging';
import { cn } from '@/lib/utils';
import { selectDrawioXml, selectSketch } from '../sketchSlice';

const smallButton =
  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const secondaryButton = cn(smallButton, 'bg-gray-100 dark:bg-primary-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-primary-600');

function baseName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '') || 'sketch';
}

// View - Summary of the extracted diagram with raw-JSON inspection and export
export function AnalysisResult() {
  const { rawResponse, compositionDescription, parseWarnings, shapes, relationships, image } = useAppSelector(selectSketch);
  const drawioXml = useAppSelector(selectDrawioXml);
  const [showRawJson, setShowRawJson] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyJson = () => {
    if (!rawResponse) return;
    navigator.clipboard.writeText(JSON.stringify(rawResponse, null, 2))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => Logger.error(Logger.Categories.UI, 'Failed to copy JSON:', err));
  };

  const downloadDrawio = () => {
    if (!drawioXml) return;
    const blob = new Blob([drawioXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName(image?.fileName ?? 'sketch')}.drawio`;
    a.click();
    URL.revokeObjectURL(url);
    Logger.info(Logger.Categories.DIAGRAM, `Downloaded ${a.download}`);
  };

  return (
    <div className="space-y-3">
      {compositionDescription && (
        <div className="rounded-lg border bg-card p-4 text-sm">
          <span className="font-semibold">Composition:</span> {compositionDescription}
          {rawResponse?.vlmProvider && (
            <span className="ml-2 text-xs text-muted-foreground">(Provider: {rawResponse.vlmProvider})</span>
          )}
        </div>
      )}

      {parseWarnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-800 dark:text-amber-300">
          <div className="mb-1 flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" /> Analysis succeeded, but some elements could not be parsed
          </div>
          <ul className="list-disc space-y-0.5 pl-6 text-xs">
            {parseWarnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      <div className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold text-green-800 dark:text-green-300">
            <CheckCircle2 className="h-5 w-5" />
            Diagram extracted
            <span className="text-xs font-normal text-green-700/80 dark:text-green-400/80">
              {shapes.length} shapes · {relationships.length} relationships
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={secondaryButton}
              onClick={() => setShowRawJson(v => !v)}
              aria-expanded={showRawJson}
              aria-controls="extracted-json-box"
              disabled={!rawResponse}
            >
              {showRawJson ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              Raw JSON
            </button>
            <button
              type="button"
              className={cn(smallButton, copied ? 'bg-green-600 text-white' : secondaryButton)}
              onClick={copyJson}
              disabled={!rawResponse}
              title="Copy raw JSON"
            >
              {copied ? <ClipboardCheck className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              type="button"
              className={cn(smallButton, 'bg-accent-600 text-white hover:bg-accent-700')}
              onClick={downloadDrawio}
              disabled={!drawioXml}
            >
              <Download className="h-3.5 w-3.5" /> Download .drawio
            </button>
          </div>
        </div>
        {showRawJson && rawResponse && (
          <pre
            id="extracted-json-box"
            className="mt-3 max-h-72 overflow-auto rounded-md bg-white dark:bg-primary-900 p-3 text-xs text-gray-800 dark:text-gray-200"
          >
            {JSON.stringify(rawResponse, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

export default AnalysisResult;
