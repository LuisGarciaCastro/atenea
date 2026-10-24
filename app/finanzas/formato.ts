export function formatoFechaLarga(iso: string): string {
  const fecha = new Date(`${iso}T00:00:00`);
  return fecha.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
}

/** Como el diseño: sin decimales a partir de 1.000 €. */
export function formatoDinero(valor: number): string {
  return valor.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: Math.abs(valor) >= 1000 ? 0 : 2,
  });
}
