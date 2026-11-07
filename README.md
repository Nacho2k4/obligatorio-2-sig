# SIG — Obligatorio 2 (2026)

Aplicación geográfica con ArcGIS Maps SDK for JavaScript 5.x que simula un móvil recorriendo una ruta en EE. UU. y analiza su entorno (buffer, condados interceptados, población ponderada).

## Requisitos

- Node ≥ 20.19

## Uso

```bash
npm install
cp .env.example .env   # completar VITE_ARCGIS_API_KEY (necesaria para geocoding y ruteo)
npm run dev            # servidor de desarrollo
npm run build          # chequeo de tipos + build de producción
npm run lint           # ESLint
npm run test           # tests (Vitest)
```

## Estructura

```
src/
  contracts/contracts.ts   # contrato RutaGuardada / EventoParada (A produce, B consume)
  mocks/                   # ruta de prueba (solo desarrollo)
  shared/                  # compartido entre ambas mitades
    config.ts              # URLs de servicios y API key
    store.ts               # store global (Zustand): rutaActiva, setRutaActiva
    map/                   # componente del mapa, registro de capas y vista activa
  modules/
    persona-a/             # eventos (geocoding, ABM) y rutas (ruteo, guardado, PDF)
    persona-b/             # simulación, simbología y análisis espacial
docs/
```

### Integración entre módulos

- Para activar una ruta: `useAppStore.getState().setRutaActiva(ruta)` (o el hook `useAppStore`). `ruta.geometria` es obligatoria (polilínea WGS84).
- Las capas gráficas del mapa están en `src/shared/map/capas.ts` (hay una capa `eventos` reservada para Persona A). Se crean una sola vez; no recrearlas en renders.
- La vista activa (para `goTo`, impresión, etc.) se obtiene con `obtenerVista()` de `src/shared/map/vista.ts`.
