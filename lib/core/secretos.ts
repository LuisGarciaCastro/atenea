const codificador = new TextEncoder();

/** Clave aleatoria por proceso: solo sirve para comparar, nunca sale de aquí. */
const clave = crypto.subtle.importKey(
  "raw",
  crypto.getRandomValues(new Uint8Array(32)),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign"]
);

async function resumen(valor: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.sign("HMAC", await clave, codificador.encode(valor)));
}

/**
 * Compara dos secretos en tiempo constante. Se comparan sus HMAC (misma
 * longitud siempre) para no filtrar ni el contenido ni la longitud. Funciona en
 * el runtime Edge del middleware y en Node.
 */
export async function secretoIgual(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([resumen(a), resumen(b)]);
  let diferencia = 0;
  for (let i = 0; i < x.length; i++) diferencia |= x[i] ^ y[i];
  return diferencia === 0;
}

/** HMAC-SHA256 en hexadecimal de `valor` con `secreto`. */
export async function firmar(valor: string, secreto: string): Promise<string> {
  const k = await crypto.subtle.importKey(
    "raw",
    codificador.encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const firma = new Uint8Array(await crypto.subtle.sign("HMAC", k, codificador.encode(valor)));
  return Array.from(firma, (b) => b.toString(16).padStart(2, "0")).join("");
}
