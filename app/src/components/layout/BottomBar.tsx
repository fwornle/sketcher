import React from 'react';
import { Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export type StatusType = 'idle' | 'loading' | 'success' | 'error';
export type EnvironmentType = 'local' | 'dev' | 'int' | 'prod' | string;

interface BottomBarProps {
  className?: string;
  status?: StatusType;
  statusMessage?: string;
  version?: string;
  environment?: EnvironmentType;
  showClock?: boolean;
}

export function BottomBar({
  className = '',
  status = 'idle',
  statusMessage = '',
  version = import.meta.env.VITE_APP_VERSION || '0.0.0',
  environment = import.meta.env.VITE_ENVIRONMENT || 'local',
  showClock = true,
}: BottomBarProps) {
  const [currentTime, setCurrentTime] = React.useState(new Date());

  const getEnvironmentBadge = () => {
    const envLower = environment.toLowerCase();
    const envConfig: Record<string, { label: string; bgColor: string; textColor: string }> = {
      local: { label: 'LOCAL', bgColor: 'bg-gray-600', textColor: 'text-gray-200' },
      dev: { label: 'DEV', bgColor: 'bg-blue-600', textColor: 'text-blue-100' },
      int: { label: 'INT', bgColor: 'bg-amber-600', textColor: 'text-amber-100' },
      prod: { label: 'PROD', bgColor: 'bg-red-600', textColor: 'text-red-100' },
    };
    return envConfig[envLower] || { label: envLower.toUpperCase(), bgColor: 'bg-purple-600', textColor: 'text-purple-100' };
  };

  const envBadge = getEnvironmentBadge();

  React.useEffect(() => {
    if (!showClock) return;

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [showClock]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-4 h-4 animate-spin text-accent-400" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <CheckCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'text-accent-300';
      case 'success':
        return 'text-green-300';
      case 'error':
        return 'text-red-300';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <footer className={`bg-primary-800 dark:bg-primary-900 text-gray-300 border-t border-primary-700 shadow-md h-10 w-full ${className}`}>
      <div className="px-4 h-full flex items-center justify-between">
        {/* Left side - Status indicator */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary-700/50 min-w-0">
          {getStatusIcon()}
          <span className={`text-xs truncate max-w-[55vw] ${getStatusColor()}`}>
            {statusMessage || (status === 'idle' ? 'Ready' : status.charAt(0).toUpperCase() + status.slice(1))}
          </span>
        </div>

        {/* Right side - Environment, Clock and version */}
        <div className="flex items-center gap-3">
          {/* Environment Badge */}
          <div className={`px-2 py-0.5 rounded text-xs font-medium ${envBadge.bgColor} ${envBadge.textColor}`}>
            {envBadge.label}
          </div>

          {showClock && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-accent-400" />
              <span className="text-xs text-gray-300 whitespace-nowrap">
                {formatTime(currentTime)}
              </span>
            </div>
          )}

          {/* Version */}
          <div className="text-xs text-gray-500">
            v{version}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default BottomBar;
