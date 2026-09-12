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

## Editing the fleet

`src/data/cars.ts` holds the vehicles shown on the site. They are placeholders.

The live fleet lives in the admin database, but `api/vehicles.php` calls
`api_guard('vehicle.view')`, so it cannot be read without signing in — a public
site has no way to fetch it. Edit the file to match the real fleet; pushing to
`main` redeploys automatically.

Fields mirror the `vehicles` and `vehicle_rates` tables, so the two stay
comparable.

## Enquiry form

The form posts to `https://admin.niteshacars.in/admin/api/enquiry-submit.php`.
That endpoint needs no sign-in and already allowlists this site's origin for
CORS via the `public_site_origin` config key.

`vehicle_id` is deliberately not sent. The endpoint validates it against the
`vehicles` table, and the ids in `cars.ts` are placeholders that do not exist
there, so sending one would be rejected. The chosen car is sent as free text in
`requirements` instead. Once `cars.ts` carries real database ids, the id can be
sent and enquiries will link to the vehicle record.

A honeypot field named `website` is included and kept visually hidden, matching
what the endpoint expects.
