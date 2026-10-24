/** Variable de entorno obligatoria: si falta, falla con un mensaje que dice cuál. */
export function requerir(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`);
  return valor;
}
