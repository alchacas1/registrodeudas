import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compareVersions } from "./version-utils.js";

const VERSION_PATH = resolve("src/data/version.json");
const CREDENTIALS_PATH = resolve("firebaseServiceAccount.json");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

async function updateVersion() {
  if (!existsSync(CREDENTIALS_PATH)) throw new Error("Missing firebaseServiceAccount.json.");
  const serviceAccount = readJson(CREDENTIALS_PATH);
  if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) throw new Error("Invalid Firebase service account.");
  const localVersion = readJson(VERSION_PATH).version;
  const app = getApps()[0] ?? initializeApp({ credential: cert(serviceAccount) });
  const ref = getFirestore(app).doc("appMetadata/current");
  const snapshot = await ref.get();
  if (!snapshot.exists) { await ref.set({ version: localVersion, updatedAt: FieldValue.serverTimestamp() }); console.log(`Created remote version ${localVersion}.`); return; }
  const remoteVersion = snapshot.data().version;
  const comparison = compareVersions(localVersion, remoteVersion);
  if (comparison > 0) { await ref.update({ version: localVersion, updatedAt: FieldValue.serverTimestamp() }); console.log(`Updated remote version from ${remoteVersion} to ${localVersion}.`); }
  else if (comparison === 0) console.log(`Remote version is already ${localVersion}. No changes.`);
  else console.warn(`Local version ${localVersion} is older than remote version ${remoteVersion}. No changes.`);
}

updateVersion().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
