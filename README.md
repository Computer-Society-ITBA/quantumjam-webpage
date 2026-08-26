# quantum-jam-csitba

React + TypeScript SPA scaffolded with Vite, styled with Tailwind CSS
v4 and shadcn/ui, translated with react-i18next, and backed by
Firebase (Hosting, Firestore, Cloud Functions). The workshops and
competition sign-up flows are live: email verification, Firestore
writes, and transactional emails all run through Cloud Functions —
see [Firebase](#firebase) below.

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
functions/         Firebase Cloud Functions - event sign-up backend
firebase.json      Firebase Hosting + Firestore + emulator config
firestore.rules    Firestore security rules (deny-all; see below)
```

## Firebase

Client config comes from `VITE_FIREBASE_*` env vars - see
`.env.example`. `src/lib/firebase.ts` initializes the app and
exports `db` (Firestore) and `functions` (Cloud Functions callables).

The Firebase project (`webpage-36e40`) hosts multiple apps, each
with its own Firestore database **and its own Cloud Functions in the
same project** - `firebase deploy --only functions` (no filter) will
offer to delete any function it doesn't find in this repo's
`functions/` source, which includes functions that belong to those
other apps. **Always deploy by name**, e.g.
`firebase deploy --only functions:requestVerificationCode,functions:submitWorkshopSignup`,
never a bare `--only functions`.

This app is pinned to the `quantumjam` Firestore database
(`getFirestore(app, 'quantumjam')`), not the project's `(default)`
one - a plain `getFirestore(app)` would silently read/write the
wrong database. The same applies inside `functions/src/admin.ts`.
Hosting likewise deploys to the `csitba-quantumjam` site, not the
project's default site.

Local emulator suite (Hosting on 5000, Firestore on 8080, Functions
on 5001, Auth on 9099, UI on default) is preconfigured in
`firebase.json`. Point the frontend at it with
`VITE_USE_FIREBASE_EMULATORS=true` in `.env.local` (see
`.env.example`) - without that flag, `npm run dev` talks to the real
project even in development.

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
the deploy. Their `npm run build` step also needs the six
`VITE_FIREBASE_*` values (same names as `.env.example`) set as
**repository secrets** (Settings → Secrets and variables → Actions),
since Vite bakes them in at build time - without them, the deployed
site silently calls `us-central1-undefined.cloudfunctions.net` and
every sign-up request fails.

### Functions

`functions/` backs the workshops and competition sign-up flows, all
under `functions/src/`:

| File              | Exports                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `verification.ts` | `requestVerificationCode`, `confirmVerificationCode` - the shared email-OTP flow both events use                         |
| `workshops.ts`    | `submitWorkshopSignup`                                                                                                   |
| `competition.ts`  | `submitCompetitionSignup`, `lookupTeam`                                                                                  |
| `admin.ts`        | Admin SDK bootstrap, pinned to the `quantumjam` database                                                                 |
| `lib/otp.ts`      | Code generation/hashing, email normalization, rate-limit constants                                                       |
| `lib/slug.ts`     | `teamIdFrom()` (kept in sync by hand with the frontend copy in `src/components/registration/wizard.ts`), `MAX_TEAM_SIZE` |
| `lib/email.ts`    | Branded HTML email templates + sending (see below)                                                                       |

**Verification** is server-mediated: `requestVerificationCode`
generates a 6-digit code (rate-limited: 30s resend cooldown, 5
requests/hour, 5 wrong-code attempts), emails it, and
`confirmVerificationCode` checks it and mints a short-lived,
single-use `verificationToken`. The two `submit*` functions require
that token and consume it inside the same Firestore transaction that
writes the sign-up doc, so a token can't be replayed. Competition
team create/join (capacity check, code-uniqueness check, member
count) happens in that same transaction for atomicity.

**Firestore collections** (`emailVerifications`, `workshopSignups`,
`competitionSignups`, `teams`) are written exclusively by these
functions via the Admin SDK, which bypasses `firestore.rules`
entirely - the rules file is a deliberate deny-all. There's nothing
to add there when adding a new field; add it in the relevant
`functions/src/*.ts` file and the matching frontend call in
`src/lib/registrationApi.ts` instead.

### Email delivery (SMTP)

Both the verification code and the post-registration confirmation
emails (`functions/src/lib/email.ts`) send through direct Gmail SMTP
as `computersociety@itba.edu.ar`, via `nodemailer`, not a
third-party transactional-email service. SendGrid, Brevo, Mailjet,
and Resend were each tried first; every one hit new-account friction
(trial expiry, phone 2FA, an auto-fraud block) within a single test
session. Gmail SMTP through the club's own Workspace mailbox
sidesteps that whole category of problem, and its ~500 emails/day
cap is far more than this event needs.

Setup, if the app password ever needs to be rotated:

1. Sign into `computersociety@itba.edu.ar` and enable 2-Step
   Verification if it isn't already on (required for App Passwords).
2. Generate an app password at
   [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
3. Store it as a Functions secret (never in `.env` or committed
   anywhere): `firebase functions:secrets:set GMAIL_APP_PASSWORD`,
   then redeploy the functions that use it (`requestVerificationCode`,
   `submitWorkshopSignup`, `submitCompetitionSignup`).

Under the Functions emulator (`FUNCTIONS_EMULATOR=true`, set
automatically by `firebase emulators:start`), `lib/email.ts` logs
the email instead of sending it, since there's no real SMTP
credential available locally.

The workshops confirmation email currently links a **mocked** Discord
invite (`DISCORD_INVITE_URL` in `lib/email.ts`, flagged with a
`TODO`) - swap it for the real one once the server exists.

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
