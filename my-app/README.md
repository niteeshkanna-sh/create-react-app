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

## Deployment

Deployed to GitHub Pages at <https://niteshacars.in> by
`.github/workflows/deploy-my-app.yml`, which builds this directory and
publishes `dist/`.

It runs on pushes to `main` that touch `my-app/`, and can also be started
by hand from the Actions tab (Run workflow).

`public/CNAME` holds the custom domain. Vite copies `public/` into `dist/`
verbatim, so the file lands at the site root where Pages expects it.
Removing it reverts the site to the default `*.github.io` address.
