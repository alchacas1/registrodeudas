# Autenticación directa para unirse a un grupo

## Objetivo

Permitir que una persona invitada entre inmediatamente con el código del grupo y su correo, sin abrir un enlace de correo, manteniendo una sesión válida de Firebase y limitando esa sesión al grupo solicitado.

## Alcance

- El flujo **Crear un grupo** conserva la autenticación actual mediante enlace de correo.
- El flujo **Unirme a un grupo** solicita código y correo, valida ambos en un backend y abre el grupo en la misma sesión.
- La unión directa funciona para miembros pendientes y miembros ya vinculados.
- Una sesión creada mediante código y correo queda restringida a un solo grupo.
- No se configura ni despliega infraestructura remota automáticamente.

Quedan fuera de alcance el listado de grupos de una persona, la recuperación de cuentas y el envío de notificaciones por correo. El correo de acceso deja de enviarse al unirse; una notificación posterior requeriría integrar un proveedor de correo independiente.

## Decisiones de seguridad

Código y correo serán las credenciales de este flujo. No prueban que la persona controle el buzón, por lo que el acceso se limita al grupo indicado y no debe convertirse en una sesión global sin restricciones.

La función backend emitirá un token personalizado con estos claims:

```text
groupSession: true
groupId: string
memberId: string
```

Las reglas de Firestore permitirán a una sesión `groupSession` operar solamente cuando el `groupId` de la ruta coincida con el claim. Una sesión de grupo nunca tendrá privilegios de propietario, incluso si el UID coincide con `ownerId`. Esto evita que conocer el código compartido y el correo del propietario permita administrar el grupo.

Las sesiones normales obtenidas mediante enlace de correo conservarán su comportamiento actual y podrán usar todas sus membresías.

El backend aplicará límites separados por dirección IP y correo normalizado. Los identificadores de límite se almacenarán como hashes en una colección no accesible desde clientes. Todas las combinaciones inválidas devolverán el mismo mensaje para no revelar si existe un código o un correo concreto.

## Arquitectura

### Función de Vercel

Se añadirá `api/join-group.ts` como función Node.js de Vercel. Recibirá exclusivamente solicitudes `POST` JSON con:

```json
{
  "code": "ABCDE",
  "email": "persona@example.com"
}
```

El endpoint:

1. Normaliza y valida código y correo.
2. Registra y comprueba los límites de intentos.
3. Resuelve `accessCodes/{code}` para obtener el grupo.
4. Busca exactamente un miembro del grupo con el correo normalizado.
5. Dentro de una transacción, reutiliza el `userId` existente o asigna un UID determinista y aislado para ese miembro; también garantiza `userMemberships/{uid}`.
6. Genera un custom token con los claims de sesión de grupo.
7. Devuelve `{ token, groupId }` con `Cache-Control: no-store`.

Los secretos del Admin SDK se leerán solo del entorno del servidor:

```text
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

Ningún secreto se incluirá en variables `VITE_*`, archivos versionados ni código del navegador.

### Cliente

`src/lib/auth.ts` expondrá `joinGroupWithCredentials(code, email)`. Esta función llamará `/api/join-group`, ejecutará `signInWithCustomToken()` y devolverá el `groupId` autorizado.

En `AuthGate`:

- **Crear un grupo** seguirá mostrando correo y enviando el enlace.
- **Unirme a un grupo** mostrará código y correo, pero el botón dirá **Ingresar al grupo**.
- Al enviar, autenticará directamente y cambiará la URL a `/group/{groupId}` antes de renderizar la aplicación autenticada.
- No mostrará la pantalla “Enlace enviado” para este flujo.
- Los errores inválidos usarán un mensaje único: “No se pudo ingresar con esos datos.”
- Los errores de red o configuración se mostrarán como indisponibilidad temporal sin exponer detalles internos.

### Reglas de Firestore

Las reglas incorporarán las funciones conceptuales:

```text
isGroupSession()
sessionAllows(groupId)
isMember(groupId)
isMemberAfter(groupId)
```

`isMember` e `isMemberAfter` verificarán tanto la membresía como la restricción del claim. La creación de grupos, la creación de códigos y las operaciones exclusivas del propietario exigirán una sesión normal, no una `groupSession`.

La lectura directa de `accessCodes` quedará bloqueada para sesiones de grupo. El backend seguirá teniendo acceso mediante Admin SDK.

## Compatibilidad con membresías existentes

- Si el miembro ya tiene `userId`, el token usará ese UID, pero los claims impedirán acceder a otros grupos asociados con la misma identidad.
- Si el miembro todavía está pendiente, se generará un UID estable a partir del grupo y el miembro, sin incorporar el correo en texto claro.
- El backend creará o reparará `userMemberships/{uid}` antes de entregar el token.
- El documento del propietario no cambiará. Si entra mediante código y correo, la sesión tendrá acceso de miembro, no de propietario.

## Límites de intentos

Se permitirán como máximo 10 intentos por IP y 5 intentos por correo dentro de una ventana de 10 minutos. Cada intento consume cuota antes de revelar el resultado. Al iniciar una ventana nueva, el contador se reemplaza; no se acumulan documentos por intento.

Cuando se exceda el límite, el endpoint responderá `429` con un mensaje genérico. La colección de límites no tendrá permisos de lectura ni escritura en reglas de cliente.

## Errores y respuestas

- `400`: cuerpo, código o correo con formato inválido.
- `401`: código y correo no corresponden a una membresía única.
- `405`: método distinto de `POST`.
- `429`: límite temporal alcanzado.
- `500` o `503`: configuración o dependencia interna no disponible.

Las respuestas nunca incluirán el estado de la invitación, IDs internos, trazas ni mensajes del Admin SDK.

## Configuración y despliegue

Se añadirá un archivo de ejemplo con los nombres de las variables requeridas y documentación para configurarlas en Vercel. La implementación local podrá probar el servicio con credenciales deliberadamente proporcionadas por el desarrollador, pero las pruebas automatizadas usarán dobles y no contactarán Firebase real.

La reescritura SPA de `vercel.json` deberá preservar `/api/*` para que las solicitudes alcancen la función antes de caer en `index.html`.

## Pruebas

- Pruebas unitarias de normalización, UID determinista y límites de intentos.
- Pruebas del servicio backend para código inexistente, correo no invitado, duplicado, miembro pendiente, miembro vinculado y error interno.
- Pruebas del handler para método, JSON inválido, cabeceras sin caché y mapeo de errores.
- Pruebas de `AuthGate` que confirmen que unirse no llama `sendMagicLink`, inicia sesión con el token y prepara la ruta del grupo.
- Pruebas de reglas para aislamiento del claim, prohibición de acceso cruzado y ausencia de privilegios de propietario.
- Verificación final con pruebas unitarias, emulador de reglas, lint, build y `git diff --check`.

## Riesgos aceptados

Quien conozca el código del grupo y el correo exacto de un miembro podrá acceder como ese miembro dentro de ese grupo. El aislamiento por claims, los límites de intentos y los mensajes genéricos reducen el impacto, pero no sustituyen la verificación de propiedad del correo.
