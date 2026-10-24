import { NextRequest, NextResponse } from "next/server";
import { cerrarPr, comentarIssue, crearIssueDesdeTelegram, mergearPr } from "@/lib/core/github";
import { chatAutorizado, editarMensaje, enviarMensaje, responderBoton } from "@/lib/core/telegram";
import { secretoIgual } from "@/lib/core/secretos";
import { primeraVezActualizacion } from "@/lib/core/frenos";
import { error } from "@/lib/core/api";
import { actualizarGasto, crearGastoPendiente, obtenerGasto } from "@/lib/finanzas/db";
import { esGastoProbable, leerCorreccionGasto } from "@/lib/finanzas/heuristica";
import { crearEventoPendiente, guardarCorreccionEvento, obtenerEvento } from "@/lib/eventos/db";
import { esEventoProbable, leerCorreccionEvento } from "@/lib/eventos/heuristica";

interface MensajeTelegram {
  chat: { id: number };
  text?: string;
  from?: { username?: string };
  reply_to_message?: { text?: string };
}

interface ActualizacionTelegram {
  update_id?: number;
  message?: MensajeTelegram;
  callback_query?: {
    id: string;
    data?: string;
    message?: { chat: { id: number }; message_id: number; text?: string };
  };
}

/**
 * Issue al que responde el usuario: los mensajes del agente empiezan por «#N:» (CLAUDE.md) y los del
 * relay traen el enlace «issues/N». Un «#N» suelto (p. ej. «Gasto #12 corregido») no cuenta.
 */
function issueRespondido(texto: string | undefined): number | undefined {
  const m = texto?.match(/^#(\d+):|issues\/(\d+)/);
  const numero = m?.[1] ?? m?.[2];
  return numero ? Number(numero) : undefined;
}

/**
 * «#<id> …» corrige un gasto o un evento. Los ids de las dos tablas se solapan, así que solo se
 * trata como gasto si tiene forma de corrección de gasto («#12 Restaurantes 20») y existe ese gasto;
 * si no, se prueba como evento.
 */
async function manejarCorreccion(chatId: number, texto: string): Promise<boolean> {
  const generica = leerCorreccionEvento(texto);
  if (!generica) return false;

  const deGasto = leerCorreccionGasto(texto);
  if (deGasto && (await obtenerGasto(deGasto.id))) {
    const actualizado = await actualizarGasto(deGasto.id, { categoria: deGasto.categoria, importe: deGasto.importe });
    const importe = actualizado?.importe != null ? `${actualizado.importe}€` : "sin importe";
    await enviarMensaje(chatId, `✅ Gasto #${deGasto.id} corregido: ${deGasto.categoria} · ${importe}`);
    return true;
  }

  if (await obtenerEvento(generica.id)) {
    await guardarCorreccionEvento(generica.id, generica.texto);
    await enviarMensaje(chatId, `✅ Corrección anotada para el evento #${generica.id}, se aplica en la próxima pasada`);
    return true;
  }

  await enviarMensaje(chatId, `❌ No encuentro el registro #${generica.id}.`);
  return true;
}

async function manejarTexto(mensaje: MensajeTelegram & { text: string }) {
  const { chat, text: texto, from } = mensaje;
  if (await manejarCorreccion(chat.id, texto)) return;

  const issue = issueRespondido(mensaje.reply_to_message?.text);
  if (issue) {
    const res = await comentarIssue(issue, texto, from?.username);
    if (res.ok) {
      await enviarMensaje(chat.id, `✅ Añadido al issue #${issue}: ${(await res.json()).html_url}`);
    } else {
      console.error("Error comentando en el issue:", await res.text());
      await enviarMensaje(chat.id, "❌ No se pudo comentar en el issue en GitHub.");
    }
    return;
  }

  if (esEventoProbable(texto)) {
    await crearEventoPendiente(texto);
    await enviarMensaje(chat.id, "✅ Evento registrado, pendiente de interpretar");
    return;
  }

  if (esGastoProbable(texto)) {
    await crearGastoPendiente(texto);
    await enviarMensaje(chat.id, "✅ Gasto registrado, pendiente de categorizar");
    return;
  }

  const res = await crearIssueDesdeTelegram(texto, from?.username);
  if (res.ok) {
    const nuevo = await res.json();
    await enviarMensaje(chat.id, `✅ Issue #${nuevo.number} creado: ${nuevo.html_url}`);
  } else {
    console.error("Error creando issue:", await res.text());
    await enviarMensaje(chat.id, "❌ No se pudo crear el issue en GitHub.");
  }
}

/** Mensaje legible de una respuesta de error: el `message` del JSON de GitHub o el texto tal cual. */
function motivoError(cuerpo: string): string {
  try {
    const { message } = JSON.parse(cuerpo) as { message?: string };
    if (message) return message;
  } catch {
    // No era JSON: es el texto de las comprobaciones de mergearPr.
  }
  return cuerpo.slice(0, 150);
}

/**
 * Botones «Aprobar» / «Rechazar» con `approve:<PR>` / `reject:<PR>`. Si el aviso trae el commit
 * revisado (`approve:<PR>:<sha>`), solo se mergea si el PR sigue en ese commit.
 */
async function manejarBoton(boton: NonNullable<ActualizacionTelegram["callback_query"]>) {
  const [accion, numeroTexto, sha] = (boton.data ?? "").split(":");
  const numero = Number(numeroTexto);
  if (
    !Number.isInteger(numero) ||
    numero <= 0 ||
    (accion !== "approve" && accion !== "reject") ||
    (sha !== undefined && !/^[0-9a-f]{7,40}$/i.test(sha))
  ) {
    await responderBoton(boton.id, "Botón no válido", true);
    return;
  }

  const aprobar = accion === "approve";
  const res = aprobar ? await mergearPr(numero, sha) : await cerrarPr(numero);
  // El motivo (de GitHub o de las comprobaciones de mergearPr) va también al aviso de Telegram.
  const motivo = res.ok ? "" : motivoError(await res.text());
  if (!res.ok) console.error(`Error al ${aprobar ? "mergear" : "cerrar"} el PR #${numero}: ${res.status} ${motivo}`);

  const estado = aprobar
    ? res.ok
      ? "✅ Aprobado y mergeado"
      : "⚠️ Error al mergear"
    : res.ok
      ? "❌ Rechazado y cerrado"
      : "⚠️ Error al cerrar";
  await responderBoton(
    boton.id,
    res.ok ? `PR #${numero}: ${estado}` : `Error al procesar el PR #${numero}: ${motivo}`.slice(0, 200),
    !res.ok
  );
  // Si falla, el mensaje conserva los botones para poder reintentarlo.
  if (boton.message && res.ok) {
    await editarMensaje(boton.message.chat.id, boton.message.message_id, `${boton.message.text ?? ""}\n\n${estado}`);
  }
}

export async function POST(request: NextRequest) {
  // Sin secreto o sin chat configurado no se acepta nada: cualquiera podría mergear PRs.
  const secreto = process.env.TELEGRAM_WEBHOOK_SECRET;
  const cabecera = request.headers.get("x-telegram-bot-api-secret-token");
  if (!secreto || !process.env.TELEGRAM_CHAT_ID || !cabecera || !(await secretoIgual(cabecera, secreto))) {
    return error("No autorizado", 401);
  }

  const actualizacion = (await request.json().catch(() => null)) as ActualizacionTelegram | null;
  if (!actualizacion) return error("JSON no válido", 400);

  try {
    if (typeof actualizacion.update_id === "number" && !(await primeraVezActualizacion(actualizacion.update_id))) {
      return NextResponse.json({ ok: true });
    }
    const { message: mensaje, callback_query: boton } = actualizacion;
    if (mensaje?.text && chatAutorizado(mensaje.chat.id)) {
      await manejarTexto(mensaje as MensajeTelegram & { text: string });
    } else if (boton) {
      if (chatAutorizado(boton.message?.chat.id)) await manejarBoton(boton);
      else await responderBoton(boton.id, "No autorizado", true);
    }
  } catch (e) {
    // Siempre 200: con un error Telegram reenvía la actualización y se duplicaría lo ya creado.
    console.error("Error procesando la actualización de Telegram:", e);
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, mensaje: "Webhook de Telegram activo" });
}
