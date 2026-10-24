export function formatoDuracion(segundos: number | null): string {
  if (segundos === null || Number.isNaN(segundos)) return "";
  const horas = Math.floor(segundos / 3600);
  const min = Math.floor((segundos % 3600) / 60);
  const seg = Math.floor(segundos % 60);
  if (horas > 0) {
    return `${horas}:${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}`;
  }
  return `${min}:${String(seg).padStart(2, "0")}`;
}

export function formatoFecha(fechaIso: string | null): string {
  if (!fechaIso) return "";
  return new Date(fechaIso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
