import type { FirebaseOptions } from "firebase/app";

const required = ["VITE_FIREBASE_API_KEY", "VITE_FIREBASE_AUTH_DOMAIN", "VITE_FIREBASE_PROJECT_ID", "VITE_FIREBASE_STORAGE_BUCKET", "VITE_FIREBASE_MESSAGING_SENDER_ID", "VITE_FIREBASE_APP_ID"] as const;

export function readFirebaseConfig(env: Record<string, unknown>): FirebaseOptions {
  const missing = required.filter((key) => !String(env[key] ?? "").trim());
  if (missing.length) throw new Error(`Faltan variables de Firebase: ${missing.join(", ")}`);
  return {
    apiKey: String(env.VITE_FIREBASE_API_KEY), authDomain: String(env.VITE_FIREBASE_AUTH_DOMAIN),
    projectId: String(env.VITE_FIREBASE_PROJECT_ID), storageBucket: String(env.VITE_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: String(env.VITE_FIREBASE_MESSAGING_SENDER_ID), appId: String(env.VITE_FIREBASE_APP_ID),
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID ? String(env.VITE_FIREBASE_MEASUREMENT_ID) : undefined,
  };
}
