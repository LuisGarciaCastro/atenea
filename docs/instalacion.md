# Instalación

Guía para montar tu propio Atenea desde cero. El núcleo (app, base de datos y
contraseña) funciona en unos 15 minutos; cada pieza extra (Telegram, agentes,
calendario, coach, vídeos) se añade cuando quieras y es independiente del
resto.

| Pieza | Necesitas | Obligatoria |
| --- | --- | --- |
| [1. Tu repo](#1-tu-repo-privado) | Cuenta de GitHub | Sí |
| [2. App y base de datos](#2-app-y-base-de-datos-vercel--neon) | Cuenta de Vercel (gratis) | Sí |
| [3. Bot de Telegram](#3-bot-de-telegram) | Telegram | No, pero es la forma principal de usar el hub |
| [4. Agentes de Claude Code](#4-agentes-de-claude-code-github-actions) | Suscripción a Claude (Pro o Max) | No, pero sin ellos no se categorizan gastos, ni se procesan vídeos, ni se amplía el hub desde Telegram |
| [5. Chat «Pregúntame»](#5-chat-pregúntame) | API key de Anthropic | No |
| [6. Google Calendar](#6-google-calendar-eventos) | Proyecto de Google Cloud | No |
| [7. Coach de triatlón](#7-coach-de-triatlón-whoop--garmin) | WHOOP y Garmin | No |
| [8. Vídeos de YouTube](#8-vídeos-de-youtube) | API key de YouTube y de Supadata | No |

> Los tokens de servicio aleatorios se generan siempre con
> `openssl rand -hex 32`. Usa uno distinto para cada variable.

## 1. Tu repo privado

1. Pulsa **Use this template → Create a new repository** en este repo y
   márcalo como **Private**. Tu hub va a guardar datos personales: el texto
   de lo que mandas por Telegram acaba en issues, los enlaces guardados en
   `contenido/guardados.json` y tu perfil de atleta en la skill del coach.
   **No lo hagas público.**
2. Clónalo y prepara el entorno local:

   ```bash
   git clone https://github.com/<tu-usuario>/<tu-repo>.git
   cd <tu-repo>
   npm install
   cp .env.example .env.local
   ```

3. Personaliza lo básico:
   - `NEXT_PUBLIC_NOMBRE` en `.env.local` (y luego en Vercel): el nombre con
     el que te saluda la app. Opcional.
   - Zona horaria: por defecto `Europe/Madrid`. Si vives en otra, cámbiala en
     `lib/core/fechas.ts` (`ZONA`), en `scripts/coach/*.py` (`TZ`) y en los
     crons y prompts de `.github/workflows/` (`grep -rn Madrid`).
   - `CLAUDE.md` describe cómo trabaja el agente. Ajústalo si quieres otras
     reglas (por ejemplo, que nunca comitee directo a `main`).

## 2. App y base de datos (Vercel + Neon)

1. En [Vercel](https://vercel.com/new), importa tu repo. El framework
   (Next.js) se detecta solo.
2. En el proyecto de Vercel: **Storage → Create Database → Neon (Postgres)**
   y conéctala al proyecto. Vercel crea `DATABASE_URL` solo. Las tablas se
   crean solas en el primer acceso de cada módulo; no hay migraciones.
3. En **Settings → Environment Variables**, añade como mínimo:
   - `APP_PASSWORD`: la contraseña con la que entras (no hay usuarios).
   - `SESSION_SECRET`: un valor aleatorio largo.
   - `NEXT_PUBLIC_NOMBRE` (opcional) y `NEXT_PUBLIC_CONTACTO_PRIVACIDAD`
     (opcional; solo hace falta si vas a conectar Google Calendar, que pide
     una página de privacidad con contacto: `/privacidad`).
4. Despliega. Apunta el dominio de producción
   (`https://<tu-proyecto>.vercel.app` o el tuyo): es tu `APP_BASE_URL`.
5. Para trabajar en local, copia `DATABASE_URL` en `.env.local` (o usa
   `vercel env pull .env.local`) y arranca con `npm run dev`.

Con esto ya tienes Libros, Notas, Tareas, la hucha (gastos a mano desde el
«+») y la sección de Conocimiento.

## 3. Bot de Telegram

1. Habla con [@BotFather](https://t.me/BotFather), crea un bot con `/newbot`
   y copia el token: `TELEGRAM_BOT_TOKEN`.
2. Escríbele cualquier cosa a tu bot y saca tu chat id:

   ```bash
   curl -s "https://api.telegram.org/bot<TOKEN>/getUpdates" | grep -o '"chat":{"id":[0-9-]*'
   ```

   Ese número es `TELEGRAM_CHAT_ID`. El bot solo atiende a ese chat e ignora
   el resto: nadie más puede usar tu hub aunque encuentre el bot.
3. Genera `TELEGRAM_WEBHOOK_SECRET` (aleatorio).
4. Crea un [token fine-grained de GitHub](https://github.com/settings/personal-access-tokens/new)
   con acceso **solo a tu repo** y permisos *Issues*, *Pull requests*,
   *Contents* y *Actions* en *Read and write*: `GITHUB_TOKEN`. Pon
   `GITHUB_REPOSITORY=<tu-usuario>/<tu-repo>`.
5. Añade las cinco variables en Vercel, vuelve a desplegar y registra el
   webhook como explica [telegram.md](telegram.md#registrar-el-webhook).

> El botón «Aprobar» de Telegram mergea PRs con `GITHUB_TOKEN`. Para mergear
> PRs que cambien `.github/workflows/`, GitHub exige además el permiso
> *Workflows*; si no se lo das, esos PRs mergéalos a mano.

## 4. Agentes de Claude Code (GitHub Actions)

Los workflows de `.github/workflows/` usan
[`anthropics/claude-code-action`](https://github.com/anthropics/claude-code-action).

1. Instala la app de Claude en tu repo: desde [Claude Code](https://claude.com/claude-code),
   ejecuta `/install-github-app` o instálala desde
   [github.com/apps/claude](https://github.com/apps/claude).
2. Genera el token con `claude setup-token` y guárdalo como secreto del repo
   `CLAUDE_CODE_OAUTH_TOKEN` (**Settings → Secrets and variables →
   Actions**).
3. Añade también estos secretos:
   - `APP_BASE_URL`: el dominio de producción del paso 2.
   - `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID`: para los avisos.
   - `FINANZAS_CRON_SECRET`, `EVENTOS_CRON_SECRET`, `CONTENIDO_CRON_SECRET`,
     `COACH_CRON_SECRET`: los mismos valores que en Vercel (genera uno por
     módulo y ponlo en los dos sitios).
4. Si no vas a usar un módulo, desactiva su workflow en la pestaña
   **Actions** para que no gaste minutos (por ejemplo, `coach-diario.yml` y
   `eventos-calendar.yml`).

Prueba: manda «@claude añade una frase al README» a tu bot. Debe abrir un
issue, ejecutar el agente y avisarte por Telegram.

Solo disparan los agentes los issues y comentarios del dueño del repo o de
sus colaboradores (`author_association`), así que nadie de fuera puede gastar
tu suscripción. Más detalle en [automatizaciones.md](automatizaciones.md).

## 5. Chat «Pregúntame»

Crea una API key en [console.anthropic.com](https://console.anthropic.com) y
ponla en Vercel como `ANTHROPIC_API_KEY`. El chat se paga por uso en esa
cuenta, aparte de la suscripción de los agentes.

## 6. Google Calendar (eventos)

Los mensajes de Telegram que parecen un evento («cena con Ana el viernes a
las 21») se crean en tu calendario principal.

1. En [Google Cloud Console](https://console.cloud.google.com), crea un
   proyecto, activa la **Google Calendar API** y configura la pantalla de
   consentimiento (tipo *External*, con tu cuenta como usuario de prueba; la
   URL de privacidad es `<APP_BASE_URL>/privacidad`).
2. Crea unas credenciales **OAuth client ID** de tipo *Web application* con
   `https://developers.google.com/oauthplayground` como URI de redirección:
   `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.
3. En el [OAuth Playground](https://developers.google.com/oauthplayground),
   activa *Use your own OAuth credentials* (rueda de arriba a la derecha),
   autoriza el scope `https://www.googleapis.com/auth/calendar.events` y
   cambia el código por tokens: el *refresh token* es `GOOGLE_REFRESH_TOKEN`.
4. Guarda los tres como secretos del repo.

> Con la app en modo *Testing*, Google caduca el refresh token a los 7 días.
> Publícala (*Publish app*) para que no caduque; para uso propio no hace
> falta pasar la verificación.

## 7. Coach de triatlón (WHOOP + Garmin)

El coach está pensado para WHOOP (recuperación y sueño, 24 h) y Garmin
(detalle de cada entreno). Todo es de solo lectura: no hay formularios.

1. **Tu perfil**: rellena la sección 1 de
   [`.claude/skills/coach-triatlon/SKILL.md`](../.claude/skills/coach-triatlon/SKILL.md)
   (objetivo, fecha de la carrera, disponibilidad, material, historial,
   lesiones). Lo que dejes vacío, el coach te lo preguntará en vez de
   inventarlo.
2. **WHOOP**: crea una app en el
   [WHOOP Developer Dashboard](https://developer-dashboard.whoop.com) con
   `http://localhost:8765/callback` como redirect URI. Guarda
   `WHOOP_CLIENT_ID` y `WHOOP_CLIENT_SECRET` como secretos del repo y haz el
   login inicial (necesita [`gh`](https://cli.github.com) autenticado):

   ```bash
   python3 scripts/coach/whoop_login.py
   ```

3. **Garmin**:

   ```bash
   python3 -m pip install -r scripts/coach/requirements.txt
   python3 scripts/coach/garmin_login.py
   ```

   Los dos scripts guardan la sesión en los secretos `WHOOP_SESION_INICIAL`
   y `GARMIN_SESION_INICIAL` sin mostrarla. Solo se usan la primera vez:
   después la tarea guarda las sesiones renovadas en tu base de datos.
4. Genera `COACH_CREDENCIALES_SECRET` y ponlo en Vercel y en los secretos del
   repo (junto con `COACH_CRON_SECRET`).
5. Lanza **Actions → coach-diario → Run workflow** con *forzar* activado. La
   primera vez parte de `scripts/coach/data-inicial.json`, un ejemplo
   inventado que solo sirve de esquema.

## 8. Vídeos de YouTube

Manda un enlace de YouTube al bot y el agente guarda resumen, highlights,
temas y personas en la sección Conocimiento.

- `YOUTUBE_API_KEY`: una API key de
  [YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com).
- `SUPADATA_API_KEY`: de [supadata.ai](https://supadata.ai). Hace falta para
  las transcripciones en la nube, porque YouTube bloquea las IPs de los
  runners de GitHub.
- `CONTENIDO_CRON_SECRET` (en Vercel y en los secretos del repo).

**Opcional: runner en tu Mac.** Si registras un
[runner self-hosted](https://docs.github.com/actions/hosting-your-own-runners)
macOS/ARM64 en tu repo y creas `GH_RUNNERS_PAT` (token fine-grained con
*Administration: Read*), el despachador procesa los vídeos en tu Mac cuando
está libre, con transcripción directa y sin gastar Supadata. Sin él, todo va
a la nube. Usa un runner self-hosted **solo en un repo privado**.

## 9. Atajos de iOS (opcional)

Dos rutas aceptan peticiones sin sesión con `Authorization: Bearer <token>`:

- `POST /api/gastos/directo` con `{"texto": "12,50 Mercadona"}`
  (`GASTOS_DIRECTO_SECRET`). Útil en una automatización de la app Atajos al
  pagar con Apple Pay.
- `POST /api/notas/directo` con `{"titulo": "…", "texto": "…", "tipo": "idea"}`
  (`NOTAS_DIRECTO_SECRET`; `tipo` es `idea`, `investigar` o `articulo`).

## Mantener tu copia al día

Tu repo es independiente de este. Para traer mejoras:

```bash
git remote add upstream https://github.com/<repo-plantilla>.git
git fetch upstream
git merge upstream/main --allow-unrelated-histories   # solo la primera vez
```

Revisa los conflictos en `CLAUDE.md` y en la skill del coach, que son los
archivos que más personalizarás.
