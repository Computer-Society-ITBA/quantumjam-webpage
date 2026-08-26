import { initializeApp, type FirebaseOptions } from 'firebase/app'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(firebaseConfig)
// The project has multiple Firestore databases (other apps in the same
// Firebase project use their own); this one is scoped to "quantumjam".
export const db = getFirestore(app, 'quantumjam')
export const functions = getFunctions(app, 'us-central1')

// Opt-in: `npm run dev` talks to the real project by default. Set
// VITE_USE_FIREBASE_EMULATORS=true to point at `firebase emulators:start`
// instead.
if (
  import.meta.env.DEV &&
  import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true'
) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
}

// To add Auth later:
//   import { getAuth } from 'firebase/auth'
//   export const auth = getAuth(app)
