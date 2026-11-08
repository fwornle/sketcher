import { SketchWorkspace } from '@/features/sketch'

export function HomePage() {
  return (
    <div className="mx-auto max-w-5xl py-4">
      <h1 className="mb-2 text-4xl font-bold">Welcome to Sketcher</h1>
      <p className="mb-8 text-muted-foreground">
        Turn your whiteboard sketches into beautiful drawio diagrams.
      </p>
      <SketchWorkspace />
    </div>
  )
}
