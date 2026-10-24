"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import styles from "./chat.module.css";
import TextoRespuesta from "./TextoRespuesta";
import { useDialogo } from "../useDialogo";
import { fechaCorta } from "../fechas";
import type { Agente, Conversacion, EventoChat, MensajeChat } from "@/lib/chat/tipos";
import type { Accion } from "@/lib/chat/acciones";

const NOMBRES: Record<Agente, string> = { finanzas: "Finanzas", libros: "Libros", deportes: "Deportes" };

interface AccionChat {
  id: number;
  descripcion: string;
  deshacible: boolean;
  estado: "hecha" | "deshaciendo" | "deshecha" | "fallida";
}

interface Burbuja {
  rol: "user" | "assistant";
  texto: string;
  agentes: Agente[];
  acciones?: AccionChat[];
  pendiente?: boolean;
  error?: boolean;
}

const SUGERENCIAS = [
  "¿Cuánto he gastado este mes en restaurantes?",
  "¿Cómo voy con el objetivo de lectura?",
  "¿Cómo estoy de recuperación esta semana?",
];

export default function PanelChat({ onCerrar }: { onCerrar: () => void }) {
  const [vista, setVista] = useState<"chat" | "historial">("chat");
  const [conversacionId, setConversacionId] = useState<number | null>(null);
  const [burbujas, setBurbujas] = useState<Burbuja[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [conversaciones, setConversaciones] = useState<Conversacion[] | null>(null);
  const fondo = useRef<HTMLDivElement>(null);
  const peticion = useRef<AbortController | null>(null);
  const dialogo = useDialogo<HTMLDivElement>(onCerrar);

  // Al cerrar el panel se corta la respuesta en curso; el servidor guarda lo que haya y sus cambios.
  useEffect(() => () => peticion.current?.abort(), []);

  useEffect(() => {
    fondo.current?.scrollIntoView({ block: "end" });
  }, [burbujas]);

  const cargarHistorial = useCallback(async () => {
    setConversaciones(null);
    const res = await fetch("/api/chat/conversaciones").catch(() => null);
    const data = res?.ok ? await res.json() : { conversaciones: [] };
    setConversaciones(data.conversaciones ?? []);
  }, []);

  async function abrirConversacion(id: number) {
    const res = await fetch(`/api/chat/conversaciones/${id}`).catch(() => null);
    if (!res?.ok) return;
    const data: { mensajes: MensajeChat[]; acciones?: Accion[] } = await res.json();
    setConversacionId(id);
    setBurbujas(
      data.mensajes.map((m) => {
        const acciones = (data.acciones ?? [])
          .filter((a) => a.mensaje_id === m.id)
          .map((a) => ({ ...a, estado: a.deshecha ? ("deshecha" as const) : ("hecha" as const) }));
        return { rol: m.rol, texto: m.texto, agentes: m.agentes, ...(acciones.length ? { acciones } : {}) };
      })
    );
    setVista("chat");
  }

  async function borrarConversacion(id: number) {
    if (!window.confirm("¿Borrar esta conversación?")) return;
    const res = await fetch(`/api/chat/conversaciones/${id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) return;
    setConversaciones((lista) => lista?.filter((c) => c.id !== id) ?? null);
    if (conversacionId === id) nueva();
  }

  function nueva() {
    setConversacionId(null);
    setBurbujas([]);
    setVista("chat");
  }

  function actualizarUltima(cambio: (b: Burbuja) => Burbuja) {
    setBurbujas((lista) => [...lista.slice(0, -1), cambio(lista[lista.length - 1])]);
  }

  async function enviar(mensaje: string) {
    if (!mensaje.trim() || enviando) return;
    setTexto("");
    setEnviando(true);
    setBurbujas((lista) => [
      ...lista,
      { rol: "user", texto: mensaje.trim(), agentes: [] },
      { rol: "assistant", texto: "", agentes: [], pendiente: true },
    ]);

    const control = new AbortController();
    peticion.current = control;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje, conversacionId }),
        signal: control.signal,
      });
      if (!res.ok || !res.body) throw new Error(String(res.status));

      const lector = res.body.getReader();
      const decodificador = new TextDecoder();
      let resto = "";
      for (;;) {
        const { value, done } = await lector.read();
        if (done) break;
        resto += decodificador.decode(value, { stream: true });
        const lineas = resto.split("\n");
        resto = lineas.pop() ?? "";
        for (const linea of lineas) {
          if (!linea.trim()) continue;
          const evento = JSON.parse(linea) as EventoChat;
          if (evento.tipo === "conversacion") setConversacionId(evento.id);
          else if (evento.tipo === "agente")
            actualizarUltima((b) =>
              b.agentes.includes(evento.agente) ? b : { ...b, agentes: [...b.agentes, evento.agente] }
            );
          else if (evento.tipo === "accion")
            actualizarUltima((b) => ({
              ...b,
              acciones: [...(b.acciones ?? []), { ...evento.accion, estado: "hecha" }],
            }));
          else if (evento.tipo === "texto") actualizarUltima((b) => ({ ...b, texto: b.texto + evento.delta }));
          else if (evento.tipo === "recorte")
            actualizarUltima((b) => ({ ...b, texto: b.texto.slice(0, evento.longitud) }));
          else if (evento.tipo === "error") actualizarUltima((b) => ({ ...b, texto: evento.mensaje, error: true }));
        }
      }
    } catch {
      if (control.signal.aborted) return;
      actualizarUltima((b) => ({ ...b, texto: "No he podido responder. Inténtalo otra vez.", error: true }));
    } finally {
      if (peticion.current === control) peticion.current = null;
      if (!control.signal.aborted) {
        actualizarUltima((b) => ({ ...b, pendiente: false }));
        setEnviando(false);
      }
    }
  }

  function cambiarAccion(id: number, estado: AccionChat["estado"]) {
    setBurbujas((lista) =>
      lista.map((b) =>
        b.acciones?.some((a) => a.id === id)
          ? { ...b, acciones: b.acciones.map((a) => (a.id === id ? { ...a, estado } : a)) }
          : b
      )
    );
  }

  async function deshacer(id: number) {
    cambiarAccion(id, "deshaciendo");
    const res = await fetch(`/api/chat/acciones/${id}/deshacer`, { method: "POST" }).catch(() => null);
    cambiarAccion(id, res?.ok ? "deshecha" : "fallida");
  }

  function alEnviar(e: FormEvent) {
    e.preventDefault();
    enviar(texto);
  }

  return createPortal(
    <div className={styles.capa}>
      <div className={styles.scrim} onClick={onCerrar} aria-hidden="true" />
      <div ref={dialogo} className={styles.panel} role="dialog" aria-modal="true" aria-label="Pregúntame" tabIndex={-1}>
        <header className={styles.cabecera}>
          <div className={styles.titulos}>
            <span className={styles.kicker}>Tus datos</span>
            <span className={styles.titulo}>{vista === "chat" ? "Pregúntame" : "Conversaciones"}</span>
          </div>
          <div className={styles.acciones}>
            {vista === "chat" ? (
              <button
                type="button"
                className={styles.accion}
                onClick={() => {
                  setVista("historial");
                  cargarHistorial();
                }}
                disabled={enviando}
              >
                Historial
              </button>
            ) : (
              <button type="button" className={styles.accion} onClick={() => setVista("chat")}>
                Volver
              </button>
            )}
            <button type="button" className={styles.accion} onClick={nueva} disabled={enviando}>
              Nueva
            </button>
            <button type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar">
              ✕
            </button>
          </div>
        </header>

        {vista === "historial" ? (
          <div className={styles.cuerpo}>
            {conversaciones === null ? (
              <span className={styles.nota}>Cargando…</span>
            ) : conversaciones.length === 0 ? (
              <span className={styles.nota}>Aún no hay conversaciones.</span>
            ) : (
              conversaciones.map((c) => (
                <div key={c.id} className={styles.conversacion}>
                  <button type="button" className={styles.conversacionAbrir} onClick={() => abrirConversacion(c.id)}>
                    <b>{c.titulo}</b>
                    <small>{fechaCorta(c.actualizado_en)}</small>
                  </button>
                  <button
                    type="button"
                    className={styles.borrar}
                    onClick={() => borrarConversacion(c.id)}
                    aria-label={`Borrar «${c.titulo}»`}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            <div className={styles.cuerpo} aria-live="polite">
              {burbujas.length === 0 && (
                <div className={styles.vacio}>
                  <span className={styles.nota}>
                    Pregunta lo que quieras sobre tus gastos, tus libros o tu entrenamiento.
                  </span>
                  {SUGERENCIAS.map((s) => (
                    <button key={s} type="button" className={styles.sugerencia} onClick={() => enviar(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {burbujas.map((b, i) =>
                b.rol === "user" ? (
                  <div key={i} className={styles.usuario}>
                    {b.texto}
                  </div>
                ) : (
                  <div
                    key={i}
                    className={`${styles.asistente} ${b.error ? styles.error : ""}`}
                    aria-busy={b.pendiente || undefined}
                  >
                    {b.agentes.length > 0 && (
                      <div className={styles.agentes}>
                        {b.agentes.map((a) => (
                          <span key={a} className={`${styles.agente} ${styles[a]}`}>
                            {NOMBRES[a]}
                          </span>
                        ))}
                      </div>
                    )}
                    {b.acciones?.map((a) => (
                      <div
                        key={a.id}
                        className={`${styles.accionHecha} ${a.estado === "deshecha" ? styles.accionDeshecha : ""}`}
                      >
                        <span className={styles.accionTexto}>
                          {a.estado === "deshecha" ? "Deshecho: " : "Hecho: "}
                          {a.descripcion}
                        </span>
                        {a.deshacible && a.estado !== "deshecha" && (
                          <button
                            type="button"
                            className={styles.deshacer}
                            onClick={() => deshacer(a.id)}
                            disabled={a.estado === "deshaciendo"}
                          >
                            {a.estado === "fallida" ? "Reintentar" : "Deshacer"}
                          </button>
                        )}
                      </div>
                    ))}
                    {b.texto ? (
                      <TextoRespuesta texto={b.texto} />
                    ) : (
                      b.pendiente && (
                        <span className={styles.pensando}>
                          {b.agentes.length ? "Consultando tus datos…" : "Pensando…"}
                        </span>
                      )
                    )}
                  </div>
                )
              )}
              <div ref={fondo} />
            </div>

            <form className={styles.entrada} onSubmit={alEnviar}>
              <textarea
                className={styles.campo}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    enviar(texto);
                  }
                }}
                placeholder="Escribe tu pregunta…"
                aria-label="Tu pregunta"
                rows={1}
                maxLength={4000}
              />
              <button type="submit" className={styles.enviar} disabled={enviando || !texto.trim()} aria-label="Enviar">
                ↑
              </button>
            </form>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
