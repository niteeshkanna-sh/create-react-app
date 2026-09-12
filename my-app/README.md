# my-app

A React single-page app built with Vite, TypeScript, and Tailwind CSS.

## Requirements

- Node.js 20.19+ / 22.12+

## Getting started

```bash
npm install
npm run dev
```

The dev server prints a local URL (http://localhost:5173 by default).

## Scripts

| Command           | Description                                      |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | Start the dev server with hot module replacement |
| `npm run build`   | Type-check and build to `dist/`                  |
| `npm run preview` | Serve the production build locally               |
| `npm run lint`    | Lint with oxlint                                 |

## Layout

```
my-app/
├── index.html        # HTML entry point
├── vite.config.ts    # Vite config (React + Tailwind plugins)
├── public/           # Static files copied as-is
└── src/
    ├── main.tsx      # App bootstrap
    ├── App.tsx       # Root component
    └── index.css     # Tailwind entry
```
