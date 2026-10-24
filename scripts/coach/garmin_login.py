#!/usr/bin/env python3
"""Login inicial de Garmin para la tarea del coach en la nube (se ejecuta una vez en tu ordenador).

Uso (desde la raíz del repo, con un Python que tenga garminconnect instalado):
    python3 scripts/coach/garmin_login.py

Pide email y contraseña de Garmin Connect (y el código MFA si lo tienes activo),
crea una sesión nueva y la guarda
en el secret de GitHub GARMIN_SESION_INICIAL con `gh`, sin mostrarla.
"""
import getpass
import subprocess

from garminconnect import Garmin


def main() -> None:
    email = input("Email de Garmin Connect: ").strip()
    password = getpass.getpass("Contraseña (no se verá al escribir): ")
    cliente = Garmin(email, password, return_on_mfa=True)
    resultado, contexto = cliente.login()
    if resultado == "needs_mfa":
        codigo = input("Código MFA que te ha llegado: ").strip()
        cliente.resume_login(contexto, codigo)

    sesion = cliente.client.dumps()
    subprocess.run(["gh", "secret", "set", "GARMIN_SESION_INICIAL"], input=sesion, text=True, check=True)
    print("Sesión de Garmin guardada en el secret GARMIN_SESION_INICIAL.")


if __name__ == "__main__":
    main()
