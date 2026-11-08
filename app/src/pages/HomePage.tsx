import { SketchWorkspace } from '@/features/sketch'

export function HomePage() {
  return (
    <div className="py-2">
      <h1 className="mb-1 text-3xl font-bold">Welcome to Sketcher</h1>
      <p className="mb-6 text-muted-foreground">
        Turn your whiteboard sketches into beautiful drawio diagrams.
      </p>
      <SketchWorkspace />
    </div>
  )
}
