#!/usr/bin/env python3
"""Login inicial de WHOOP para la tarea del coach en la nube (se ejecuta una vez en tu ordenador).

Uso (desde la raíz del repo):
    python3 scripts/coach/whoop_login.py

Pide el Client ID y el Client Secret de la app «Atenea Coach», abre el navegador
para aceptar los permisos y guarda la sesión en el secret de GitHub
WHOOP_SESION_INICIAL con `gh`, sin mostrarla. La tarea diaria la usa la primera
vez y después guarda las sesiones renovadas en la base de datos del hub.
"""
import getpass
import http.server
import json
import secrets
import subprocess
import sys
import threading
import urllib.error
import urllib.parse
import urllib.request
import webbrowser

AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth"
TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token"
PUERTO = 8765
REDIRECT = f"http://localhost:{PUERTO}/callback"
USER_AGENT = "atenea-coach/1.0"
SCOPES = "offline read:recovery read:cycles read:workout read:sleep read:profile read:body_measurement"


def esperar_codigo(state: str) -> str:
    resultado: dict[str, str] = {}

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):  # noqa: N802
            u = urllib.parse.urlparse(self.path)
            q = urllib.parse.parse_qs(u.query)
            if u.path != "/callback":
                self.send_response(404)
                self.end_headers()
                return
            if q.get("state", [""])[0] != state:
                resultado["error"] = "state inválido"
            elif "error" in q:
                resultado["error"] = q["error"][0]
            else:
                resultado["code"] = q.get("code", [""])[0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write("<h2>Listo, ya puedes cerrar esta pestaña.</h2>".encode())
            threading.Thread(target=self.server.shutdown, daemon=True).start()

        def log_message(self, *args):
            pass

    servidor = http.server.HTTPServer(("127.0.0.1", PUERTO), Handler)
    servidor.timeout = 300
    servidor.serve_forever()
    if "error" in resultado or not resultado.get("code"):
        sys.exit(f"WHOOP no devolvió el código: {resultado.get('error', 'sin código')}")
    return resultado["code"]


def main() -> None:
    client_id = input("Client ID de la app «Atenea Coach»: ").strip()
    client_secret = getpass.getpass("Client Secret (no se verá al escribir): ").strip()
    state = secrets.token_hex(16)
    url = AUTH_URL + "?" + urllib.parse.urlencode({
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": REDIRECT,
        "scope": SCOPES,
        "state": state,
    })
    print("Abriendo el navegador para aceptar los permisos de WHOOP…")
    webbrowser.open(url)
    code = esperar_codigo(state)

    datos = urllib.parse.urlencode({
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT,
        "client_id": client_id,
        "client_secret": client_secret,
    }).encode()
    req = urllib.request.Request(TOKEN_URL, data=datos, headers={
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
    })
    try:
        with urllib.request.urlopen(req) as res:
            tokens = json.load(res)
    except urllib.error.HTTPError as e:
        sys.exit(f"WHOOP rechazó el canje del código ({e.code}): {e.read().decode(errors='replace')[:300]}")
    if not tokens.get("refresh_token"):
        sys.exit("WHOOP no devolvió refresh_token: revisa que la app tenga los scopes y el permiso offline.")

    sesion = json.dumps({"refresh_token": tokens["refresh_token"]})
    subprocess.run(["gh", "secret", "set", "WHOOP_SESION_INICIAL"], input=sesion, text=True, check=True)
    print("Sesión de WHOOP guardada en el secret WHOOP_SESION_INICIAL.")


if __name__ == "__main__":
    main()
