import { requerir } from "./entorno";
import { firmar, secretoIgual } from "./secretos";

export const COOKIE_SESION = "hub_session";
export const DURACION_SESION_S = 60 * 60 * 24 * 30;

/** Firma las sesiones; sin SESSION_SECRET se usa la contraseña, como antes, para no dejar la app cerrada. */
function secretoSesion(): string {
  return process.env.SESSION_SECRET || requerir("APP_PASSWORD");
}

/** Token «caducidad.firma»: caduca a los 30 días y deja de valer si cambia SESSION_SECRET. */
export async function crearTokenSesion(ahora = Date.now()): Promise<string> {
  const caducidad = String(Math.floor(ahora / 1000) + DURACION_SESION_S);
  return `${caducidad}.${await firmar(caducidad, secretoSesion())}`;
}

export async function sesionValida(token: string | undefined, ahora = Date.now()): Promise<boolean> {
  if (!token) return false;
  const [caducidad, firma] = token.split(".");
  if (!caducidad || !firma || !/^\d+$/.test(caducidad) || Number(caducidad) * 1000 < ahora) return false;
  try {
    return await secretoIgual(firma, await firmar(caducidad, secretoSesion()));
  } catch {
    return false;
  }
}

export async function contrasenaCorrecta(candidata: string): Promise<boolean> {
  return secretoIgual(candidata, requerir("APP_PASSWORD"));
}
