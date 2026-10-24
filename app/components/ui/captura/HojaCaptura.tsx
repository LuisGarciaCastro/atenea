"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import Hoja from "../Hoja";
import { T } from "../iconos";
import form from "../formulario.module.css";
import styles from "./captura.module.css";
import { useCaptura } from "./CapturaContext";
import { CATEGORIAS_GASTO, type CategoriaGasto } from "@/lib/finanzas/tipos";
import { colorParaCategoria } from "@/lib/finanzas/calc";

const CABECERAS = {
  pick: { kicker: "Apunta algo", titulo: "¿Qué traes hoy?" },
  gasto: { kicker: "Hucha", titulo: "Nuevo gasto" },
  libro: { kicker: "Libros", titulo: "Nuevo libro" },
  enlace: { kicker: "Ideas", titulo: "Guardar enlace" },
} as const;

export default function HojaCaptura() {
  const { hoja, abrir, cerrar } = useCaptura();
  if (!hoja) return null;

  const { kicker, titulo } = CABECERAS[hoja];
  return (
    <Hoja kicker={kicker} titulo={titulo} onCerrar={cerrar}>
      {hoja === "pick" && (
        <div className={styles.arcos}>
          <button type="button" className={`${styles.arco} ${styles.arcoGasto}`} onClick={() => abrir("gasto")}>
            <span className={styles.arcoSimbolo}>€</span>
            <span>Gasto</span>
          </button>
          <button type="button" className={`${styles.arco} ${styles.arcoLibro}`} onClick={() => abrir("libro")}>
            <span className={styles.arcoIcono}>{T.libro}</span>
            <span>Libro</span>
          </button>
          <button type="button" className={`${styles.arco} ${styles.arcoEnlace}`} onClick={() => abrir("enlace")}>
            <span className={styles.arcoIcono}>{T.enlace}</span>
            <span>Enlace</span>
          </button>
        </div>
      )}
      {hoja === "gasto" && <FormGasto />}
      {hoja === "libro" && <FormLibro />}
      {hoja === "enlace" && <FormEnlace />}
    </Hoja>
  );
}

function FormGasto() {
  const { guardado } = useCaptura();
  const [importe, setImporte] = useState("");
  const [categoria, setCategoria] = useState<CategoriaGasto | null>(null);
  const [concepto, setConcepto] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const valor = Number(importe.replace(",", "."));
    if (!(valor > 0)) return setError("Pon un importe primero");
    setEnviando(true);
    const res = await fetch("/api/finanzas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ importe: valor, categoria, descripcion: concepto.trim() || null }),
    }).catch(() => null);
    setEnviando(false);
    if (!res?.ok) return setError("No he podido guardarlo. Inténtalo otra vez.");
    guardado("Apuntado ✓");
  }

  return (
    <form className={form.formulario} onSubmit={guardar}>
      <div className={styles.importe}>
        <input
          className={styles.importeInput}
          value={importe}
          onChange={(e) => {
            setImporte(e.target.value);
            setError("");
          }}
          inputMode="decimal"
          placeholder="0"
          aria-label="Importe"
          autoFocus
        />
        <span className={styles.moneda}>€</span>
      </div>
      <div className={form.chips}>
        {CATEGORIAS_GASTO.map((c) => (
          <button
            key={c}
            type="button"
            className={`${form.chip} ${categoria === c ? form.chipColor : ""}`}
            style={categoria === c ? { background: colorParaCategoria(c) } : undefined}
            aria-pressed={categoria === c}
            onClick={() => setCategoria((actual) => (actual === c ? null : c))}
          >
            {c}
          </button>
        ))}
      </div>
      <input
        className={form.input}
        value={concepto}
        onChange={(e) => setConcepto(e.target.value)}
        placeholder="¿En qué? (opcional)"
        aria-label="Concepto"
      />
      {error && (
        <span className={form.error} role="alert">
          {error}
        </span>
      )}
      <button type="submit" className={form.guardar} disabled={enviando}>
        Guardar
      </button>
    </form>
  );
}

interface ResultadoLibro {
  open_library_key: string;
  titulo: string;
  autor: string | null;
  portada_url: string | null;
}

const ESPERA_BUSQUEDA_MS = 400;

function FormLibro() {
  const { guardado } = useCaptura();
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ResultadoLibro[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [elegido, setElegido] = useState<ResultadoLibro | null>(null);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const buscar = useCallback(async (termino: string, signal: AbortSignal) => {
    setBuscando(true);
    try {
      const res = await fetch(`/api/libros/buscar?q=${encodeURIComponent(termino)}`, { signal });
      const data = await res.json();
      setResultados(data.resultados ?? []);
    } catch {
      if (!signal.aborted) setResultados([]);
    } finally {
      if (!signal.aborted) setBuscando(false);
    }
  }, []);

  useEffect(() => {
    const termino = query.trim();
    if (termino.length < 2) {
      setResultados([]);
      return;
    }
    const control = new AbortController();
    const t = setTimeout(() => buscar(termino, control.signal), ESPERA_BUSQUEDA_MS);
    return () => {
      clearTimeout(t);
      control.abort();
    };
  }, [query, buscar]);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!elegido) return setError("Busca el libro y elígelo de la lista");
    setEnviando(true);
    const res = await fetch("/api/libros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...elegido, estado: "quiero_leer" }),
    }).catch(() => null);
    setEnviando(false);
    if (!res?.ok) return setError("No he podido guardarlo. Inténtalo otra vez.");
    guardado("A la estantería");
  }

  return (
    <form className={form.formulario} onSubmit={guardar}>
      <input
        className={styles.tituloInput}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setElegido(null);
          setError("");
        }}
        placeholder="Título del libro"
        aria-label="Buscar libro"
        autoFocus
      />
      {buscando && <span className={form.nota}>Buscando…</span>}
      {resultados.length > 0 && (
        <div className={styles.resultados}>
          {resultados.map((r) => (
            <button
              key={r.open_library_key}
              type="button"
              className={`${styles.resultado} ${elegido?.open_library_key === r.open_library_key ? styles.resultadoOn : ""}`}
              aria-pressed={elegido?.open_library_key === r.open_library_key}
              onClick={() => setElegido(r)}
            >
              <b>{r.titulo}</b>
              <span>{r.autor ?? "Autor desconocido"}</span>
            </button>
          ))}
        </div>
      )}
      {error && (
        <span className={form.error} role="alert">
          {error}
        </span>
      )}
      <button type="submit" className={form.guardar} disabled={enviando}>
        Poner en la estantería
      </button>
    </form>
  );
}

function FormEnlace() {
  const { guardado } = useCaptura();
  const [url, setUrl] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!/^https?:\/\//i.test(url.trim())) return setError("Pega un enlace que empiece por http");
    setEnviando(true);
    const res = await fetch("/api/guardados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim(), nota: nota.trim() || null }),
    }).catch(() => null);
    setEnviando(false);
    if (!res?.ok) return setError("No he podido guardarlo. Revisa el enlace.");
    guardado("Guardado ✓");
  }

  return (
    <form className={form.formulario} onSubmit={guardar}>
      <input
        className={styles.tituloInput}
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          setError("");
        }}
        placeholder="https://…"
        aria-label="Enlace"
        inputMode="url"
        autoFocus
      />
      <input
        className={form.input}
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="¿Por qué lo guardas? (opcional)"
        aria-label="Nota"
      />
      <span className={form.nota}>Los vídeos de YouTube se procesan solos al mandarlos por Telegram.</span>
      {error && (
        <span className={form.error} role="alert">
          {error}
        </span>
      )}
      <button type="submit" className={form.guardar} disabled={enviando}>
        Guardar enlace
      </button>
    </form>
  );
}
