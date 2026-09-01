import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { readFirebaseConfig } from "./firebase-config";

export const firebaseApp = initializeApp(readFirebaseConfig(import.meta.env));
export const auth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);
