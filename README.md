# Registro de Deudas

Aplicación React para administrar grupos, miembros y deudas. Usa Firebase Authentication y Cloud Firestore con reglas de acceso por membresía.

Quien crea un grupo se autentica mediante un enlace enviado a su correo. Una persona invitada puede ingresar directamente con el código del grupo y su correo; el servidor valida ambos datos y entrega una sesión de Firebase limitada a ese grupo.

## Configuración

1. En Firebase Console, crea Firestore en modo producción.
2. En Authentication, habilita Email/Password y Email link.
3. Agrega `localhost` y el dominio de Vercel a Authorized domains.
4. Instala dependencias con `npm install`.
5. Configura `.env` con las variables públicas `VITE_FIREBASE_*`.

La función `api/join-group.ts` necesita estas variables privadas en Vercel:

```text
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

Obtén sus valores de una cuenta de servicio del mismo proyecto Firebase. Conserva la clave privada únicamente como variable de entorno del servidor; no uses prefijo `VITE_` ni la incluyas en el repositorio. Si Vercel recibe la clave con saltos escapados (`\n`), la función los convierte antes de inicializar Firebase Admin.

La configuración web de Firebase no es un secreto. La protección de los datos depende de `firestore.rules`.

## Desarrollo y verificación

```bash
npm run dev
npm test
npm run test:rules
npm run lint
npm run build
```

`npm run dev` inicia solo Vite. Para probar también `/api/join-group` localmente, usa `vercel dev` y proporciona deliberadamente las tres variables privadas anteriores en tu entorno local.

Para desplegar reglas e índices en el proyecto configurado con Firebase CLI:

```bash
npx firebase use controldeudas-d106f
npx firebase deploy --only firestore
```

La aplicación continúa desplegándose en Vercel. Antes de publicar este cambio, configura las tres variables privadas en el proyecto y despliega también las reglas actualizadas de Firestore. La reescritura SPA excluye `/api/*`, por lo que la función recibe esas solicitudes y las demás rutas siguen resolviendo `index.html`.

## Actualizar versión remota

`npm run update` sincroniza `src/data/version.json` con `appMetadata/current`. Requiere un archivo local y no versionado `firebaseServiceAccount.json` descargado desde Firebase/Google Cloud. Nunca expongas esa cuenta de servicio en el frontend.
