import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-slate-950 px-6 text-slate-100">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          my-app
        </h1>
        <p className="mt-3 text-slate-400">
          React + TypeScript + Vite + Tailwind CSS
        </p>
      </div>

      <button
        type="button"
        onClick={() => setCount((c) => c + 1)}
        className="rounded-lg bg-indigo-500 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
      >
        Count is {count}
      </button>

      <p className="text-sm text-slate-500">
        Edit <code className="text-slate-300">src/App.tsx</code> and save to
        test HMR.
      </p>
    </main>
  )
}

export default App
