# Relay de Telegram

`app/api/telegram-webhook/route.ts` recibe los updates del bot.

- Solo acepta peticiones con la cabecera `X-Telegram-Bot-Api-Secret-Token`
  igual a `TELEGRAM_WEBHOOK_SECRET`; sin esa variable rechaza todo (401).
- Solo atiende al chat `TELEGRAM_CHAT_ID`; sin esa variable tampoco atiende a
  nadie. El resto de chats se ignora.
- Responde siempre 200 una vez aceptada la petición, aunque algo falle (el
  error queda en los logs de Vercel): si no, Telegram reenvía el mensaje y se
  duplicarían gastos o issues.

## Mensajes de texto

Se evalúan en este orden y gana el primero que encaja:

1. **Corrección** `#<id> …`: si tiene forma de corrección de gasto
   (`#12 Restaurantes 20`) y existe ese gasto, actualiza su categoría e
   importe; si no, y existe el evento, guarda la corrección para el agente.
   Los ids de gastos y eventos se solapan, por eso decide la forma del texto.
2. **Respuesta a un mensaje del bot** que empieza por `#<número>:` (formato
   de los mensajes del agente) o enlaza `issues/<número>`: comenta
   `@claude <texto>` en ese issue para continuar la conversación. Un `#12`
   suelto, como en «Gasto #12 corregido», no cuenta.
3. **Evento** (`lib/eventos/heuristica.ts`): lo deja pendiente de interpretar.
4. **Gasto** (`lib/finanzas/heuristica.ts`): lo deja pendiente de categorizar.
5. **Cualquier otra cosa**: abre un issue nuevo con `@claude <texto>`, que
   dispara Claude Code (ver [automatizaciones.md](automatizaciones.md)).

## Botones

`callback_data` con formato `approve:<PR>:<sha>` o `reject:<PR>`: "Aprobar"
mergea el PR y "Rechazar" lo cierra sin mergear. Después se edita el mensaje
original con el resultado. `<sha>` (opcional, 7-40 caracteres hex) es el
commit que se avisó: si el PR ha recibido commits después, no se mergea. Solo
se mergean PRs de ramas de este repo contra `main`. Al mergear se cierran los
issues vinculados por el nombre de la rama (`issue-<N>`) o por
`Closes/Fixes/Resolves #<N>` en el título o la descripción; una mención suelta
no cierra nada.

Cada `update_id` se procesa una sola vez (`lib/core/frenos.ts`): si Telegram
reenvía una actualización porque la respuesta tardó, no se duplica nada.

## Registrar el webhook

Una sola vez (o al cambiar el secreto), con el **dominio de producción**: la
URL de cada despliegue (`$VERCEL_URL`) cambia y el webhook dejaría de llegar.

```bash
APP_BASE_URL=https://<tu-dominio>   # el mismo que el secreto APP_BASE_URL de GitHub
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "'"${APP_BASE_URL%/}"'/api/telegram-webhook",
    "secret_token": "'"$TELEGRAM_WEBHOOK_SECRET"'"
  }'
```

`TELEGRAM_WEBHOOK_SECRET` tiene que ser el mismo valor que en Vercel. Para
comprobarlo:

```bash
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"
```

En local, el endpoint queda en `http://localhost:3000/api/telegram-webhook`;
para recibir updates reales hay que exponerlo (por ejemplo con `ngrok`) y
registrar esa URL.
