export type EntryIntent =
  | { mode: "create" }
  | { mode: "join"; code: string };

const ACCESS_CODE_LENGTH = 5;
const INVALID_ACCESS_CODE_CHARACTERS = /[^A-HJ-NP-Z2-9]/g;

export function normalizeAccessCode(value: string): string {
  return value
    .toUpperCase()
    .replace(INVALID_ACCESS_CODE_CHARACTERS, "")
    .slice(0, ACCESS_CODE_LENGTH);
}

export function readEntryIntent(search: string): EntryIntent | null {
  const params = new URLSearchParams(search);
  const mode = params.get("entry");
  if (mode === "create") return { mode: "create" };
  if (mode !== "join") return null;

  const code = normalizeAccessCode(params.get("code") ?? "");
  return code.length === ACCESS_CODE_LENGTH ? { mode: "join", code } : null;
}

export function buildEntryRedirectUrl(
  origin: string,
  intent: EntryIntent,
): string {
  const url = new URL("/", origin);
  url.searchParams.set("entry", intent.mode);
  if (intent.mode === "join") {
    url.searchParams.set("code", normalizeAccessCode(intent.code));
  }
  return url.toString();
}
