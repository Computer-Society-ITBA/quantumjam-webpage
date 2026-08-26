# quantum-jam-csitba

React + TypeScript SPA scaffolded with Vite, styled with Tailwind CSS
v4 and shadcn/ui, translated with react-i18next, and configured to
sit on top of Firebase (Hosting, Firestore, Cloud Functions). The
Firebase surface is wired but no feature consumes it yet.

## Stack

| Layer     | Choice                                    |
| --------- | ----------------------------------------- |
| Bundler   | Vite 8                                    |
| Framework | React 19 + TypeScript                     |
| Styling   | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| UI kit    | shadcn/ui - New York style, Zinc base     |
| i18n      | react-i18next, en / es, browser detector  |
| Backend   | Firebase - Hosting, Firestore, Functions  |
| Lint      | oxlint                                    |
| Hooks     | husky + lint-staged (blocks bad commits)  |

## Getting started

```bash
npm install
cp .env.example .env       # fill in your Firebase project values
npm run dev
```

The dev server starts on `http://localhost:5173`.

## Scripts

| Command             | What it does                            |
| ------------------- | --------------------------------------- |
| `npm run dev`       | Vite dev server with HMR                |
| `npm run build`     | `tsc -b` then `vite build` into `dist/` |
| `npm run preview`   | Serve the production build locally      |
| `npm run lint`      | Run oxlint across the repo              |
| `npm run typecheck` | `tsc -b` only, no bundling              |

`npm install` also runs `husky` via the `prepare` script, which
installs the git hooks defined in `.husky/`.

## Project layout

```
src/
  components/ui/   shadcn primitives (add more via `npx shadcn@latest add …`)
  i18n/            i18next bootstrap + locale JSON (en, es)
  lib/             shared helpers - `firebase.ts`, `cn()`
  App.tsx          landing page (demo of the stack)
  main.tsx         entry point
functions/         Firebase Cloud Functions subproject
firebase.json      Firebase Hosting + Firestore + emulator config
firestore.rules    Firestore security rules (permissive stub)
```

## Firebase

Client config comes from `VITE_FIREBASE_*` env vars - see
`.env.example`. `src/lib/firebase.ts` initializes the app and
exports `db` (Firestore); other services can be added there.

The Firebase project (`webpage-36e40`) hosts multiple apps, each
with its own Firestore database. This app is pinned to the
`quantumjam` database (`getFirestore(app, 'quantumjam')`), not the
project's `(default)` one - a plain `getFirestore(app)` would
silently read/write the wrong database. Hosting likewise deploys to
the `csitba-quantumjam` site, not the project's default site.

Local emulator suite (Hosting on 5000, Firestore on 8080, Auth on
9099, UI on default) is preconfigured in `firebase.json`.

### Deploying

`npm run build` outputs to `dist/`, which Hosting serves with a
catch-all rewrite to `/index.html` so client-side routes survive a
refresh or direct link.

- Preview a change without touching the live site:
  `firebase hosting:channel:deploy preview`
- Deploy for real: `firebase deploy --only hosting`

`.github/workflows/firebase-hosting-pull-request.yml` (PR preview)
and `firebase-hosting-merge.yml` (deploy on merge to `main`) each
run the same format/lint/typecheck/test/build sequence as `ci.yml`
before deploying, so a broken build or a failing test/lint blocks
the deploy.

### Functions

`functions/` is scaffolded (TypeScript, ESLint, its own
`package.json`) but has no custom functions yet - see
`functions/src/index.ts`.

## Adding UI components

```bash
npx shadcn@latest add card
```

Components land under `src/components/ui/`.

## Adding a locale

Drop a JSON file next to `src/i18n/locales/en.json` and append its
code to `supportedLngs` in `src/i18n/index.ts`.

## Pre-commit gate

Every commit runs `oxlint` against the staged JS/TS files via
`lint-staged`. Warnings are informational; errors abort the commit.
See `.husky/pre-commit` and the `lint-staged` block in
`package.json`.

## Contributing

See `AGENTS.md` for repo conventions (commit style, layout, do-nots).
It applies to both humans and AI assistants.
