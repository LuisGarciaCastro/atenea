import { secretoIgual } from "./secretos";
import { conErrores, error, type Manejador } from "./api";

export type SecretoServicio =
  | "CONTENIDO_CRON_SECRET"
  | "EVENTOS_CRON_SECRET"
  | "FINANZAS_CRON_SECRET"
  | "COACH_CRON_SECRET"
  /** Solo para las sesiones de WHOOP y Garmin: no lo tiene el agente del coach. */
  | "COACH_CREDENCIALES_SECRET"
  | "GASTOS_DIRECTO_SECRET"
  | "NOTAS_DIRECTO_SECRET";

/**
 * Rutas que llaman workflows, agentes o el Atajo de iOS, no un navegador con
 * sesión: quedan fuera del middleware y se protegen con «Authorization: Bearer
 * <secreto>», un secreto por módulo. Sin el secreto configurado, se rechaza.
 */
export async function autorizadoConToken(request: Request, secreto: SecretoServicio): Promise<boolean> {
  const valor = process.env[secreto];
  const cabecera = request.headers.get("authorization");
  if (!valor || !cabecera) return false;
  return secretoIgual(cabecera, `Bearer ${valor}`);
}

/** Envuelve un manejador de ruta: sin el token del servicio responde 401; los errores, 500 en JSON. */
export function conToken<R extends Request, C>(secreto: SecretoServicio, manejador: Manejador<R, C>): Manejador<R, C> {
  return conErrores(async (request, contexto) =>
    (await autorizadoConToken(request, secreto)) ? manejador(request, contexto) : error("No autorizado", 401)
  );
}
