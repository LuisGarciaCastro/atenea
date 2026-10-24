---
name: guardar-enlace
description: Guarda un enlace (X, artículo, etc.) en la tabla de guardados del hub sin procesarlo. Úsala cuando el usuario diga "guárdame esto" o "guarda este enlace" sin pedir procesarlo. Los enlaces de YouTube no llegan aquí: el despachador los manda siempre a procesar-video-youtube.
---

El agente no tiene `DATABASE_URL` ni `CONTENIDO_CRON_SECRET`, así que **no** uses la API. En su lugar:

1. Añade un objeto al array de `contenido/guardados.json`:
   `{ "url": "...", "titulo": "...", "autor": "...", "nota": "...", "issue_number": <n> }`
   (`titulo`, `autor` y `nota` son opcionales; no inventes datos que no tengas).
2. Si la URL ya está en el fichero, no la dupliques.
3. Comitea directo a `main` (es una tarea pequeña).
4. El hub importa los enlaces nuevos a la tabla `guardados` al abrir `/contenido/guardados` tras el despliegue.
5. Avisa a Telegram según CLAUDE.md, sin botones.
