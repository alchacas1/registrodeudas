# Plan de Reestructuración — `registrodeudas`

## Contexto

El proyecto tiene **dos capas mezcladas**:

- **App moderna** → React + Vite + Supabase (`src/App.tsx`, `src/lib/*`)
- **App legacy** → JS vanilla + Express (`public/js/app.js`, `src/routes.tsx`, `src/index.tsx`)

El objetivo es consolidar todo en la app moderna y eliminar/archivar el código legacy.

---

## Paso 1 — Auditar y mapear lo que existe

Antes de mover o borrar cualquier cosa, documentar el estado actual.

- [ ] Revisar `src/index.tsx` y `src/routes.tsx`: confirmar si el servidor Express llega a correr o es código muerto
- [ ] Revisar `public/js/app.js`: identificar qué funciones **no existen** aún en `src/App.tsx`
- [ ] Revisar `src/data/promt.md`: entender si es documentación activa o un borrador temporal
- [ ] Crear una tabla de equivalencias:

  | Legacy (`public/` o `src/routes.tsx`) | Moderno (`src/App.tsx` / `src/lib/`) | Estado |
  |---|---|---|
  | `generateCode` en routes | `generateCode` en db.ts | Duplicado |
  | `computeSummaries` en routes | `computeSummaries` en App.tsx | Duplicado |
  | Ruta `POST /api/groups` | `createGroup` en db.ts | Reemplazado |
  | `app.js` → render de grupos | `GroupPage()` en App.tsx | Reemplazado |
  | … | … | … |

---

## Paso 2 — Limpiar `src/`: separar App moderna de restos legacy

El directorio `src/` mezcla la app React con rutas Express. Hay que separarlos.

- [ ] Mover `src/routes.tsx` → `_legacy/routes.tsx` (fuera del build)
- [ ] Mover `src/index.tsx` → `_legacy/index.tsx`
- [ ] Verificar que `vite.config.ts` no incluye estas rutas en el bundle
- [ ] Confirmar que `src/main.tsx` es el único entry point que usa React

> ⚠️ No borrar aún; mover a `_legacy/` por si hay lógica que no migró.

---

## Paso 3 — Limpiar `public/`: purgar assets legacy o documentarlos

La carpeta `public/` en un proyecto Vite es para assets estáticos. Actualmente tiene una mini-app completa.

- [ ] Mover `public/js/app.js` → `_legacy/public/js/app.js`
- [ ] Mover `public/css/style.css` y `style.src.css` → `_legacy/public/css/`
- [ ] Mover `public/index.html` → `_legacy/public/index.html`
- [ ] Dejar `public/` limpio; solo debe tener el favicon u otros assets estáticos que Vite sirva directamente

---

## Paso 4 — Consolidar lógica duplicada en `src/lib/`

Hay funciones que existen tanto en el legacy como en la app moderna.

- [ ] **`generateCode`**: ya está en `src/lib/db.ts` — eliminar la copia de `routes.tsx`
- [ ] **`computeSummaries`**: está en `src/App.tsx` como función interna — evaluar si debe moverse a `src/lib/utils.ts` para reutilizarla y testearla
- [ ] **`getAvatarColor` / `avatarColors`**: existen en ambos lados — unificar en `src/lib/utils.ts`
- [ ] Crear `src/lib/utils.ts` con funciones puras compartidas:
  - `computeSummaries`
  - `computeDebtBetween`
  - `avatarColors`
  - `currencySymbol`
  - `fmt`

---

## Paso 5 — Separar componentes de `src/App.tsx`

`src/App.tsx` actualmente contiene todo: lógica, UI, componentes, rutas. Hay que dividirlo.

Estructura propuesta:

```
src/
├─ components/
│  ├─ Avatar.tsx
│  ├─ Btn.tsx
│  ├─ Input.tsx
│  ├─ StyledSelect.tsx
│  └─ KpiCard.tsx
├─ pages/
│  ├─ Home.tsx
│  └─ GroupPage.tsx
├─ lib/
│  ├─ auth.ts
│  ├─ db.ts
│  ├─ supabase.ts
│  └─ utils.ts      ← nuevo
├─ App.tsx           ← solo rutas
├─ main.tsx
├─ routes.tsx        ← solo definición de rutas React (react-router)
├─ types.ts          ← renombrar types.tsx → types.ts (no usa JSX)
└─ index.css
```

Pasos concretos:

- [ ] Extraer `Avatar`, `Btn`, `Input`, `StyledSelect`, `KpiCard` a `src/components/`
- [ ] Extraer `Home()` a `src/pages/Home.tsx`
- [ ] Extraer `GroupPage()` a `src/pages/GroupPage.tsx`
- [ ] Dejar `src/App.tsx` solo con el setup de rutas (`<Routes>`)
- [ ] Renombrar `src/types.tsx` → `src/types.ts`

---

## Paso 6 — Revisar y limpiar configuración

- [ ] Revisar `tailwind.config.js` vs `tailwind.public.config.js`: el segundo probablemente era para el build legacy — confirmar si se puede eliminar
- [ ] Revisar `vercel.json`: asegurar que las rutas apuntan al build de Vite (`dist/`) y no al servidor Express
- [ ] Revisar `package.json`: limpiar dependencias que solo usaba el stack Express (ej. `express`, `cors`, etc.) si ya no se usan
- [ ] Confirmar que `.env` tiene solo variables `VITE_*` (Supabase); eliminar variables del servidor Express si las hay

---

## Paso 7 — Archivar o eliminar `_legacy/`

Una vez confirmado que la app moderna funciona correctamente end-to-end:

- [ ] Hacer un commit con el tag `pre-cleanup` antes de borrar
- [ ] Eliminar la carpeta `_legacy/`
- [ ] Eliminar dependencias Express del `package.json` si no se borraron en el paso anterior

---

## Resultado esperado

```
registrodeudas/
├─ index.html
├─ package.json
├─ vite.config.ts
├─ vercel.json
├─ tailwind.config.js
├─ public/              ← solo favicon y assets estáticos
└─ src/
   ├─ App.tsx           ← solo rutas
   ├─ main.tsx
   ├─ index.css
   ├─ types.ts
   ├─ components/
   │  ├─ Avatar.tsx
   │  ├─ Btn.tsx
   │  ├─ Input.tsx
   │  ├─ StyledSelect.tsx
   │  └─ KpiCard.tsx
   ├─ pages/
   │  ├─ Home.tsx
   │  └─ GroupPage.tsx
   └─ lib/
      ├─ auth.ts
      ├─ db.ts
      ├─ supabase.ts
      └─ utils.ts
```

---

## Orden recomendado de ejecución

| Prioridad | Paso | Riesgo |
|---|---|---|
| 1 | Paso 1 (auditoría) | Sin riesgo |
| 2 | Paso 2 (limpiar src/) | Bajo |
| 3 | Paso 3 (limpiar public/) | Bajo |
| 4 | Paso 6 (config) | Medio |
| 5 | Paso 4 (consolidar lib/) | Medio |
| 6 | Paso 5 (separar App.tsx) | Alto — hacer con tests o revisión manual |
| 7 | Paso 7 (borrar legacy) | Irreversible — hacer al final |
