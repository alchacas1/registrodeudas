import { describe, expect, it } from "vitest";
import { readFirebaseConfig } from "./firebase-config";

describe("readFirebaseConfig", () => {
  it("maps the public Firebase environment", () => {
    expect(readFirebaseConfig({
      VITE_FIREBASE_API_KEY: "key",
      VITE_FIREBASE_AUTH_DOMAIN: "example.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "example",
      VITE_FIREBASE_STORAGE_BUCKET: "example.firebasestorage.app",
      VITE_FIREBASE_MESSAGING_SENDER_ID: "123",
      VITE_FIREBASE_APP_ID: "app",
      VITE_FIREBASE_MEASUREMENT_ID: "measurement",
    })).toEqual({
      apiKey: "key",
      authDomain: "example.firebaseapp.com",
      projectId: "example",
      storageBucket: "example.firebasestorage.app",
      messagingSenderId: "123",
      appId: "app",
      measurementId: "measurement",
    });
  });

  it("reports every missing required value", () => {
    expect(() => readFirebaseConfig({})).toThrow(
      "VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID",
    );
  });
});
