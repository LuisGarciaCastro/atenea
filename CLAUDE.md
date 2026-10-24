# Hub personal — Instrucciones del proyecto

Este repo es el hub personal del usuario: un espacio que va creciendo por partes
(notas de conocimiento, tracking de libros, y lo que se añada más adelante),
construido y ampliado a través de un agente orquestador accesible por
Telegram. Incluye frontend propio (Next.js, desplegado en Vercel) cuando la
funcionalidad lo requiere — por ejemplo, el relay de Telegram o futuros
visores/paneles.

## Cómo se construye este proyecto

- Las peticiones llegan como issues de GitHub, la mayoría creados
  automáticamente por el relay de Telegram cuando el usuario le escribe al bot.
- Si la tarea es pequeña (una nota, un ajuste menor), comitea directo a
  `main`.
- Si la tarea es más grande (código nuevo, una funcionalidad), crea una rama
  y abre un Pull Request de verdad con `gh pr create` — no dejes solo el
  enlace de "Create PR".
- Todo PR debe referenciar el issue que resuelve con una palabra clave que
  GitHub reconozca para auto-cerrar (`Closes #<número>`, `Fixes #<número>` o
  `Resolves #<número>`) — nunca uses solo `Refs #<número>` o una mención
  suelta, porque GitHub no las trata como cierre automático. Así, al mergear
  el PR (ya sea manualmente en GitHub o con el botón "Aprobar" de Telegram),
  el issue se marca como completado sin pasos extra.
- Si el usuario pide explícitamente un plan antes de construir ("dame el plan, no
  implementes todavía"), respétalo: responde con el plan y detente ahí, sin
  escribir código, hasta recibir confirmación en un comentario posterior del
  mismo issue.

## Estructura y convenciones

Antes de tocar código, lee el mapa del repo y las convenciones del
`README.md`, y la ficha del módulo en `docs/modulos.md`. En resumen:

- `lib/<modulo>/tipos.ts` (tipos y constantes, importable desde el cliente)
  y `lib/<modulo>/db.ts` (Postgres, solo servidor); lo transversal va en
  `lib/core/`.
- `app/<modulo>/` con `page.tsx` + `<Modulo>Client.tsx`, y los subcomponentes
  en `app/<modulo>/_components/`.
- Imports con `./` dentro de la misma carpeta y `@/` para el resto.
- Antes de commitear código, `npm run check` (typecheck + lint) debe pasar.
- Diseño: un solo sistema para todo el hub (Coach incluido). Usa solo los
  tokens de `app/globals.css` (nada de hex, px de color ni fuentes sueltas) y
  las piezas de `app/components/ui/` (`Cabecera`, `Hoja`, `ErrorCarga`,
  `Esqueleto`, `Vacio`, `Segmentado`, `comun.module.css`,
  `formulario.module.css`, `Acciones`) antes de crear componentes nuevos. Cada
  pantalla sigue la misma anatomía (título grande, un héroe, secciones y
  listas agrupadas) y las mismas reglas de interacción: la barra solo navega,
  las acciones van en la cabecera, tocar una fila abre su detalle. Tiene que
  verse bien en iPhone y en iPad (`@container pagina`). Ver la sección
  «Diseño» del README.
- Si añades o cambias un módulo, actualiza `docs/modulos.md`.

## Capacidades ya construidas (consulta la skill correspondiente para el detalle)

- **Vídeos de YouTube**: ver skill `procesar-video-youtube`
  (`.claude/skills/`) — extrae metadatos y transcripción, redacta resumen,
  highlights, temas y personas, y lo guarda en la base de datos vía
  `/api/contenido/cron/*`.
- **Guardar enlaces sin procesar**: ver skill `guardar-enlace` — añade la URL a
  `contenido/guardados.json` y comitea a `main`.
- **Notas en Ideas**: ideas, cosas por investigar y artículos, creadas desde
  la app (ver «Notas» en `docs/modulos.md`).
- **Relay de Telegram**: `app/api/telegram-webhook/route.ts` — ver
  `docs/telegram.md`.
- **Coach de triatlón**: skill `coach-triatlon` y workflow `coach-diario.yml`;
  ver la sección «Coach» de `docs/modulos.md`.
- **Chat «Pregúntame»**: orquestador + subagentes de finanzas, libros y
  deportes; ver la sección «Chat» de `docs/modulos.md`.
- **Tareas, finanzas y eventos desde Telegram**: ver `docs/modulos.md` y
  `docs/automatizaciones.md`.

## Notificación saliente a Telegram

Cada vez que termines una tarea (código implementado, PR abierto, revisión
completada, pregunta respondida, etc.), manda un mensaje a la API de Telegram
usando las variables de entorno `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` (ya
disponibles en este entorno) con un resumen breve de lo hecho.

Si la tarea generó un PR, incluye dos botones inline "Aprobar" y "Rechazar"
cuyo `callback_data` sea `approve:<numero-de-pr>:<sha>` y `reject:<numero-de-pr>`
respectivamente (el número de PR sin la URL completa, y en «Aprobar» los 12
primeros caracteres del último commit del PR, `git rev-parse --short=12 HEAD`,
para que no se mergee nada que llegue después del aviso). El webhook en
`/api/telegram-webhook` es quien procesa esos botones: "Aprobar" mergea el PR
y "Rechazar" lo cierra sin mergear.

Si la tarea no generó un PR (por ejemplo, solo respondiste una pregunta o
hiciste una revisión), manda el resumen sin botones.

Ejemplo de la petición a la API de Telegram:

```bash
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "'"$TELEGRAM_CHAT_ID"'",
    "text": "<resumen de lo hecho>",
    "reply_markup": {
      "inline_keyboard": [[
        {"text": "Aprobar", "callback_data": "approve:<numero-de-pr>:<sha>"},
        {"text": "Rechazar", "callback_data": "reject:<numero-de-pr>"}
      ]]
    }
  }'
```

## Menciona siempre el número de issue en tus mensajes a Telegram

Cada mensaje que mandes a Telegram (resúmenes, planes, preguntas) debe incluir
el número de issue actual al principio, en formato `#<número>: <resto del
mensaje>`. Esto permite que, si el usuario responde a ese mensaje desde Telegram, la
conversación se pueda continuar en el mismo issue.
