import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compareVersions } from "./version-utils.js";

const VERSION_PATH = resolve("src/data/version.json");
const SERVICE_KEY_PATH = resolve("supabaseServiceKey.json");
const TABLE_NAME = "version";
const CURRENT_ID = "current";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function requireVersion() {
  const data = readJson(VERSION_PATH);
  if (!data.version) {
    throw new Error(`Missing "version" in ${VERSION_PATH}`);
  }
  return data.version;
}

function requireCredentials() {
  if (!existsSync(SERVICE_KEY_PATH)) {
    throw new Error(
      "Missing supabaseServiceKey.json. Expected { \"supabaseUrl\": \"...\", \"serviceRoleKey\": \"...\" }",
    );
  }

  const credentials = readJson(SERVICE_KEY_PATH);
  if (!credentials.supabaseUrl || !credentials.serviceRoleKey) {
    throw new Error(
      "Invalid supabaseServiceKey.json. Expected supabaseUrl and serviceRoleKey.",
    );
  }
  return credentials;
}

async function updateVersion() {
  const localVersion = requireVersion();
  const { supabaseUrl, serviceRoleKey } = requireCredentials();
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: remoteVersion, error: readError } = await supabase
    .from(TABLE_NAME)
    .select("id, version")
    .eq("id", CURRENT_ID)
    .maybeSingle();

  if (readError) throw readError;

  if (!remoteVersion) {
    const { error: insertError } = await supabase
      .from(TABLE_NAME)
      .insert({ id: CURRENT_ID, version: localVersion });
    if (insertError) throw insertError;
    console.log(`Created remote version ${localVersion}.`);
    return;
  }

  const comparison = compareVersions(localVersion, remoteVersion.version);
  if (comparison > 0) {
    const { error: updateError } = await supabase
      .from(TABLE_NAME)
      .update({ version: localVersion, updated_at: new Date().toISOString() })
      .eq("id", CURRENT_ID);
    if (updateError) throw updateError;
    console.log(
      `Updated remote version from ${remoteVersion.version} to ${localVersion}.`,
    );
    return;
  }

  if (comparison === 0) {
    console.log(`Remote version is already ${localVersion}. No changes.`);
    return;
  }

  console.warn(
    `Local version ${localVersion} is older than remote version ${remoteVersion.version}. No changes.`,
  );
}

updateVersion().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
