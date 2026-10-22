const environment = process.env.ENVIRONMENT

export const ENVIRONMENT =
  environment === 'dev' ||
  environment === 'development' ||
  environment === 'staging'
    ? 'development'
    : 'production'
