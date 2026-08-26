import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";

const app = initializeApp();

// This project has multiple Firestore databases; this one is scoped to
// "quantumjam", not "(default)" — mirrors src/lib/firebase.ts on the
// frontend. Must be passed explicitly or writes silently land elsewhere.
export const db = getFirestore(app, "quantumjam");
