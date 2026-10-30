// Development mode is dev-server only: a production build ignores
// VITE_ENVIRONMENT even if it is left set in .env.
const environment = import.meta.env.VITE_ENVIRONMENT

export const ENVIRONMENT =
  import.meta.env.DEV &&
  (environment === 'dev' ||
    environment === 'development' ||
    environment === 'staging')
    ? 'development'
    : 'production'

// Appended to collection names in development. Keep in sync with
// functions/src/lib/environment.ts.
export const COLLECTION_SUFFIX = ENVIRONMENT === 'development' ? '_staging' : ''
