"""Cliente de Garmin para la tarea del coach en la nube.

La sesión llega en GARMIN_SESION (JSON de `client.dumps()`), sin email ni
contraseña: así nunca se toca el login SSO, que Garmin bloquea desde IPs de
servidores. recoger_datos.py guarda la sesión renovada al terminar.
"""
import os

from garminconnect import Garmin

_client = None


def get_client() -> Garmin:
    global _client
    if _client is None:
        sesion = os.environ.get("GARMIN_SESION")
        if not sesion:
            raise ValueError("Falta GARMIN_SESION")
        cliente = Garmin()
        cliente.login(sesion)
        _client = cliente
    return _client


def sesion_actual() -> str | None:
    """Sesión (posiblemente renovada) para guardarla en el hub."""
    return _client.client.dumps() if _client is not None else None
