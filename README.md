# RutaTiendas

App web **mobile-first** para planificar y ejecutar rutas de entrega a tiendas, con dos roles:

- **Administrador** (`/admin`, login con email/contraseña): crea choferes, arma el catálogo de
  tiendas, arma rutas y les asigna un chofer, sigue el progreso casi en tiempo real, y carga el
  pedido de cada tienda (monto en bolivianos, partidas y hasta 3 fotos).
- **Chofer** (`/`, sin cuenta): ingresa el código de 6 caracteres de su ruta y la ejecuta
  tienda por tienda — la navegación la hace Google Maps y la app registra llegada, observación,
  entrega y puede agregar fotos del pedido (hasta el mismo tope de 3, nunca borra).

El backend es [Supabase](https://supabase.com) (Postgres + Auth + Storage), con seguridad a nivel de
fila (RLS): un administrador ve y edita todo; un chofer solo ve la ruta que canjeó con su código, y
nunca puede tocar el monto del pedido ni borrar nada de verdad — "eliminar" en toda la app es borrado
lógico (`deleted_at`/`deleted_by`), pensado para poder auditar más adelante. El diseño completo
(modelo de datos, políticas RLS, decisiones tomadas) está en [`docs/PLAN_V2.md`](docs/PLAN_V2.md).

## Cómo correrla

Requisitos: Node.js 22.12+ (o 24+) y un proyecto de Supabase con el esquema de
[`docs/PLAN_V2.md`](docs/PLAN_V2.md) ya aplicado (tablas, RLS, funciones, bucket `pedidos`).

```bash
npm install
npm run dev
```

Abre <http://localhost:3000> para la app del chofer, o <http://localhost:3000/admin> para
administración.

A diferencia del MVP original (v1), v2 **sí necesita variables de entorno** para conectarse a
Supabase; sin ellas, tanto `/admin` como la app del chofer fallan al arrancar. Van en un archivo
`.env.local` (no se commitea) con estos nombres — los valores los da el proyecto de Supabase, en
**Project Settings → API**:

| Variable | Dónde se usa |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente y servidor |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Cliente y servidor (clave pública) |
| `SUPABASE_SECRET_KEY` | **Solo servidor** — nunca debe llevar el prefijo `NEXT_PUBLIC_` |
| `SUPABASE_JWKS_URL` | Solo servidor |

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest |
| `npm run check` | lint + typecheck + test + build (debe pasar antes de cada commit) |

### Probarla desde el celular antes de desplegar

Con el celular en la misma wifi que la PC: `npm run build` y luego `npm start`, y abre
`http://IP-DE-TU-PC:3000` en el celular (el servidor de desarrollo de Next bloquea por seguridad los
orígenes que no sean `localhost`). El GPS del navegador solo funciona en HTTPS o en `localhost`; por
`http://IP…` la ubicación aparece como "no disponible" — para probar con GPS real, despliega en
Vercel.

## Cómo usarla

### Administrador

1. Entra a `/admin` con tu email y contraseña (el primer administrador se invita desde el proyecto de
   Supabase; desde ahí, cualquier administrador activo puede invitar a otros por email).
2. En **Choferes** das de alta a cada repartidor (nombre, teléfono opcional).
3. En **Administradores** invitas a otros administradores o les quitas el acceso (borrado lógico:
   nunca se borra su fila, solo deja de poder entrar).
4. Creas una **ruta nueva**: eliges o agregas tiendas (del catálogo, por link de Google Maps, o
   pegando una lista de texto) y, opcionalmente, un chofer. Al confirmar queda en borrador con un
   **código de 6 caracteres**.
5. **Activas** la ruta y le pasas el código al chofer (botón "Copiar"). Mientras está activa, la
   pantalla de detalle se actualiza sola (cada ~12 s) mostrando qué tienda está "Entregando" o ya
   "Entregada".
6. En cualquier momento (antes o durante la ruta) puedes cargar el **pedido** de cada tienda: un
   monto en bolivianos, partidas (descripción + cantidad opcional, independientes del monto) y hasta
   3 fotos — se guarda quién subió cada una.
7. **Finalizas** la ruta cuando el chofer terminó, o la **cancelas** si hace falta.

### Chofer

1. Abre la app (`/`) en el navegador del celular — sin instalar nada ni crear cuenta.
2. Ingresa el **código de 6 caracteres** que le pasó el administrador. Un código de una ruta que
   todavía no está activa, o inventado, muestra un mensaje claro en vez de romper la pantalla.
3. Ejecuta la ruta tienda por tienda: **Ir con Google Maps** abre la navegación; al acercarse
   (≤ 120 m) la app pasa sola a "Entregando", o se usa **Ya llegué**.
4. Al llegar, ve el pedido de esa tienda (monto/partidas si los cargó el administrador) y puede
   **agregar una foto** (hasta 3 entre las que suba él y las que suba el administrador; nunca puede
   borrar ninguna).
5. Escribe una observación si hace falta y toca **Entregado**. La app ofrece la siguiente tienda.
6. Si se corta la señal en medio de una acción, la app no la pierde: reintenta sola y avisa mientras
   sigue intentando (ver "Límites conocidos" más abajo).

El botón/gesto **atrás** del celular cierra la pantalla abierta (no sale de la app). El ícono de la
cabecera cambia el tema: automático, claro u oscuro.

## Desplegar en Vercel

1. Sube el repositorio a GitHub/GitLab/Bitbucket.
2. En <https://vercel.com/new> importa el repo. Vercel detecta Next.js.
3. En **Settings → Environment Variables** carga las cuatro variables de la tabla de arriba con los
   valores reales del proyecto de Supabase (mismos nombres, ninguna adicional).
4. En el proyecto de Supabase, activa **Authentication → Sign In / Providers → Anonymous Sign-Ins**
   (necesario para que un chofer pueda entrar con su código: usa una sesión anónima de Supabase Auth)
   y, si quieres, **Authentication → Providers → Email → Leaked Password Protection** para el login
   de administrador. Ninguno de los dos se puede activar por migración SQL, son ajustes del panel.
5. Despliega. `/admin` es para el equipo; la URL raíz (`/`) es la que usa el chofer desde el celular.

## Privacidad

Los datos de rutas, tiendas, pedidos y fotos viven en el proyecto de Supabase del equipo (Postgres +
Storage), no en el navegador. Lo que sale de la app:

| Dato | A dónde | Para qué |
| --- | --- | --- |
| Email/contraseña del administrador | Supabase Auth | Iniciar sesión |
| Código de 6 caracteres + sesión anónima del chofer | `POST /api/routes/claim` (tu propio backend) → Supabase | Darle acceso solo a su ruta activa |
| Tiendas, pedidos (monto/partidas), fotos | Supabase (Postgres + Storage, bucket privado) | Guardar y mostrar el trabajo del equipo |
| El link de Google Maps pegado al agregar una tienda | Tu propio backend (`/api/resolve-link`), que lo sigue **solo** hacia dominios de Google Maps | Obtener las coordenadas |
| Texto del lugar, solo si el link no trae coordenadas | Nominatim (OpenStreetMap), desde el servidor | Geocodificación de respaldo |
| Coordenadas de las tiendas y del punto de partida | OSRM público (`router.project-osrm.org`) | Calcular ruta y tiempos |
| Teselas del mapa que miras | `tile.openstreetmap.org` | Dibujar el mapa |
| Destino de la tienda | Google Maps, al tocar *Ir con Google Maps* | Navegación |

No hay analítica ni cookies propias fuera de la sesión de Supabase Auth.

## Arquitectura

```
src/
  app/
    admin/(dashboard)/   pantallas de administrador (rutas, choferes, admins), protegidas por sesión
    admin/login/         login de administrador
    api/                 resolve-link, approx-location, admins/invite, routes/claim
  components/
    admin/                UI de administración (pedido, detalle de ruta, etc.)
    chofer/                UI de ejecución del chofer (contra Supabase)
    map/ stops/ route/     UI de v1 (Leaflet, formularios); parte se reusa desde admin/chofer
    ui/                    piezas compartidas (Sheet, Button, Banner, TextField, …)
  features/
    admins/ drivers/ stores/ routes/    capa de datos de Supabase (Zod valida cada fila)
    route/                              dominio compartido chofer/v1 (reductor, mapa, geolocalización)
    stops/ delivery/                    lógica de v1 reusada donde el modelo coincide
  lib/
    supabase/    clientes de navegador/servidor/admin, esquemas Zod compartidos
    http/        límite de intentos del canje de código, reintentos con backoff
    geo/ routing/ storage/    parseo de links, ruteo (OSRM), estado local (settings/tema)
  types/         tipos de dominio y tipos generados de Supabase (`supabase.ts`)
docs/            PRD, ROADMAP, BUENAS_PRACTICAS, DECISIONS, PLAN_V2 (diseño completo de v2)
```

La lógica de negocio son funciones puras con tests (`npm run test`); los componentes solo orquestan.
Las decisiones técnicas están en [`docs/DECISIONS.md`](docs/DECISIONS.md); el diseño completo de v2
(modelo de datos, RLS, decisiones abiertas ya resueltas) en [`docs/PLAN_V2.md`](docs/PLAN_V2.md).

## Límites conocidos de v2

- **"Anonymous Sign-Ins" y "Leaked Password Protection" se activan a mano en el dashboard de
  Supabase**, no hay forma de aplicarlos por migración SQL (ver "Desplegar en Vercel").
- **Seguimiento del administrador por sondeo (~12 s), no instantáneo.** Se eligió a propósito para no
  mantener una conexión abierta; un cambio del chofer puede tardar hasta ese margen en reflejarse.
- **Reintentos del chofer ante un corte de señal son deliberadamente simples**: no distinguen "sin
  red" de un rechazo legítimo del servidor (p. ej. la ruta ya no está activa); si algo queda
  reintentando sin éxito, un `Banner` lo avisa en pantalla, nunca falla en silencio. Las fotos que
  quedan pendientes de subir se guardan solo en memoria de esa pestaña (no en `localStorage`, un
  archivo no se puede volcar ahí sin re-trabajo) y se pierden si se cierra la pestaña antes de
  reconectar.
- **Total y partidas del pedido son independientes**: no se valida que la suma de las partidas
  coincida con el monto total (decisión explícita, ver `docs/DECISIONS.md`).
- **Sin pantalla de "papelera"/auditoría**: el borrado lógico ya guarda quién y cuándo borró cada
  fila, pero todavía no hay una pantalla para revisarlo.
- **Una sola sesión de chofer por código a la vez** (el código da acceso mientras la ruta sigue
  activa; si el administrador la finaliza o cancela, el acceso se corta al momento).
- **OSRM público es "best effort"**: sin garantía de disponibilidad. Si no responde, la ruta se
  dibuja con líneas rectas y tiempos estimados ("Ruta aproximada").
- **Optimización de ruta**: exacta hasta 9 tiendas pendientes; con más, una heurística muy buena pero
  no garantizada óptima. Camino abierto, sin regreso a la base ni ventanas horarias.
- **Llegada automática** solo se detecta con la app visible (no hay seguimiento en segundo plano).
- **Nominatim** se limita a 1 consulta por segundo por instancia del servidor.
