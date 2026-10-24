"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Hoja from "@/app/components/ui/Hoja";
import Segmentado from "@/app/components/ui/Segmentado";
import form from "@/app/components/ui/formulario.module.css";
import styles from "./notas.module.css";
import {
  MAX_TEXTO_NOTA,
  MAX_TITULO_NOTA,
  NOMBRE_TIPO_NOTA,
  TIPOS_NOTA,
  type Nota,
  type TipoNota,
} from "@/lib/notas/tipos";

const OPCIONES_TIPO = TIPOS_NOTA.map((t) => ({ value: t, label: NOMBRE_TIPO_NOTA[t] }));

/** Crear una nota (sin `nota`) o editarla, marcarla como hecha y borrarla. */
export default function HojaNota({
  nota,
  tipoInicial = "idea",
  onGuardada,
  onBorrada,
  onCerrar,
}: {
  nota?: Nota;
  tipoInicial?: TipoNota;
  onGuardada: (nota: Nota) => void;
  onBorrada: (id: number) => void;
  onCerrar: () => void;
}) {
  const [tipo, setTipo] = useState<TipoNota>(nota?.tipo ?? tipoInicial);
  const [titulo, setTitulo] = useState(nota?.titulo ?? "");
  const [texto, setTexto] = useState(nota?.texto ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pedir(url: string, metodo: string, cuerpo?: unknown): Promise<Response | null> {
    setGuardando(true);
    setError(null);
    const res = await fetch(url, {
      method: metodo,
      headers: cuerpo === undefined ? undefined : { "Content-Type": "application/json" },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    }).catch(() => null);
    setGuardando(false);
    if (!res?.ok) {
      setError("No he podido guardarlo. Inténtalo otra vez.");
      return null;
    }
    return res;
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    const cuerpo = { tipo, titulo, texto: texto.trim() || null };
    const res = nota
      ? await pedir(`/api/notas/${nota.id}`, "PATCH", cuerpo)
      : await pedir("/api/notas", "POST", cuerpo);
    if (!res) return;
    onGuardada(((await res.json()) as { nota: Nota }).nota);
    onCerrar();
  }

  async function alternarHecha() {
    if (!nota) return;
    const res = await pedir(`/api/notas/${nota.id}`, "PATCH", { hecha: !nota.hecha });
    if (!res) return;
    onGuardada(((await res.json()) as { nota: Nota }).nota);
    onCerrar();
  }

  async function borrar() {
    if (!nota || !window.confirm(`¿Borrar «${nota.titulo}»?`)) return;
    if (!(await pedir(`/api/notas/${nota.id}`, "DELETE"))) return;
    onBorrada(nota.id);
    onCerrar();
  }

  return (
    <Hoja
      kicker={nota ? NOMBRE_TIPO_NOTA[nota.tipo] : "Ideas"}
      titulo={nota ? "Editar nota" : "Nueva nota"}
      onCerrar={onCerrar}
    >
      <form className={form.formulario} onSubmit={guardar}>
        <Segmentado options={OPCIONES_TIPO} value={tipo} onChange={setTipo} />
        <input
          className={form.input}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder={
            tipo === "articulo" ? "Título del artículo" : tipo === "investigar" ? "Qué quieres investigar" : "Tu idea"
          }
          aria-label="Título"
          maxLength={MAX_TITULO_NOTA}
          autoFocus={!nota}
          required
        />
        <textarea
          className={styles.texto}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Desarróllala: contexto, enlaces, por dónde empezar…"
          aria-label="Texto"
          maxLength={MAX_TEXTO_NOTA}
        />
        {error && (
          <span className={form.error} role="alert">
            {error}
          </span>
        )}
        <button type="submit" className={form.guardar} disabled={guardando || !titulo.trim()}>
          {nota ? "Guardar cambios" : "Guardar"}
        </button>
        {nota && (
          <>
            <button type="button" className={form.pill} onClick={alternarHecha} disabled={guardando}>
              {nota.hecha ? "Volver a pendientes" : "Marcar como hecha"}
            </button>
            <button type="button" className={form.enlaceDestructivo} onClick={borrar} disabled={guardando}>
              Borrar nota
            </button>
          </>
        )}
      </form>
    </Hoja>
  );
}
