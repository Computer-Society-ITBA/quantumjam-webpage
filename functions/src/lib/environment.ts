// Development mode only applies under the Functions emulator, which sets
// FUNCTIONS_EMULATOR=true. A stray ENVIRONMENT=development that reaches a
// deployed function (e.g. through a deployed functions/.env) is ignored.
const environment = process.env.ENVIRONMENT;
const isDevValue =
  environment === "dev" ||
  environment === "development" ||
  environment === "staging";

export const ENVIRONMENT =
  process.env.FUNCTIONS_EMULATOR === "true" && isDevValue ?
    "development" :
    "production";

// Appended to every collection name in development so local testing never
// touches production documents. Keep in sync with src/lib/environment.ts.
export const COLLECTION_SUFFIX =
  ENVIRONMENT === "development" ? "_staging" : "";
