import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESION, DURACION_SESION_S, contrasenaCorrecta, crearTokenSesion } from "@/lib/core/sesion";
import { loginBloqueado, registrarFalloLogin } from "@/lib/core/frenos";

const ESPERA_FALLO_MS = 1000;

/**
 * Solo rutas del propio hub: cualquier otra cosa (otro dominio, «/\\evil.com»…) vuelve a «/».
 * «/..//evil.com» se normaliza a «//evil.com», que como destino relativo apunta a otro dominio.
 */
function destinoSeguro(destino: string, request: NextRequest): string {
  try {
    const url = new URL(destino, request.url);
    if (url.origin !== request.nextUrl.origin || /^\/[/\\]/.test(url.pathname)) return "/";
    return url.pathname + url.search;
  } catch {
    return "/";
  }
}

/** Vercel pone la IP real del cliente en x-real-ip; x-forwarded-for como respaldo. */
function ipCliente(request: NextRequest): string {
  return (
    request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida"
  );
}

function volverAlLogin(request: NextRequest, motivo: string, destino: string): NextResponse {
  const login = new URL("/login", request.url);
  login.searchParams.set("error", motivo);
  login.searchParams.set("from", destino);
  return NextResponse.redirect(login, 303);
}

export async function POST(request: NextRequest) {
  const formulario = await request.formData();
  const contrasena = String(formulario.get("password") ?? "");
  const destino = destinoSeguro(String(formulario.get("from") ?? "/"), request);
  const ip = ipCliente(request);

  if (await loginBloqueado(ip)) return volverAlLogin(request, "bloqueado", destino);

  if (!(await contrasenaCorrecta(contrasena))) {
    await registrarFalloLogin(ip);
    await new Promise((r) => setTimeout(r, ESPERA_FALLO_MS));
    return volverAlLogin(request, "1", destino);
  }

  const respuesta = NextResponse.redirect(new URL(destino, request.url), 303);
  respuesta.cookies.set(COOKIE_SESION, await crearTokenSesion(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: DURACION_SESION_S,
    path: "/",
  });
  return respuesta;
}
