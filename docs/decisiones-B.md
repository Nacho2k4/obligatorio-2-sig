# Decisiones de diseño — Persona B

Registro de decisiones tomadas ante ambigüedades o desvíos respecto del plan original.

## Etapa 1 — Scaffold

| # | Decisión | Motivo |
|---|---|---|
| 1 | **Vitest 4.1** en lugar de 5.x | Vitest 5 requiere Node ≥ 22.12; el entorno de desarrollo tiene Node 20.20. |
| 2 | **TypeScript 6.0** en lugar de 7.0 | TS 7 es el compilador nativo (Go) recién publicado; 6.0 es la línea estable con mejor compatibilidad de tooling. |
| 3 | `@arcgis/map-components` en `^5.1.27`, igual que `@arcgis/core` en el repo | Esri los publica en lockstep; deben coincidir en versión. |
| 4 | Estado global con **Zustand** (`src/shared/store.ts`), agregado al scaffold existente | Un solo store; los servicios pueden leerlo sin hooks (`useAppStore.getState()`). |
| 5 | Capas gráficas como **singletons de módulo** (`src/shared/map/capas.ts`) y un único `Map` compartido (`obtenerMapa()`) | Se crean una sola vez y se actualizan por referencia; el mismo `Map` sirve para `<arcgis-map>` y `<arcgis-scene>` (vista 3D opcional). |
| 6 | La vista activa se publica en `src/shared/map/vista.ts` (`registrarVista`/`obtenerVista`) | Los servicios hacen `goTo` sin depender del componente React ni del tipo de vista. |
| 7 | La `MapView` no se guarda en el store de Zustand | Es un objeto mutable grande del SDK; meterlo en estado reactivo provoca renders innecesarios. |
| 8 | Ninguna capa define `minScale`/`maxScale` | La letra pide que ruta, buffer y condados sean visibles a toda escala. |
| 9 | Tests en entorno `node` (sin jsdom) | `Polyline` y los operadores de geometría funcionan en Node; los tests son de lógica pura. |
| 10 | Tipos JSX de los web components vía `/// <reference types="@arcgis/map-components/types/react" />` y el equivalente de Calcite en `src/vite-env.d.ts` | Es el mecanismo que exponen los paquetes 5.x instalados. |

## APIs verificadas en el SDK instalado (5.1.27)

- `@arcgis/core/geometry/Polyline.js` — ruta del import del contrato sin cambios.
- `@arcgis/core/rest/geometryService.js` → `buffer(url, BufferParameters, requestOptions?)` e `intersect(...)`; `requestOptions` admite `signal`.
- `@arcgis/core/geometry/operators/geodeticDensifyOperator.js` → `execute(geometry, maxSegmentLength, options?)`; requiere `load()`.
- `@arcgis/core/geometry/operators/geodeticAreaOperator.js` → `execute(geometry, options?)`; requiere `load()`.
- `@arcgis/core/geometry/operators/geodeticLengthOperator.js`, `containsOperator.js` disponibles.
- `<arcgis-map>`: propiedades `map`, `center`, `zoom`, `view`, `ready`; evento `arcgisViewReadyChange` (`onarcgisViewReadyChange` en React).

## Integración con el scaffold de Persona A (repo `obligatorio-2-sig`)

El repo ya tenía un scaffold de Persona A. Se adoptó su estructura y se integró lo de B:

| # | Decisión | Motivo |
|---|---|---|
| 11 | Se respeta la estructura existente: `src/contracts/`, `src/mocks/`, `src/modules/persona-a/`; lo de B va en `src/modules/persona-b/` y lo compartido en `src/shared/` | Evitar reorganizar el trabajo del compañero. |
| 12 | `RutaGuardada.geometria` pasa de opcional a **obligatoria**; `EventoParada.objectId` queda opcional | La simulación no puede recorrer una ruta sin polilínea, y Trails guarda polilíneas; un evento recién geocodificado puede no tener objectId. **Pendiente de confirmar con Persona A.** |
| 13 | `src/mocks/mockRuta.ts` reutiliza id, nombre y paradas de `mockRuta.json` y agrega la geometría I-35 | El JSON no tenía geometría; las coordenadas de Dallas, OKC y Wichita se toman del JSON para que las paradas caigan sobre la ruta. |
| 14 | `App.tsx` (MapView en `useEffect`) se reemplaza por el layout Calcite con `<arcgis-map>` | El prompt exige `<arcgis-map>`; además el basemap estaba como capa operacional con `http://`. Ahora es un `Basemap` custom con `TileLayer` por `https`. |
| 15 | Se agrega `"strict": true` y `resolveJsonModule` a `tsconfig.app.json` | Strict lo pide el stack; JSON para importar el mock. |
| 16 | Se eliminan restos del template de Vite (`App.css`, `src/assets/*`, `public/icons.svg`) y se reescribe `index.css` y el README | No se usaban. |
| 17 | En `geocodingService.ts` (stub de A) se agrega `void address;` | El stub rompía `npm run build` y `npm run lint` por parámetro sin usar. Cambio mínimo, a reemplazar cuando A lo implemente. |
| 18 | Se conservan ESLint, `@types/node` y la configuración de Persona A | Ya estaban; `npm run lint` pasa sin errores. |
