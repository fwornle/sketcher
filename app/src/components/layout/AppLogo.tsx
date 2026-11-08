import { PenTool } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppLogo({ className }: { className?: string }) {
  return (
    <div className={cn('h-8 w-8 bg-accent-500 rounded-full flex items-center justify-center', className)}>
      <PenTool className="h-4 w-4 text-white" aria-hidden="true" />
    </div>
  );
}

export default AppLogo;
