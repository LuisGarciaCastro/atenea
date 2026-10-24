import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESION, sesionValida } from "@/lib/core/sesion";

export async function middleware(request: NextRequest) {
  if (await sesionValida(request.cookies.get(COOKIE_SESION)?.value)) {
    return NextResponse.next();
  }

  // La API responde 401 en JSON: una redirección al login llegaría a fetch como HTML con 200.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("from", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

/**
 * Todo pasa por la sesión salvo el login, las rutas con token propio (webhook de
 * Telegram, crons, Atajo de iOS) y los estáticos. Cada exclusión acaba en «/» o
 * en el final de la ruta para que, p. ej., «/loginx» no quede pública.
 */
export const config = {
  matcher: [
    "/((?!(?:login|privacidad|api/login|api/telegram-webhook|api/(?:finanzas|eventos|contenido|coach)/cron|api/gastos/directo|api/notas/directo|icons|_next/static|_next/image)(?:/|$)|manifest\\.json$|favicon\\.ico$).*)",
  ],
};
