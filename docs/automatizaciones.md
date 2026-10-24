# Automatizaciones

Todos los agentes usan `anthropics/claude-code-action` y se autentican con
`CLAUDE_CODE_OAUTH_TOKEN`. Las llamadas a la app usan `APP_BASE_URL` y el
`<MODULO>_CRON_SECRET` correspondiente.

Reglas de seguridad de los workflows:

- Las acciones van fijadas a un commit (`@<sha> # vN`); para actualizarlas,
  cambia el sha por el de la nueva versión.
- Solo disparan `claude.yml` y el despachador los issues y comentarios de
  `OWNER`/`MEMBER`/`COLLABORATOR` (el relay de Telegram abre los issues como
  el usuario).
- Los agentes que leen contenido de terceros (vídeos, sensaciones del chat)
  no tienen Bash libre ni secretos en su entorno: los vídeos solo pueden usar
  los scripts de `scripts/contenido/`, que leen los secretos de
  `.contenido/secretos.json` (lo escribe un paso previo y se borra siempre al
  terminar), y el coach solo `python3`; publicar lo hace un paso fijo.

| Workflow | Disparo | Qué hace |
| --- | --- | --- |
| `claude.yml` | Issue o comentario con `@claude` **sin** enlace de YouTube | Claude Code resuelve la petición siguiendo `CLAUDE.md` (commit a `main` o PR). |
| `conocimiento-despachador.yml` | Issue o comentario con `@claude` **y** enlace de YouTube | Si el Mac (runner self-hosted macOS/ARM64) está libre, lanza `conocimiento-video-mac.yml`; si no, procesa en la nube con `CONOCIMIENTO_ENTORNO=cloud`. |
| `conocimiento-video-mac.yml` | `workflow_dispatch` desde el despachador | Procesa el vídeo en el Mac siguiendo la skill `procesar-video-youtube`. |
| `finanzas-categorizar.yml` | Cron, cada hora (`:31`) | Categoriza los gastos pendientes vía `/api/finanzas/cron/*`. |
| `coach-diario.yml` | 10:00 y 22:00 de Madrid (cron a las 8, 9, 20 y 21 UTC con guarda por franja y cambio de hora) y manual | Recoge WHOOP y Garmin, calcula la carga y el agente aplica la skill `coach-triatlon` sobre el último `data.json`: por la mañana, veredicto y plan; por la noche, marca lo hecho y revisa mañana. Un paso fijo publica el `data.json`; solo avisa por Telegram si alguna fuente no ha dado datos. |
| `eventos-calendar.yml` | Cron, cada hora (`:31`) | Interpreta eventos pendientes y los crea o corrige en Google Calendar. |

## Secrets del repo

| Secret | Usado por |
| --- | --- |
| `CLAUDE_CODE_OAUTH_TOKEN` | Todos los agentes |
| `APP_BASE_URL` | Workflows que llaman a la app |
| `CONTENIDO_CRON_SECRET`, `YOUTUBE_API_KEY`, `SUPADATA_API_KEY` | Vídeos |
| `GH_RUNNERS_PAT` | Despachador (consulta si el runner del Mac está libre) |
| `FINANZAS_CRON_SECRET` | Finanzas |
| `EVENTOS_CRON_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` | Eventos |
| `COACH_CRON_SECRET`, `COACH_CREDENCIALES_SECRET`, `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`, `WHOOP_SESION_INICIAL`, `GARMIN_SESION_INICIAL` | Coach (las sesiones iniciales solo se usan hasta que hay una guardada en el hub) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Notificaciones del agente |

## Scripts

- `scripts/contenido/obtener-metadatos.mjs <youtube_id> [<salida.json>]`:
  metadatos vía YouTube Data API.
- `scripts/contenido/obtener-transcripcion.mjs <youtube_id> [<salida.json>]`:
  transcripción con youtube-transcript-plus y, si falla, Supadata. En la nube
  salta directamente a Supadata.
- `scripts/contenido/api.mjs`: crea, guarda o marca con error un vídeo,
  consulta el catálogo y avisa por Telegram leyendo los datos de archivos,
  para que el texto de un vídeo nunca pase por la línea de comandos.
- `scripts/generate-icons.mjs`: regenera los iconos de `public/icons/`.
