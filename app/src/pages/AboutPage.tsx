export function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="mb-6 text-4xl font-bold">About Sketcher</h1>
      <p className="text-muted-foreground">
        Sketcher converts photos of whiteboard sketches into editable drawio diagrams.
        A vision-language model (Gemini, Claude or GPT-4o) detects shapes, text and
        connections; Sketcher then lays them out as a drawio diagram you can preview
        and download.
      </p>
      <h2 className="mt-8 mb-3 text-xl font-semibold">How to use it</h2>
      <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
        <li>Open Settings (gear icon) and add an API key for your vision model.</li>
        <li>Pick the model on the home page.</li>
        <li>Drop a JPG or PNG photo of your sketch.</li>
        <li>Review the extracted diagram and download it as a <code>.drawio</code> file.</li>
      </ol>
      <h2 className="mt-8 mb-3 text-xl font-semibold">Built with</h2>
      <ul className="list-disc list-inside space-y-2 text-muted-foreground">
        <li>Vite + React + TypeScript</li>
        <li>Tailwind CSS v4 with shadcn/ui design tokens</li>
        <li>Redux Toolkit using the MVI pattern</li>
        <li>React Router</li>
      </ul>
    </div>
  )
}
