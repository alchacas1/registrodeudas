export const EMAIL_STORAGE_KEY = "registrodeudas.emailForSignIn";
export function normalizeEmail(email: string) { return email.trim().toLowerCase(); }
export function getEmailForLink(storedEmail: string | null, suppliedEmail?: string) {
  const value = suppliedEmail ?? storedEmail;
  return value?.trim() ? normalizeEmail(value) : null;
}
