const environment = import.meta.env.VITE_ENVIRONMENT

export const ENVIRONMENT =
  environment === 'dev' ||
  environment === 'development' ||
  environment === 'staging'
    ? 'development'
    : 'production'

export const API_BASE_URL =
  ENVIRONMENT === 'development'
    ? 'http://127.0.0.1:5001/' +
      import.meta.env.VITE_FIREBASE_PROJECT_ID +
      '/us-central1/quantumjamAdminApi'
    : ''
