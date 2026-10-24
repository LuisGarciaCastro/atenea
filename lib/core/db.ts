import { neon, types, type NeonQueryFunction } from "@neondatabase/serverless";

export type ClienteSql = NeonQueryFunction<false, false>;

const DATE = 1082;
const TIMESTAMP = 1114;
const TIMESTAMPTZ = 1184;
const NUMERIC = 1700;

/**
 * Los tipos de lib/*\/tipos.ts describen lo que viaja en JSON: fechas como texto
 * ISO e importes como número. Sin esto el driver devuelve Date y string y el
 * código de servidor recibe otra cosa de la que declara.
 */
function parserDeTipo(id: number, formato?: "text" | "binary") {
  const original = types.getTypeParser(id, formato);
  if (id === DATE) return (v: string) => v;
  if (id === TIMESTAMP || id === TIMESTAMPTZ) return (v: string) => (original(v) as Date).toISOString();
  if (id === NUMERIC) return (v: string) => Number(v);
  return original;
}

let sqlClient: ClienteSql | null = null;

export function obtenerSql(): ClienteSql {
  if (!sqlClient) {
    const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
    if (!url) {
      throw new Error("Falta la variable de entorno DATABASE_URL (conexión a la base de datos Postgres)");
    }
    sqlClient = neon<false, false>(url, { types: { getTypeParser: parserDeTipo } });
  }
  return sqlClient;
}

/**
 * Crea las tablas de un módulo la primera vez que se usan. Si falla, se olvida
 * el intento para reintentarlo en la siguiente llamada en vez de dejar el
 * módulo roto hasta el próximo arranque.
 */
export function prepararEsquema(crear: (sql: ClienteSql) => Promise<unknown>): (sql: ClienteSql) => Promise<void> {
  let listo: Promise<void> | null = null;
  return (sql) => {
    listo ??= crear(sql).then(
      () => undefined,
      (error: unknown) => {
        listo = null;
        throw error;
      }
    );
    return listo;
  };
}
