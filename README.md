# Frontend

SPA de QuieroUnSMS. Next.js (App Router, renderizado en el cliente), Tailwind, shadcn/ui y TanStack Query. Los SMS entran por Socket.io y la bandeja se actualiza al momento.

## Arranque

Con la API en `http://localhost:4000`:

```bash
cp .env.example .env.local
npm install
npm run dev
```

Abre `http://localhost:3000`. Elige un servicio, un número libre y pulsa **Recibir SMS**. El código aparece solo a los pocos segundos.

La página principal carga el inbox con `ssr: false`, así que los datos se piden siempre desde el navegador.
