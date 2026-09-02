export const EMAIL_STORAGE_KEY = "registrodeudas.emailForSignIn";
export function normalizeEmail(email: string) { return email.trim().toLowerCase(); }
export function getEmailForLink(storedEmail: string | null, suppliedEmail?: string) {
  const value = suppliedEmail ?? storedEmail;
  return value?.trim() ? normalizeEmail(value) : null;
}

export function firebaseAuthErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code === "auth/unauthorized-continue-uri") return "Este dominio no está autorizado en Firebase Authentication.";
  if (code === "auth/operation-not-allowed") return "El acceso mediante enlace de correo no está habilitado en Firebase.";
  if (code === "auth/invalid-email") return "El correo ingresado no es válido.";
  if (code === "auth/too-many-requests") return "Se enviaron demasiadas solicitudes. Espera unos minutos e intenta nuevamente.";
  return "No se pudo procesar el acceso. Intenta nuevamente.";
}
