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
`VITE_FIREBASE_*` values (same names as `.env.example`) - without
them, Vite bakes in `undefined` and the deployed site silently calls
`us-central1-undefined.cloudfunctions.net`, failing every sign-up
request. Each workflow reads them from a GitHub **Environment**
(Settings → Environments), not plain repository secrets: the PR
workflow's job declares `environment: staging`, the merge workflow's
declares `environment: prod`, and each environment holds its own
copy of the six secrets. A job only receives environment secrets
when its YAML names that environment - adding them at the repo level
instead would silently not reach either workflow.

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
| `lib/contacts.ts` | `emailContacts` capture: every address that starts a sign-up, with a verified/unverified status                          |
| `lib/slug.ts`     | `teamIdFrom()` (kept in sync by hand with the frontend copy in `src/components/registration/wizard.ts`), `MAX_TEAM_SIZE` |
| `lib/email.ts`    | Branded HTML email templates + sending (see below)                                                                       |

**Verification is the first step of both flows.** The visitor gives
an email, confirms the 6-digit code, and only then fills in the rest
of the form - the competition wizard already worked this way, and the
workshops form now matches it (`email` -> `verify` -> `details`).

**Every address is captured on the way through**, in the
`emailContacts` collection (doc ID: the canonical email), for later
outreach:

| Field         | Meaning                                              |
| ------------- | ---------------------------------------------------- |
| `email`       | The address as typed (normalized, not canonicalized) |
| `status`      | `"unverified"` or `"verified"`                       |
| `purposes`    | Which flows it came from, e.g. `["workshops"]`       |
| `firstSeenAt` | When the address was first entered                   |
| `verifiedAt`  | When a code for it was first confirmed, else `null`  |
| `updatedAt`   | Last write                                           |

`requestVerificationCode` writes the row as `unverified` before the
code is even sent, and `confirmVerificationCode` flips it to
`verified`. The status only ever moves forward, so re-entering a
confirmed address does not send it back to `unverified`. Both writes
are best-effort: losing a contact row never fails the sign-up the
visitor is actually trying to complete. An address landing here is
independent of `workshopSignups` / `competitionSignups` - someone who
abandons the form after the email step is still on the list.

**Verification** is server-mediated: `requestVerificationCode`
generates a 6-digit code (rate-limited: 30s resend cooldown, 5
requests/hour, 5 wrong-code attempts), emails it, and
`confirmVerificationCode` checks it and mints a short-lived,
single-use `verificationToken`. The two `submit*` functions require
that token and consume it inside the same Firestore transaction that
writes the sign-up doc, so a token can't be replayed. Competition
team create/join (capacity check, code-uniqueness check, member
count) happens in that same transaction for atomicity.

**Firestore collections** (`emailVerifications`, `emailContacts`,
`workshopSignups`, `competitionSignups`, `teams`) are written exclusively by these
functions via the Admin SDK, which bypasses `firestore.rules`
entirely - the rules file is a deliberate deny-all. There's nothing
to add there when adding a new field; add it in the relevant
`functions/src/*.ts` file and the matching frontend call in
`src/lib/registrationApi.ts` instead.

### Registration feature flags

Both sign-up flows are gated on a single Firestore document,
`featureFlags/registration`, in the `quantumjam` database:

| Field                         | Type      | Gates                   |
| ----------------------------- | --------- | ----------------------- |
| `workshopsRegistrationOpen`   | `boolean` | `/register/workshops`   |
| `competitionRegistrationOpen` | `boolean` | `/register/competition` |

**Only an explicit `true` opens a flow.** A missing document, a
missing field, a denied read or an offline visitor all resolve to
closed, on the client and in the functions alike. Fail closed:
accepting sign-ups for an event that is meant to be shut is worse
than turning a few away while Firestore is unreachable.

That also means **the document has to exist before either flow will
open**. Create it by hand in the Firebase console (Firestore →
database `quantumjam` → collection `featureFlags` → document
`registration`) with both booleans, or with the Admin SDK.

**And `firestore.rules` has to be deployed** (`firebase deploy --only
firestore:rules`), or the client read is denied and every visitor
sees the closed state no matter what the document says. A denied read
is logged to the browser console rather than swallowed, because it
looks exactly like a flag that is switched off.

The flag is enforced in two places:

- **Client** - `src/lib/featureFlags.ts` holds a single `onSnapshot`
  listener for the whole app: the document is read once, on first
  use, and every later consumer (a route change, a second component)
  is served synchronously from the cache, so moving around the site
  never re-fetches. The listener stays attached, so flipping a flag
  in the console locks or unlocks open tabs live, no redeploy.
  `RegistrationGate` renders the locked state instead of the form,
  and never mounts the form, so `/register/workshops` and
  `/register/competition` are closed to direct URL access too.
  `/register` greys out the closed option.
- **Server** - `functions/src/lib/flags.ts` re-checks the same
  document inside `requestVerificationCode`,
  `confirmVerificationCode`, `submitWorkshopSignup` and
  `submitCompetitionSignup`, rejecting with `failed-precondition`.
  The client gate is UX; this is what actually enforces it.

This document is the one exception to the deny-all
`firestore.rules`: it is public-read (and no-write) so the site can
read it without a round trip through a Cloud Function.

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
