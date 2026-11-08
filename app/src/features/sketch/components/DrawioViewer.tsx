import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logger } from '@/utils/logging';

/**
 * DrawioViewer embeds diagrams.net (drawio) in an iframe and loads a diagram XML.
 *
 * Uses the simple embed protocol: waits for the 'ready' message from the iframe,
 * then posts the XML. The iframe only signals 'ready' once, so remount the component
 * (e.g. via `key={xml}`) to display a different diagram.
 */
interface DrawioViewerProps {
  xml: string;
  className?: string;
}

const DRAWIO_ORIGIN = 'https://embed.diagrams.net';
const DRAWIO_EMBED_URL = `${DRAWIO_ORIGIN}/?embed=1&ui=min`;

export const DrawioViewer: React.FC<DrawioViewerProps> = ({ xml, className }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    function handleMessage(event: MessageEvent) {
      if (event.origin !== DRAWIO_ORIGIN || event.data !== 'ready') return;

      Logger.debug(Logger.Categories.DIAGRAM, 'drawio embed ready, sending diagram');
      setLoading(false);
      setError(null);

      // Small delay so the embed is fully initialised before receiving the XML
      timer = setTimeout(() => {
        try {
          iframeRef.current?.contentWindow?.postMessage(xml, DRAWIO_ORIGIN);
        } catch (e) {
          Logger.error(Logger.Categories.DIAGRAM, 'Error sending XML to drawio:', e);
          setError(`Failed to load diagram: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }, 100);
    }

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (timer) clearTimeout(timer);
    };
  }, [xml]);

  return (
    <div className={cn('relative w-full overflow-hidden rounded-lg border bg-white', className)}>
      {loading && !error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-white/70 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading diagram…
        </div>
      )}
      {error && <div className="p-4 text-sm text-red-600">{error}</div>}
      <iframe
        ref={iframeRef}
        src={DRAWIO_EMBED_URL}
        title="drawio diagram viewer"
        className="h-full min-h-[400px] w-full border-0"
        allowFullScreen
      />
    </div>
  );
};

export default DrawioViewer;
