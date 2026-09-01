# Registro de Deudas

Aplicación React para administrar grupos, miembros y deudas. Usa Firebase Authentication con enlaces de correo y Cloud Firestore con reglas de acceso por membresía.

## Configuración

1. En Firebase Console, crea Firestore en modo producción.
2. En Authentication, habilita Email/Password y Email link.
3. Agrega `localhost` y el dominio de Vercel a Authorized domains.
4. Instala dependencias con `npm install`.
5. Configura `.env` con las variables públicas `VITE_FIREBASE_*`.

La configuración web de Firebase no es un secreto. La protección de los datos depende de `firestore.rules`.

## Desarrollo y verificación

```bash
npm run dev
npm test
npm run test:rules
npm run lint
npm run build
```

Para desplegar reglas e índices en el proyecto configurado con Firebase CLI:

```bash
npx firebase use controldeudas-d106f
npx firebase deploy --only firestore
```

La aplicación continúa desplegándose en Vercel.

## Actualizar versión remota

`npm run update` sincroniza `src/data/version.json` con `appMetadata/current`. Requiere un archivo local y no versionado `firebaseServiceAccount.json` descargado desde Firebase/Google Cloud. Nunca expongas esa cuenta de servicio en el frontend.
