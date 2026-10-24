import { obtenerSql, prepararEsquema } from "./db";

const MAX_FALLOS_LOGIN = 10;
const VENTANA_LOGIN = "15 minutes";

const asegurarEsquema = prepararEsquema(async (sql) => {
  await sql`
        CREATE TABLE IF NOT EXISTS intentos_login (
          ip TEXT NOT NULL,
          fecha TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
  await sql`CREATE INDEX IF NOT EXISTS intentos_login_ip_fecha ON intentos_login (ip, fecha)`;
  await sql`
        CREATE TABLE IF NOT EXISTS telegram_actualizaciones (
          update_id BIGINT PRIMARY KEY,
          recibida TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
});

/**
 * ¿Ha fallado esta IP demasiadas veces en la ventana? La espera en la ruta solo frena
 * peticiones en serie; en Vercel cada intento en paralelo cae en otra instancia.
 */
export async function loginBloqueado(ip: string): Promise<boolean> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const [fila] = await sql`
    SELECT count(*)::int AS fallos FROM intentos_login
    WHERE ip = ${ip} AND fecha > now() - ${VENTANA_LOGIN}::interval
  `;
  return (fila?.fallos as number) >= MAX_FALLOS_LOGIN;
}

export async function registrarFalloLogin(ip: string): Promise<void> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  await sql`DELETE FROM intentos_login WHERE fecha < now() - interval '1 day'`;
  await sql`INSERT INTO intentos_login (ip) VALUES (${ip})`;
}

/**
 * Marca una actualización de Telegram como vista. Devuelve false si ya llegó antes:
 * Telegram la reenvía cuando la respuesta tarda y se duplicarían issues o gastos.
 */
export async function primeraVezActualizacion(updateId: number): Promise<boolean> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  await sql`DELETE FROM telegram_actualizaciones WHERE recibida < now() - interval '7 days'`;
  const filas = await sql`
    INSERT INTO telegram_actualizaciones (update_id) VALUES (${updateId})
    ON CONFLICT (update_id) DO NOTHING
    RETURNING update_id
  `;
  return filas.length > 0;
}
