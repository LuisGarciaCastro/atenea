import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod/v4";
import { BUSQUEDA_WEB, FALLBACK, MODELO, preguntarSubagente, type Contexto } from "./subagentes";
import type { Agente, EventoChat, MensajeChat } from "./tipos";

const AGENTES: Record<string, Agente> = {
  preguntar_finanzas: "finanzas",
  preguntar_libros: "libros",
  preguntar_deportes: "deportes",
};

function herramienta(name: string, description: string): Anthropic.Beta.BetaTool {
  return {
    name,
    description,
    strict: true,
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        pregunta: {
          type: "string",
          description:
            "La pregunta o el encargo para el especialista, autocontenido (con fechas, títulos, importes y el contexto que necesite).",
        },
      },
      required: ["pregunta"],
      additionalProperties: false,
    },
  };
}

const HERRAMIENTAS: Anthropic.Beta.BetaToolUnion[] = [
  BUSQUEDA_WEB,
  herramienta(
    "preguntar_finanzas",
    "Especialista en los gastos del usuario: importes, categorías, comercios, meses y tendencias. También apunta gastos."
  ),
  herramienta(
    "preguntar_libros",
    "Especialista en la estantería del usuario: qué lee, qué ha leído, progreso, valoraciones y objetivo anual. También añade libros y cambia estado, página o valoración."
  ),
  herramienta(
    "preguntar_deportes",
    "Especialista en el entrenamiento de triatlón del usuario: entrenos de Garmin y WHOOP, recuperación, sueño, carga, plan semanal y cuaderno del coach. También le pasa al coach lo que el usuario cuente (preferencias, molestias, cómo se siente) y puede pedirle que rehaga el plan de hoy."
  ),
];

const SISTEMA = `Eres el asistente del hub personal del usuario. Respondes preguntas sobre sus datos consultando a tres especialistas:
- preguntar_finanzas: gastos.
- preguntar_libros: lectura.
- preguntar_deportes: entrenamiento de triatlón (WHOOP y Garmin).

También tienes web_search: úsalo para preguntas generales o de actualidad, o para completar una respuesta con información de fuera (di de dónde sale). Los datos del usuario salen siempre de los especialistas, nunca de internet.

Pregunta al especialista que corresponda; si la pregunta cruza áreas, pregunta a varios a la vez. No inventes datos: toda cifra sale de un especialista. Si la pregunta no tiene que ver con sus datos, responde sin herramientas y brevemente.

Si el usuario cuenta algo que cambia sus datos («he empezado este libro», «me he acabado X», «apunta 12 € de comida», «hoy me apetece natación»), pásaselo al especialista tal cual para que lo apunte. No pidas confirmación: cada cambio aparece en la app con un botón para deshacerlo. Confirma en una frase qué se ha cambiado.

Responde en español de España, directo y con cifras (coma decimal), en pocas frases o una lista corta. Puedes usar **negrita** y listas con guiones; nada de tablas ni encabezados.`;

const PreguntaInput = z.object({ pregunta: z.string().min(1) });
const MAX_VUELTAS = 6;
/** Pausas de la búsqueda web que se reanudan sin gastar una vuelta. */
const MAX_PAUSAS = 4;

/**
 * Responde a un mensaje con el historial de la conversación. Va emitiendo los
 * eventos (agentes consultados, texto) y devuelve el texto final completo.
 */
export async function responder(
  historial: MensajeChat[],
  mensaje: string,
  base: Omit<Contexto, "alAccion">,
  emitir: (e: EventoChat) => void
): Promise<{ texto: string; agentes: Agente[] }> {
  const hoy = base.hoy;
  const ctx: Contexto = { ...base, alAccion: (accion) => emitir({ tipo: "accion", accion }) };
  // Un reintento y timeout corto: el límite real lo pone la ruta (unos 4,5 min en total).
  const client = new Anthropic({ maxRetries: 1, timeout: 120_000 });
  // El historial se reenvía solo como texto: cada petición es un bucle nuevo y no
  // se reproducen bloques de herramientas ni de razonamiento de turnos anteriores.
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...historial.map((m) => ({ role: m.rol, content: m.texto }) as Anthropic.Beta.BetaMessageParam),
    { role: "user", content: mensaje },
  ];
  const usados = new Set<Agente>();
  let texto = "";
  let reintentosJson = 0;

  let terminado = false;
  let pausas = 0;
  for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
    let primerTrozo = true;
    const textoAntes = texto;
    const stream = client.beta.messages.stream(
      {
        model: MODELO,
        max_tokens: 16000,
        output_config: { effort: "medium" },
        ...FALLBACK,
        // Herramientas y SISTEMA no cambian entre vueltas ni entre mensajes: se cachean.
        system: [
          { type: "text", text: SISTEMA, cache_control: { type: "ephemeral" } },
          { type: "text", text: `Hoy es ${hoy} (Europe/Madrid).` },
        ],
        tools: HERRAMIENTAS,
        messages,
      },
      { signal: ctx.signal }
    );
    stream.on("text", (delta) => {
      // Si una vuelta anterior ya escribió algo, el texto nuevo va en otro párrafo.
      const trozo = primerTrozo && texto && !texto.endsWith("\n") ? `\n\n${delta}` : delta;
      primerTrozo = false;
      texto += trozo;
      emitir({ tipo: "texto", delta: trozo });
    });

    let respuesta: Anthropic.Beta.BetaMessage;
    try {
      respuesta = await stream.finalMessage();
      reintentosJson = 0;
    } catch (error) {
      // Con eager_input_streaming, una entrada de herramienta ilegible rechaza aquí: se repite el turno.
      if (error instanceof Anthropic.APIError || ctx.signal.aborted || reintentosJson++ >= 2) throw error;
      // El turno se repite: lo que ya se había escrito en él se descarta también en el navegador.
      if (texto !== textoAntes) {
        texto = textoAntes;
        emitir({ tipo: "recorte", longitud: texto.length });
      }
      continue;
    }
    if (respuesta.stop_reason === "refusal") {
      const aviso = "No puedo responder a eso.";
      texto += aviso;
      emitir({ tipo: "texto", delta: aviso });
      terminado = true;
      break;
    }

    // Una búsqueda web larga puede pausar el turno: se reenvía tal cual y el servidor sigue donde lo dejó.
    if (respuesta.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: respuesta.content });
      if (pausas++ < MAX_PAUSAS) vuelta--;
      continue;
    }

    const llamadas = respuesta.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (llamadas.length === 0) {
      if (respuesta.stop_reason === "max_tokens") {
        const aviso = "\n\n(La respuesta se ha cortado por larga; pídeme la parte que falte.)";
        texto += aviso;
        emitir({ tipo: "texto", delta: aviso });
      }
      terminado = true;
      break;
    }
    if (respuesta.stop_reason === "max_tokens")
      throw new Error("La respuesta se cortó al pedir datos a un especialista.");

    messages.push({ role: "assistant", content: respuesta.content });
    // Distintos especialistas van en paralelo; dos encargos al mismo, uno detrás de otro, para
    // que el segundo vea lo que apuntó el primero y no lo duplique.
    const colas = new Map<string, Promise<unknown>>();
    const enCola = <T>(clave: string, tarea: () => Promise<T>): Promise<T> => {
      const resultado = (colas.get(clave) ?? Promise.resolve()).then(tarea);
      colas.set(
        clave,
        resultado.catch(() => undefined)
      );
      return resultado;
    };
    const resultados = await Promise.all(
      llamadas.map(async (llamada): Promise<Anthropic.Beta.BetaToolResultBlockParam> => {
        const agente = AGENTES[llamada.name];
        const entrada = PreguntaInput.safeParse(llamada.input);
        if (!agente || !entrada.success) {
          return { type: "tool_result", tool_use_id: llamada.id, is_error: true, content: "Llamada no válida." };
        }
        usados.add(agente);
        emitir({ tipo: "agente", agente });
        try {
          const contenido = await enCola(agente, () => preguntarSubagente(client, agente, entrada.data.pregunta, ctx));
          return { type: "tool_result", tool_use_id: llamada.id, content: contenido };
        } catch (error) {
          console.error(`Subagente ${agente}:`, error);
          return {
            type: "tool_result",
            tool_use_id: llamada.id,
            is_error: true,
            content: "El especialista ha fallado.",
          };
        }
      })
    );
    messages.push({ role: "user", content: resultados });
  }

  if (!terminado) {
    const aviso = `${texto ? "\n\n" : ""}No he terminado de reunir los datos; prueba a preguntarlo de forma más concreta.`;
    texto += aviso;
    emitir({ tipo: "texto", delta: aviso });
  }

  return { texto: texto.trim(), agentes: [...usados] };
}
