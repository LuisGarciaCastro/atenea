# Atenea

Un hub personal que se construye hablando con él. Es una app Next.js
(desplegada en Vercel, con Postgres en Neon) que reúne en un sitio:

- **Conocimiento**: vídeos de YouTube resumidos (resumen, highlights, temas y
  personas) y enlaces guardados.
- **Hucha**: gastos que mandas por Telegram o un Atajo de iOS y un agente
  categoriza cada hora.
- **Libros**, **Notas** (ideas, cosas por investigar, artículos) y **Tareas**.
- **Eventos**: mensajes como «cena el viernes a las 21» acaban en Google
  Calendar.
- **Coach de triatlón**: cada mañana y cada noche lee WHOOP y Garmin, calcula
  la carga y ajusta el plan.
- **Chat «Pregúntame»**: un orquestador con subagentes de finanzas, libros y
  deportes que responde sobre tus datos.

Y se amplía solo: le escribes a tu bot de Telegram, el bot abre un issue en tu
repo, [Claude Code](https://claude.com/claude-code) lo resuelve (commit o PR)
y te avisa por Telegram con botones para aprobar o rechazar el PR.

```
Telegram ──▶ /api/telegram-webhook ──▶ gasto · evento · issue de GitHub
                                                         │
                         GitHub Actions + Claude Code ◀──┘
                                    │
                    commit / PR ──▶ Vercel ──▶ aviso en Telegram (Aprobar / Rechazar)
```

## Empezar

Sigue **[docs/instalacion.md](docs/instalacion.md)**. Resumen:

1. **Use this template** → crea tu repo **privado** (tu hub guarda datos
   personales: no lo hagas público).
2. Impórtalo en Vercel, añade una base de datos Neon y pon `APP_PASSWORD` y
   `SESSION_SECRET`. Con eso ya funciona la app.
3. Añade, cuando quieras, el bot de Telegram, los agentes de Claude Code, el
   chat, Google Calendar, el coach (WHOOP + Garmin) y los vídeos.

Está en español (código incluido) y pensado para **una sola persona**: no hay
usuarios ni registro, solo una contraseña.

## Mapa del repo

```
app/                    Páginas y API (Next.js App Router)
  <modulo>/             Una carpeta por módulo: page.tsx + <Modulo>Client.tsx
    _components/        Subcomponentes solo de ese módulo
  components/ui/        Piezas del sistema de diseño: Marco, BarraPestanas, Hoja, Rincon,
                        captura rápida, chat, iconos, useDatos, useDialogo…
  api/<modulo>/         API de cada módulo (con sesión)
  api/<modulo>/cron/    API para workflows y agentes (token de servicio)
  api/telegram-webhook/ Relay de Telegram
lib/
  core/                 Transversal: db, api, sesion, autorizacion, secretos,
                        fechas, entorno, github, telegram
  <modulo>/tipos.ts     Tipos y constantes (importable desde el cliente)
  <modulo>/db.ts        Acceso a Postgres (solo servidor)
contenido/              Datos versionados que escribe el agente (guardados.json)
scripts/                Node (contenido, iconos) y Python (coach) de los workflows
.github/workflows/      Claude Code, crons de finanzas y eventos, vídeos, coach
.github/actions/        Acciones propias (aviso de fallo por Telegram)
.claude/skills/         Skills del agente versionadas con el repo
docs/                   Documentación detallada
middleware.ts           Pide sesión en toda la app salvo login, webhook y cron
```

## Documentación

- [docs/instalacion.md](docs/instalacion.md): montar tu propio hub paso a paso.
- [docs/modulos.md](docs/modulos.md): qué hace cada módulo, sus páginas, API y tablas.
- [docs/telegram.md](docs/telegram.md): el relay de Telegram y cómo registrar el webhook.
- [docs/automatizaciones.md](docs/automatizaciones.md): workflows de GitHub Actions y crons.
- [CLAUDE.md](CLAUDE.md): instrucciones para el agente que construye el repo.

## Diseño

Un solo sistema para todo el hub, Coach incluido: base limpia tipo Apple
(fondo gris claro, tarjetas blancas, fuente del sistema), cifras grandes al
estilo deportivo/finanzas y una serif solo para leer. Solo tema claro.

- **Tokens** en `:root` de `app/globals.css`: superficies y texto, estados,
  la seña de cada módulo (`--hucha`, `--libros`, `--ideas`, `--tareas`,
  `--coach` y sus `-soft`), categorías (`--cat-1…6`), radios (8/12/16/20/24),
  espaciado (rejilla de 4 px, `--space-*`), escala tipográfica (`--text-*`),
  sombras y duraciones. Los componentes usan siempre `var(--…)`, nunca
  colores, tamaños de letra ni fuentes sueltos.
- **Fuentes**: la del sistema (`--font-sans` / `--font-display`, SF Pro en
  Mac e iPhone) para todo, y Newsreader (`--font-read`) solo para títulos de
  libros, citas y highlights.
- **Color**: la acción principal es siempre tinta (`--text`). El color de
  módulo solo marca (icono, etiqueta, barra de progreso), nunca fondos
  enteros. El héroe del coach es negro con el lima `--coach`.
- **Navegación** (`app/components/ui/navegacion.ts`): Hoy, Coach, Hucha,
  Libros, Ideas y Notas siempre a la vista; en el iPhone, en la barra inferior;
  desde 768 px (iPad), en una barra lateral. La barra es solo para
  ir a sitios: nada de acciones en ella.
- **Acciones** (`<Acciones anadir="…">`): arriba a la derecha de cada
  pantalla, el chat y, si la pantalla crea algo, su «+», que abre directamente
  lo que toca (gasto en Hucha, libro en Libros, enlace en Ideas, elegir en Hoy).
- **Interacción**: tocar una fila abre su detalle (hoja) para editar o
  borrar; nada de «×» sueltas en cada fila. Borrar pide confirmación. Lo
  secundario se muestra al pedirlo (`<details>`, «Ver todo»), sin más de dos
  niveles. Las vistas que cambian la pantalla van en la URL (`?vista=`) para
  que «atrás» funcione.
- **Anatomía de cada pantalla**:
  1. `Cabecera`: barra con «‹ Volver» y acciones; contexto en gris (fecha,
     mes, semana) y título grande.
  2. Un héroe: lo importante de hoy en grande (cifra o tarjeta negra).
  3. Secciones con título de 22 px y «Ver todo» a la derecha (`comun.sec`).
  4. Listas agrupadas tipo Ajustes (`comun.list`): una tarjeta blanca y filas
     separadas por una línea.
  5. Segmentado para cambiar de vista dentro del módulo (`Segmentado`).
  6. Toques ≥ 44 px.
- **iPad**: el contenido es un contenedor (`container-type` en `Marco`, nombre
  `pagina`). Cada módulo reparte columnas con `@container pagina (min-width:
  720px)` según el ancho que le queda, no según el dispositivo. Las hojas y el
  chat pasan a ventanas centradas; las pantallas de lectura usan
  `comun.lectura` (760 px).
- **Piezas** en `app/components/ui/`:
  - `Marco`: la página con la barra inferior o lateral, la captura rápida y el chat.
  - `Acciones`: chat y «+» de la cabecera.
  - `Hoja`: hoja inferior modal (con `useDialogo`: foco, Escape y scroll).
  - `Rincon.tsx`: `Cabecera`, `ErrorCarga`, `Esqueleto` y `Vacio`.
  - `comun.module.css`: títulos, secciones, tarjetas, listas, segmentado,
    buscador, chips y botones.
  - `useDatos`: carga con reintento, `noEncontrado` y `mutar`; se refresca
    sola tras una captura rápida.
  - `iconos.tsx` (`T`), `fechas.ts`, `texto.ts` y `formulario.module.css`.
- **Coach**: usa las mismas piezas; `app/coach/coach.module.css` solo añade
  los colores de las disciplinas y estados (`--c-*`) y su héroe.

## Convenciones

- **Nombres en español** (código, archivos y mensajes), salvo los de Next
  (`page.tsx`, `route.ts`, `*Client.tsx`).
- **Componentes de cliente** importan solo de `lib/<modulo>/tipos.ts` o
  `calc.ts` (código puro), nunca de `db.ts`.
- **Imports**: `./` dentro de la misma carpeta, `@/` para el resto.
- **Base de datos**: cada `db.ts` usa `obtenerSql()` de `lib/core/db.ts` y
  crea sus tablas con `CREATE TABLE IF NOT EXISTS` en el primer acceso
  (`prepararEsquema`); no hay migraciones aparte. Fechas y horas, en
  `Europe/Madrid` con `lib/core/fechas.ts`.
- **Rutas de la API**: `conErrores(...)` (errores en JSON), `leerJson`,
  `idDeRuta`, `error(mensaje, status)` y validadores de `lib/core/api.ts`. Las
  respuestas de error son siempre `{ error }`; crear devuelve 201.
- **Rutas cron**: quedan fuera del middleware y se envuelven con
  `conToken("<MODULO>_CRON_SECRET", ...)` de `lib/core/autorizacion.ts`.
- **Módulo nuevo**: `lib/<modulo>/{tipos,db}.ts` + `app/api/<modulo>/` +
  `app/<modulo>/`, y una sección en `docs/modulos.md`.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # y rellena los valores
npm run dev
npm run check                # typecheck + lint
npm run format               # Prettier
```

## Variables de entorno

Están todas, comentadas, en [.env.example](.env.example): las de la app se
configuran en Vercel y las de los workflows en los secretos de GitHub Actions
(ver [docs/automatizaciones.md](docs/automatizaciones.md)). Los tokens de
servicio se generan con `openssl rand -hex 32`.

Obligatorias para arrancar: `APP_PASSWORD`, `SESSION_SECRET`, `DATABASE_URL`
y, para el bot, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` y
`TELEGRAM_WEBHOOK_SECRET`.

## Licencia

[MIT](LICENSE).

## Roadmap

- [ ] Tests automatizados del webhook de Telegram y de la capa de API.
- [ ] Fuentes de contenido más allá de YouTube (podcasts, artículos).
