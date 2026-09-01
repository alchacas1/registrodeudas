const ACCESS_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
type TimestampLike = { toDate(): Date };

export function generateAccessCode(random: (bytes: Uint8Array<ArrayBuffer>) => Uint8Array<ArrayBuffer> = (bytes) => { crypto.getRandomValues(bytes); return bytes; }, length = 5) {
  const values = random(new Uint8Array(new ArrayBuffer(length)));
  return Array.from(values, (value) => ACCESS_CODE_CHARS[value % ACCESS_CODE_CHARS.length]).join("");
}
export function timestampToIso(value: TimestampLike | string | undefined): string {
  if (!value) return new Date().toISOString();
  return typeof value === "string" ? value : value.toDate().toISOString();
}
