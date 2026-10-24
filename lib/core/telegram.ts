import { requerir } from "./entorno";

const API_TELEGRAM = "https://api.telegram.org";

async function llamar(metodo: string, datos: Record<string, unknown>): Promise<Response> {
  const res = await fetch(`${API_TELEGRAM}/bot${requerir("TELEGRAM_BOT_TOKEN")}/${metodo}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  if (!res.ok) console.error(`Telegram ${metodo}: ${res.status}`, await res.text());
  return res;
}

export function enviarMensaje(chatId: number | string, texto: string): Promise<Response> {
  return llamar("sendMessage", { chat_id: chatId, text: texto });
}

export function responderBoton(idCallback: string, texto: string, alerta = false): Promise<Response> {
  return llamar("answerCallbackQuery", { callback_query_id: idCallback, text: texto, show_alert: alerta });
}

export function editarMensaje(chatId: number | string, idMensaje: number, texto: string): Promise<Response> {
  return llamar("editMessageText", { chat_id: chatId, message_id: idMensaje, text: texto });
}

/** Solo el chat configurado; sin TELEGRAM_CHAT_ID no se acepta ninguno. */
export function chatAutorizado(chatId: number | string | undefined): boolean {
  const permitido = process.env.TELEGRAM_CHAT_ID;
  return Boolean(permitido) && chatId !== undefined && String(chatId) === permitido;
}
