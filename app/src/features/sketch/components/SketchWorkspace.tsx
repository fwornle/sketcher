import { Loader2, AlertCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { Logger } from '@/utils/logging';
import { cn } from '@/lib/utils';
import { analyzeSketch, resetSketch, selectEncodedDrawioXml, selectSketch } from '../sketchSlice';
import ImageUpload from './ImageUpload';
import { VlmSelector } from './VlmSelector';
import { AnalysisResult } from './AnalysisResult';
import { DrawioViewer } from './DrawioViewer';

// View - Composes the sketch-to-diagram flow and dispatches user intents
export function SketchWorkspace() {
  const dispatch = useAppDispatch();
  const { status, image, error } = useAppSelector(selectSketch);
  const encodedXml = useAppSelector(selectEncodedDrawioXml);
  const analyzing = status === 'analyzing';

  const handleImageSelected = (file: File, dataUrl: string) => {
    Logger.info(Logger.Categories.UI, `Image selected: ${file.name}`);
    dispatch(analyzeSketch({ dataUrl, fileName: file.name }));
  };

  const handleReset = () => {
    Logger.info(Logger.Categories.UI, 'Sketch reset');
    dispatch(resetSketch());
  };

  // Wide screens: inputs and results on the left, the diagram fills the right
  return (
    <div className={cn('grid gap-6', encodedXml && 'xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]')}>
      <div className="min-w-0 space-y-6">
        <VlmSelector disabled={analyzing} />

        <ImageUpload
          preview={image?.dataUrl ?? null}
          busy={analyzing}
          onImageSelected={handleImageSelected}
          onReset={handleReset}
        />

        {analyzing && (
          <div className="flex items-center gap-2 rounded-lg border border-accent-200 dark:border-accent-900 bg-accent-50 dark:bg-accent-900/20 p-4 text-sm text-accent-800 dark:text-accent-300">
            <Loader2 className="h-4 w-4 animate-spin" /> Analyzing image…
          </div>
        )}

        {status === 'failed' && error && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/30 p-4 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {error}
          </div>
        )}

        {status === 'succeeded' && <AnalysisResult />}
      </div>

      {encodedXml && (
        <section className="min-w-0 space-y-3">
          <h3 className="text-xl font-semibold">Diagram Preview</h3>
          {/* key forces a fresh embed per diagram: drawio only signals 'ready' once */}
          <DrawioViewer key={encodedXml} xml={encodedXml} className="h-[600px] xl:h-[calc(100vh-18rem)] xl:min-h-[600px]" />
        </section>
      )}
    </div>
  );
}

export default SketchWorkspace;
