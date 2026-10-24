import { NextResponse } from "next/server";
import { guardarProcesamientoVideo } from "@/lib/contenido/procesamiento";
import { marcarVideoError } from "@/lib/contenido/videos";
import type {
  HighlightEntrada,
  PersonaEntrada,
  SegmentoEntrada,
  TemaEntrada,
  TipoHighlight,
} from "@/lib/contenido/tipos";
import { conToken } from "@/lib/core/autorizacion";
import { error, idDeRuta, leerJson, type ConId } from "@/lib/core/api";

const TIPOS_HIGHLIGHT: TipoHighlight[] = ["idea_clave", "cita", "dato"];

function leerSegmentos(valor: unknown): SegmentoEntrada[] | null {
  if (!Array.isArray(valor)) return null;
  const segmentos: SegmentoEntrada[] = [];
  for (const item of valor) {
    if (
      typeof item?.inicio_seg !== "number" ||
      typeof item?.fin_seg !== "number" ||
      typeof item?.texto !== "string" ||
      item.inicio_seg < 0 ||
      item.fin_seg < item.inicio_seg
    ) {
      return null;
    }
    segmentos.push({ inicio_seg: item.inicio_seg, fin_seg: item.fin_seg, texto: item.texto });
  }
  return segmentos;
}

function leerHighlights(valor: unknown): HighlightEntrada[] | null {
  if (!Array.isArray(valor)) return null;
  const highlights: HighlightEntrada[] = [];
  for (const item of valor) {
    if (
      typeof item?.inicio_seg !== "number" ||
      item.inicio_seg < 0 ||
      typeof item?.texto !== "string" ||
      !TIPOS_HIGHLIGHT.includes(item?.tipo) ||
      !Number.isInteger(item?.importancia) ||
      item.importancia < 1 ||
      item.importancia > 5
    ) {
      return null;
    }
    highlights.push({
      inicio_seg: item.inicio_seg,
      fin_seg: typeof item?.fin_seg === "number" ? item.fin_seg : null,
      texto: item.texto,
      tipo: item.tipo,
      importancia: item.importancia,
    });
  }
  return highlights;
}

function leerTemas(valor: unknown): TemaEntrada[] | null {
  if (!Array.isArray(valor)) return null;
  const temas: TemaEntrada[] = [];
  for (const item of valor) {
    if (typeof item?.nombre !== "string" || !item.nombre.trim()) return null;
    temas.push({
      nombre: item.nombre,
      descripcion: typeof item?.descripcion === "string" ? item.descripcion : null,
      resumen: typeof item?.resumen === "string" ? item.resumen : null,
      contexto: typeof item?.contexto === "string" ? item.contexto : null,
    });
  }
  return temas;
}

function leerPersonas(valor: unknown): PersonaEntrada[] | null {
  if (!Array.isArray(valor)) return null;
  const personas: PersonaEntrada[] = [];
  for (const item of valor) {
    if (typeof item?.nombre !== "string" || !item.nombre.trim()) return null;
    personas.push({
      nombre: item.nombre,
      descripcion: typeof item?.descripcion === "string" ? item.descripcion : null,
      foto_url: typeof item?.foto_url === "string" ? item.foto_url : null,
      canal_id: typeof item?.canal_id === "string" ? item.canal_id : null,
      contexto: typeof item?.contexto === "string" ? item.contexto : null,
    });
  }
  return personas;
}

/**
 * Persiste el resultado completo del procesamiento de un vídeo (resumen,
 * transcripción, highlights, temas y personas), o lo marca como error si la
 * cadena de transcripción falló por completo.
 */
export const PATCH = conToken("CONTENIDO_CRON_SECRET", async (request, ruta: ConId) => {
  const id = await idDeRuta(ruta);
  if (!id) return error("Id no válido", 400);
  const body = await leerJson(request);
  if (!body) return error("JSON no válido", 400);

  if (body.estado === "error") {
    const motivo = typeof body.error_motivo === "string" ? body.error_motivo : "Motivo desconocido";
    const video = await marcarVideoError(id, motivo);
    return video ? NextResponse.json({ video }) : error("Vídeo no encontrado", 404);
  }

  const resumen = typeof body.resumen === "string" ? body.resumen : null;
  const segmentos = leerSegmentos(body.segmentos);
  const highlights = leerHighlights(body.highlights);
  const temas = leerTemas(body.temas ?? []);
  const personas = leerPersonas(body.personas ?? []);
  if (!resumen || !segmentos || !highlights || !temas || !personas) {
    return error(
      "Se requieren resumen, segmentos y highlights válidos (temas y personas pueden ser listas vacías)",
      400
    );
  }

  const video = await guardarProcesamientoVideo(id, { resumen, segmentos, highlights, temas, personas });
  return video ? NextResponse.json({ video }) : error("Vídeo no encontrado", 404);
});
