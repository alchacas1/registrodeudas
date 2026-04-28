# DeudaTrack

Aplicación web para gestionar deudas entre grupos de familia, amigos, conocidos y más.

## Características

- **Grupos** con tipos: Familia, Amigos, Conocidos, Otros
- **Código de acceso** único por grupo para compartir
- **Miembros** con avatares con colores únicos generados automáticamente
- **Deudas**: deudor → prestamista, monto, motivo, fecha
- **Monedas**: CRC (₡), USD ($), EUR (€)
- **Pagos parciales** con barra de progreso
- **Resumen de balance** neto por miembro con gráfico de barras
- **Filtros** por estado y miembro

## Requisitos

- Node.js 18+
- npm

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

Abre http://localhost:3000

## Producción

```bash
npm run build
npm start
```

## Estructura del proyecto

```
deudas-app/
├── src/
│   ├── index.ts       # Servidor Express
│   ├── routes.ts      # API REST
│   ├── store.ts       # Persistencia de datos
│   └── types.ts       # Interfaces TypeScript
├── public/
│   ├── index.html     # SPA frontend
│   ├── css/style.css  # Estilos
│   └── js/app.js      # Lógica frontend
├── tsconfig.json
└── package.json
```

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/groups | Crear grupo |
| GET | /api/groups | Listar grupos |
| GET | /api/groups/:id | Obtener grupo con balances |
| POST | /api/groups/join | Unirse por código |
| POST | /api/groups/:id/members | Agregar miembro |
| DELETE | /api/groups/:id/members/:memberId | Eliminar miembro |
| POST | /api/groups/:id/debts | Registrar deuda |
| PATCH | /api/groups/:id/debts/:debtId | Actualizar pago |
| DELETE | /api/groups/:id/debts/:debtId | Eliminar deuda |
