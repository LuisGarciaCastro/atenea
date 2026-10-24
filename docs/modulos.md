# Módulos

Cada módulo sigue el mismo patrón: `app/<modulo>/` (páginas),
`app/api/<modulo>/` (API) y `lib/<modulo>/` (tipos y acceso a datos). Las
tablas se crean solas en el primer acceso (`CREATE TABLE IF NOT EXISTS` en
`asegurarEsquema` de cada `db.ts`).

## Hoy

- `/` (`app/page.tsx` + `InicioClient.tsx`): el entreno de hoy (y el de
  mañana), la Hucha del mes, el libro que estás leyendo y la última idea.
- **Captura rápida**: el «+» de la cabecera de cada pantalla abre una hoja para
  apuntar un gasto, un libro (búsqueda en
  Open Library) o un enlace (`app/components/ui/captura/`). En Hoy deja elegir;
  en el resto abre directamente lo que toca.
- `/panel` ya no existe: sus datos están repartidos en Hoy, Libros e Ideas y
  la ruta redirige a `/`.

## Conocimiento (contenido)

«El cuaderno»: vídeos de YouTube procesados por el agente (resumen,
highlights, transcripción, temas y personas) y enlaces guardados, mostrados
como papelitos con buscador y filtros Todo · Vídeos · Temas · Personas ·
Guardados.

- **Páginas**: `/contenido` (con `?ver=temas|personas|guardados` para abrir
  con ese filtro), `/contenido/videos/[youtubeId]`, `/contenido/temas/[slug]`,
  `/contenido/personas/[slug]` y `/contenido/guardados`.
- **API**: `GET /api/contenido/{videos,temas,personas}` (+ detalle por slug o
  id), `GET /api/contenido/buscar?q=`.
- **API cron** (`CONTENIDO_CRON_SECRET`): `POST /api/contenido/cron/videos`
  (alta en estado `pendiente`), `PATCH /api/contenido/cron/videos/[id]`
  (resultado o error), `GET /api/contenido/cron/catalogo`.
- **lib/contenido/**: `tipos`, `schema` (tablas), `videos`, `procesamiento`
  (guardado del resultado del agente, temas/personas, relaciones), `temas`,
  `personas`, `catalogo`, `busqueda`.
- **Tablas**: `videos`, `transcripcion_segmentos`, `highlights`, `temas`,
  `personas`, `video_temas`, `video_personas`, `tema_relaciones`.
- **Cómo entra un vídeo**: ver skill
  [`procesar-video-youtube`](../.claude/skills/procesar-video-youtube/SKILL.md)
  y [automatizaciones.md](automatizaciones.md).

## Guardados

Enlaces guardados sin procesar (X, artículos…), visibles en
`/contenido/guardados`.

- **API**: `GET/POST /api/guardados`, `DELETE /api/guardados/[id]`.
- **Origen desde el agente**: la skill
  [`guardar-enlace`](../.claude/skills/guardar-enlace/SKILL.md) añade la URL
  a `contenido/guardados.json`; `lib/guardados/db.ts` la importa a la tabla
  `guardados` en el siguiente acceso.
- **Borrado**: lógico (`borrado_en`), para que la importación del JSON no
  devuelva un enlace borrado. Volver a guardar la misma URL lo recupera.

## Notas

Ideas, cosas por investigar y artículos por escribir del usuario, en la sección
«Notas» (`/notas`, en la barra de navegación). Sustituye a las antiguas
listas de tareas, que se eliminaron; la tabla `notas` es la misma de antes.

- **Componentes**: `app/notas/_components/VistaNotas.tsx` (filtro por
  tipo, pendientes y hechas) y `HojaNota.tsx` (crear, editar, marcar hecha,
  borrar).
- **API** (con sesión): `GET/POST /api/notas`, `PATCH/DELETE /api/notas/[id]`
  (`tipo`, `titulo`, `texto` —`null` lo vacía— y `hecha`).
- **API directa** (`NOTAS_DIRECTO_SECRET`): `POST /api/notas/directo`
  (`titulo`, `texto` opcional y `tipo`, por defecto `idea`).
- **Tabla**: `notas` (`tipo` ∈ `idea | investigar | articulo`).

## Libros

«La estantería»: lomos de color sobre una balda, filtrados por estado
(`leyendo`, `quiero_leer`, `leido`), con ficha en hoja inferior para el
progreso de páginas, empezar a leer, valorar o quitar. Objetivo anual: 12.

- **Página**: `/libros`.
- **API**: `GET /api/libros/buscar?q=` (proxy a Open Library),
  `GET/POST /api/libros`, `PATCH/DELETE /api/libros/[id]`.
- **Tabla**: `libros`. Al pasar a `leyendo` se fija `fecha_inicio` para
  calcular el ritmo de lectura.

## Finanzas

«La hucha»: gastos registrados desde Telegram, un Atajo de iOS o el «+» de la app,
categorizados por un agente cada hora si llegan sin categoría. En Hucha, el «+» de la
cabecera abre directamente «Nuevo gasto».

- **Páginas**: `/finanzas` (tocar un movimiento abre su hoja para corregir
  importe, concepto o categoría, o borrarlo) y `/finanzas/avanzado`.
- **API**: `GET/POST /api/finanzas` (POST: gasto apuntado con sesión; con
  categoría queda categorizado, sin ella pendiente), `PATCH/DELETE /api/finanzas/[id]`,
  `POST /api/gastos/directo` (Atajo de iOS, `GASTOS_DIRECTO_SECRET`).
- **API cron** (`FINANZAS_CRON_SECRET`): `GET /api/finanzas/cron/pendientes`,
  `PATCH /api/finanzas/cron/[id]`.
- **lib/finanzas/**: `tipos` (categorías cerradas, `normalizarCategoria`),
  `db`, `calc` (agregados puros que usan las páginas), `heuristica`
  (detección de gastos y de correcciones `#<id> <categoría> [importe]`).
- **Tabla**: `gastos`.

## Eventos

Eventos de calendario dictados por Telegram; un agente los interpreta y los
crea en Google Calendar. No tiene página propia.

- **API cron** (`EVENTOS_CRON_SECRET`): `GET /api/eventos/cron/pendientes`,
  `PATCH /api/eventos/cron/[id]`.
- **Correcciones**: un mensaje `#<id> <texto>` sobre un evento se guarda en
  `correccion_pendiente` y se aplica en la siguiente pasada del agente. El
  agente devuelve en el PATCH la `correccion_procesada`: si mientras tanto ha
  llegado otra, esa se queda pendiente para la pasada siguiente.
- **Tabla**: `eventos_pendientes`.

## Coach

Coach de triatlón del usuario (objetivo y perfil del atleta en la sección 1 de la skill `coach-triatlon`). A las 10:00 y a las
22:00 el workflow `coach-diario.yml` genera un `data.json` con el veredicto, el plan y
el cuaderno del atleta (ver [automatizaciones.md](automatizaciones.md)).

- **Página**: `/coach`, con el sistema de diseño común (colores de disciplina en
  `app/coach/coach.module.css`) y un segmentado Hoy (entreno de hoy, el de mañana,
  recuperación, totales de la semana, racha y frase del día), Semana (con flechas
  para ver la semana siguiente del plan) y Progreso; Recuperación, Entrenos,
  Forma y fatiga y Cuaderno como vistas secundarias. La vista va en la URL
  (`/coach?vista=semana`), así que «atrás» funciona. Hoy abre con la tarjeta del
  entreno de hoy.
- **Solo lectura**: no hay formularios; todo sale de Garmin y WHOOP.
- **API**: `GET /api/coach` (último día).
- **API cron** (`COACH_CRON_SECRET`): `GET/POST /api/coach/cron` (leer el de
  ayer y publicar el de hoy). Con su propio secreto, `COACH_CREDENCIALES_SECRET`,
  `GET/PUT /api/coach/cron/credenciales/[whoop|garmin]` (sesiones de la nube:
  ambos rotan el refresh token en cada uso); solo lo tiene el paso que recoge
  los datos, no el agente.
- **Scripts** (`scripts/coach/`): `recoger_datos.py` (WHOOP API v2 y Garmin con
  `garminconnect`), `carga_whoop.py` (CTL/ATL/TSB, ACWR, banda de HRV; fórmula
  fija de la skill) y los logins iniciales `whoop_login.py` y `garmin_login.py`.
- **Skill**: [`coach-triatlon`](../.claude/skills/coach-triatlon/SKILL.md).
- **Tablas**: `coach_dias` (un `data.json` por fecha) y `coach_credenciales`.

## Chat «Pregúntame»

Botón flotante en todas las páginas (`app/components/ui/chat/`) que abre un
chat sobre tus datos. Además de responder, apunta lo que le cuentes: cada cambio
aparece como una tarjeta «Hecho» con su botón **Deshacer**.

- **Orquestador** (`lib/chat/orquestador.ts`): Claude con tres herramientas,
  `preguntar_finanzas`, `preguntar_libros` y `preguntar_deportes`; puede
  consultar varias a la vez y redacta la respuesta en streaming.
- **Subagentes** (`lib/chat/subagentes.ts`): cada uno es otra llamada a Claude
  con su prompt y sus herramientas de lectura: gastos y resumen mensual;
  estantería; último informe del coach por secciones e histórico de informes.
- **Escritura** (solo cuando el mensaje literal del usuario lo pide o afirma un
  hecho; cada subagente lo recibe entre `<mensaje_del_usuario>`, aparte del encargo
  del orquestador, y ni ese encargo ni lo leído en internet autorizan cambios):
  libros (añadir
  desde Open Library, estado, página, valoración), finanzas (apuntar gasto) y
  deportes (`contar_al_coach`: se apunta en `cuaderno.sensaciones` con fuente
  `chat` y, si afecta a hoy, lanza `coach-diario.yml` con `forzar` para rehacer
  el plan si no hay ya una revisión en marcha; el `GITHUB_TOKEN` necesita
  permiso «Actions: write»). Límites: gastos de hasta 5.000 €, textos acotados
  y portadas solo de `covers.openlibrary.org`. Cada cambio se guarda en
  `chat_acciones` con su inversa y el mensaje en que se hizo (`mensaje_id`),
  así que reaparece con su «Deshacer» al reabrir la conversación;
  `POST /api/chat/acciones/[id]/deshacer` lo revierte (no revierte un plan ya
  rehecho por el coach, ni un libro que se ha vuelto a tocar después).
- **Internet**: orquestador y subagentes tienen `web_search_20260209`
  (máx. 5 búsquedas por agente y turno; el orquestador reanuda los `pause_turn`
  sin gastar vuelta y en los subagentes lo hace el runner del SDK). Los datos de
  el usuario salen siempre de sus herramientas, nunca de internet.
- **Límites**: 6 vueltas del orquestador, 6 iteraciones por subagente, dos
  encargos al mismo especialista van en serie, y la respuesta se corta a los
  270 s (antes del `maxDuration` de 300 s) guardando lo que haya. Un subagente
  que no termina (`stop_reason` distinto de `end_turn`) cuenta como error. El
  prompt de sistema y las herramientas se cachean.
- **Recomendaciones de libros**: el subagente de libros recomienda según el
  historial y valoraciones, comprueba cada título en Open Library y solo lo
  añade si el usuario lo pide.
- **Modelo**: `claude-sonnet-5-5` en todo (effort `medium` el orquestador,
  `low` los subagentes), con `fallbacks: "default"` por si un clasificador
  rechaza una petición.
- **API** (con sesión): `POST /api/chat` (`{ mensaje, conversacionId? }`,
  responde NDJSON: `conversacion`, `agente`, `accion`, `texto`, `recorte`, `fin`, `error`),
  `GET /api/chat/conversaciones` y `GET/DELETE /api/chat/conversaciones/[id]`.
- **Tablas**: `chat_conversaciones` y `chat_mensajes` (solo el texto de cada
  turno; el historial se reenvía como texto, últimos 20 mensajes, empezando
  siempre por uno del usuario) y `chat_acciones`.

## Acceso

- `middleware.ts` exige la cookie de sesión de `/login` en todo excepto
  `/login`, `/privacidad`, el webhook, las rutas `cron`, `/api/gastos/directo`,
  `/api/notas/directo`, `manifest.json` e iconos. Una página sin sesión redirige a `/login`; una
  llamada a `/api/*` sin sesión recibe `401 { error }`.
- La sesión es un token firmado con `SESSION_SECRET` (`lib/core/sesion.ts`)
  que caduca a los 30 días; la contraseña (`APP_PASSWORD`) solo se usa al
  entrar. Tras 10 fallos en 15 minutos desde la misma IP el login se bloquea
  (`lib/core/frenos.ts`, tabla `intentos_login`).
- `next.config.ts` añade cabeceras de seguridad (no se puede embeber en
  iframes, `nosniff`, `Referrer-Policy: same-origin`).
- Las rutas `cron`, `/api/gastos/directo` y `/api/notas/directo` piden `Authorization: Bearer
  <token del módulo>` (`conToken`, `lib/core/autorizacion.ts`). Todos los
  secretos se comparan en tiempo constante (`lib/core/secretos.ts`).
