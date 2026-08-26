# Agent instructions

Read this before making changes. Its purpose is to keep the repo
consistent across contributors - human or AI.

## Project

quantum-jam-csitba is a React + TypeScript SPA that will consume
Firebase (Auth, Firestore, Functions, Hosting). Frontend is
scaffolded with Vite; UI comes from shadcn/ui on Tailwind v4; copy
runs through react-i18next (en / es today).

## Stack

- Vite 8 + React 19 + TypeScript 6
- Tailwind CSS v4 via `@tailwindcss/vite`
- shadcn/ui - New York style, Zinc base, CSS-variable tokens
- react-i18next + `i18next-browser-languagedetector`
- Firebase - Hosting, Firestore, Functions (configured, not yet consumed)
- oxlint for linting; husky + lint-staged for the pre-commit gate

## Layout

```
src/
  components/ui/   shadcn primitives - copy in with `npx shadcn@latest add <name>`
  i18n/            i18next bootstrap + locale JSON
  lib/             shared helpers (`firebase.ts`, `cn()`)
  App.tsx          landing page
  main.tsx         entry point
functions/         Firebase Cloud Functions subproject (own lint, own tsconfig)
firebase.json .firebaserc firestore.rules firestore.indexes.json
```

## Commands

- `npm run dev` - Vite dev server
- `npm run build` - `tsc -b` + `vite build`
- `npm run lint` - oxlint
- `npm run typecheck` - `tsc -b`

## Conventions

- Import from `src/` with the `@/*` alias, not relative paths.
- User-facing copy goes through `useTranslation()`. Do not hardcode
  strings in components.
- Firebase config values come from `VITE_FIREBASE_*` env vars.
  `src/lib/firebase.ts` is the single init site.
- Prefer editing files over introducing new abstractions.
- Do not add comments that only restate what the code does.
- English for identifiers, comments, docs, and commit messages.

## Commit style

Every commit subject starts with a bracketed tag. Common ones:

| Tag           | Use for                                             |
| ------------- | --------------------------------------------------- |
| `[FEATURE]`   | new feature                                         |
| `[BUG]`       | fixing a known bug                                  |
| `[BEHAVIOR]`  | behavior change that isn't a bug fix                |
| `[UI/UX]`     | design or user-flow change                          |
| `[BUILD]`     | build / tooling / dependency change                 |
| `[CODE]`      | refactor, format, correctness cleanup               |
| `[DOCS]`      | docs or logging strings                             |
| `[TEST]`      | tests                                               |
| `[VERSION]`   | version bump                                        |
| `[CHERRY]`    | cherry-pick (include original commit hash)          |
| `[GIT]`       | generic git action (prefer something more specific) |
| `[HACK]`      | intentional hack - explain what and why in the body |
| `[IMPORTANT]` | load-bearing change worth flagging                  |

Rules:

- Subject in the imperative mood, ≤50 characters. English.
- Blank line between subject and body.
- Body lines wrapped at 72 characters. Explain the what and the
  why, not the how - the diff shows how.
- The subject must complete the sentence "If applied, this commit
  will <subject>."

Example:

```
[UI/UX] Update Upcoming Event card

- [BEHAVIOR] Card now fetches team members from the new Firestore
  path used by the importer, instead of the hardcoded fallback.
```

## Pre-commit gate

`.husky/pre-commit` runs `npx lint-staged`, which runs `oxlint` on
staged JS/TS files. Errors (e.g. `react/rules-of-hooks`) abort the
commit; warnings do not.

## Do not

- Never run `git commit`, `git push`, or anything that publishes
  commits on the human's behalf. Stage changes and let them commit.
- Never add `Co-Authored-By:` lines that name an AI assistant.
- Never commit `.env` files. Only `.env.example` is tracked.
- Do not lint or touch `functions/` from root tooling - it is a
  separate subproject with its own ESLint and tsconfig.
