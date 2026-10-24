import { NextResponse } from "next/server";
import { conToken } from "@/lib/core/autorizacion";
import { error, esDe, leerJson } from "@/lib/core/api";
import { guardarCredencial, obtenerCredencial } from "@/lib/coach/db";

/**
 * Sesiones de WHOOP y Garmin de la tarea de la nube. Ambos rotan el refresh
 * token al renovarlo, así que el script lee aquí la sesión y guarda la nueva
 * en cuanto la recibe. Van con su propio secreto, que solo tiene el paso que
 * recoge los datos: con el de publicar, el agente podría leer las sesiones.
 */
const PROVEEDORES = ["whoop", "garmin"] as const;

interface ConProveedor {
  params: Promise<{ proveedor: string }>;
}

async function proveedorDeRuta({ params }: ConProveedor) {
  const { proveedor } = await params;
  return esDe(PROVEEDORES, proveedor) ? proveedor : null;
}

export const GET = conToken("COACH_CREDENCIALES_SECRET", async (_request, ruta: ConProveedor) => {
  const proveedor = await proveedorDeRuta(ruta);
  if (!proveedor) return error("Proveedor desconocido", 404);
  const sesion = await obtenerCredencial<Record<string, unknown>>(proveedor);
  return sesion ? NextResponse.json(sesion) : error("No hay sesión guardada", 404);
});

export const PUT = conToken("COACH_CREDENCIALES_SECRET", async (request, ruta: ConProveedor) => {
  const proveedor = await proveedorDeRuta(ruta);
  if (!proveedor) return error("Proveedor desconocido", 404);
  const sesion = await leerJson(request);
  if (!sesion || Object.keys(sesion).length === 0) return error("Falta la sesión", 400);

  await guardarCredencial(proveedor, sesion);
  return NextResponse.json({ ok: true });
});
