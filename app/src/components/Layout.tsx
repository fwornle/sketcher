import { Outlet } from 'react-router-dom'
import { TopBar } from './layout/TopBar'
import { BottomBar } from './layout/BottomBar'
import { SidebarMenu } from './layout/SidebarMenu'
import type { StatusType } from './layout/BottomBar'
import { useAppSelector } from '@/store'
import { selectSketch } from '@/features/sketch/sketchSlice'
import type { SketchStatus } from '@/features/sketch/sketchSlice'

// App version and environment from Vite define and env
const appVersion = __APP_VERSION__;
const appEnvironment = import.meta.env.VITE_ENVIRONMENT || 'local';

const STATUS_MAP: Record<SketchStatus, StatusType> = {
  idle: 'idle',
  analyzing: 'loading',
  succeeded: 'success',
  failed: 'error',
};

interface LayoutProps {
  appName?: string;
}

export function Layout({ appName = 'Sketcher' }: LayoutProps) {
  const { status, shapes, error } = useAppSelector(selectSketch)

  const statusMessage =
    status === 'analyzing' ? 'Analyzing sketch…'
    : status === 'succeeded' ? `Diagram extracted (${shapes.length} shapes)`
    : status === 'failed' ? (error ?? 'Analysis failed')
    : ''

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopBar
        appName={appName}
        className="sticky top-0 z-50"
      />

      {/* Sidebar Menu - opens on left edge hover, closes on click outside */}
      <SidebarMenu />

      <main className="flex-1 w-full">
        <div className="container mx-auto px-4 py-6 md:px-6 lg:px-8 max-w-7xl">
          <Outlet />
        </div>
      </main>

      <BottomBar
        className="sticky bottom-0 z-50"
        status={STATUS_MAP[status]}
        statusMessage={statusMessage}
        version={appVersion}
        environment={appEnvironment}
      />
    </div>
  )
}
