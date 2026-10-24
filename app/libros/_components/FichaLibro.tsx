"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import styles from "../estanteria.module.css";
import Hoja from "@/app/components/ui/Hoja";
import form from "@/app/components/ui/formulario.module.css";
import { useCaptura } from "@/app/components/ui/captura/CapturaContext";
import type { Libro } from "@/lib/libros/tipos";

const ESPERA_GUARDADO_MS = 400;

export default function FichaLibro({
  libro,
  onCerrar,
  onActualizado,
  onQuitado,
}: {
  libro: Libro;
  onCerrar: () => void;
  onActualizado: (libro: Libro) => void;
  onQuitado: () => void;
}) {
  const { avisar } = useCaptura();
  const [pagina, setPagina] = useState(libro.pagina_actual ?? 0);
  const [paginasTexto, setPaginasTexto] = useState("");
  const pendiente = useRef<{ timer: ReturnType<typeof setTimeout>; guardar: () => void } | null>(null);
  // Número de la última petición: la respuesta de una anterior que llegue tarde no pisa a la nueva.
  const ultimaPeticion = useRef(0);

  useEffect(() => setPagina(libro.pagina_actual ?? 0), [libro.pagina_actual]);

  // Al cerrar la hoja con un cambio de página aún en espera, se guarda en vez de perderlo.
  useEffect(
    () => () => {
      if (!pendiente.current) return;
      clearTimeout(pendiente.current.timer);
      pendiente.current.guardar();
    },
    []
  );

  async function patch(cambios: Partial<Pick<Libro, "estado" | "pagina_actual" | "paginas_totales" | "valoracion">>) {
    const numero = ++ultimaPeticion.current;
    const res = await fetch(`/api/libros/${libro.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cambios),
    }).catch(() => null);
    const vigente = numero === ultimaPeticion.current;
    if (!res?.ok) {
      avisar("No he podido guardarlo");
      // La página vuelve a la guardada para no enseñar una que no se ha guardado.
      if (vigente) setPagina(libro.pagina_actual ?? 0);
      return null;
    }
    const { libro: actualizado } = (await res.json()) as { libro: Libro };
    if (vigente) onActualizado(actualizado);
    return actualizado;
  }

  function irAPagina(nueva: number, inmediato = false) {
    const total = libro.paginas_totales ?? 0;
    const p = Math.max(0, Math.min(total, Math.round(nueva)));
    setPagina(p);
    if (pendiente.current) clearTimeout(pendiente.current.timer);
    pendiente.current = null;
    const guardar = async () => {
      if (p >= total) {
        const hecho = await patch({ pagina_actual: total, estado: "leido" });
        if (hecho) avisar("¡Uno más terminado!");
      } else {
        await patch({ pagina_actual: p });
      }
    };
    if (inmediato) {
      guardar();
      return;
    }
    const timer = setTimeout(() => {
      pendiente.current = null;
      guardar();
    }, ESPERA_GUARDADO_MS);
    pendiente.current = { timer, guardar };
  }

  async function fijarPaginas(e: FormEvent) {
    e.preventDefault();
    const n = Number(paginasTexto);
    if (!Number.isInteger(n) || n <= 0) return;
    await patch({ paginas_totales: n });
  }

  async function empezar() {
    const hecho = await patch({ estado: "leyendo" });
    if (hecho) avisar("¡A leer!");
  }

  async function quitar() {
    if (!window.confirm(`¿Quitar «${libro.titulo}» de la estantería?`)) return;
    const res = await fetch(`/api/libros/${libro.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) return avisar("No he podido quitarlo");
    avisar("Quitado");
    onQuitado();
  }

  const total = libro.paginas_totales;
  const pct = total ? Math.min(100, Math.round((pagina / total) * 100)) : 0;
  const valoracion = libro.valoracion ?? 0;

  return (
    <Hoja kicker={libro.autor ?? "Autor desconocido"} titulo={libro.titulo} onCerrar={onCerrar}>
      {libro.portada_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.fichaPortada}
          src={libro.portada_url}
          alt={`Portada de ${libro.titulo}`}
          width={72}
          height={108}
        />
      )}

      {libro.estado === "leyendo" &&
        (total ? (
          <>
            <div className={styles.fichaProgreso}>
              <span className={styles.fichaPct}>{pct}%</span>
              <span className={styles.fichaPagina}>
                pág. {pagina} de {total}
              </span>
            </div>
            <input
              type="range"
              className={styles.deslizador}
              min={0}
              max={total}
              value={pagina}
              onChange={(e) => irAPagina(Number(e.target.value))}
              aria-label="Página actual"
            />
            <div className={styles.saltos}>
              {[10, 25, 50].map((n) => (
                <button key={n} type="button" className={form.pill} onClick={() => irAPagina(pagina + n, true)}>
                  +{n} pág.
                </button>
              ))}
            </div>
            <button
              type="button"
              className={`${form.pillGrande} ${styles.terminar}`}
              onClick={() => irAPagina(total, true)}
            >
              ¡Lo he terminado!
            </button>
          </>
        ) : (
          <form className={styles.fijarPaginas} onSubmit={fijarPaginas}>
            <span className={form.nota}>¿Cuántas páginas tiene?</span>
            <input
              className={form.input}
              value={paginasTexto}
              onChange={(e) => setPaginasTexto(e.target.value)}
              inputMode="numeric"
              placeholder="Págs."
              aria-label="Páginas totales"
            />
            <button type="submit" className={form.guardar}>
              Guardar
            </button>
          </form>
        ))}

      {libro.estado === "quiero_leer" && (
        <>
          <span className={form.nota}>{total ? `${total} páginas esperándote` : "Te está esperando"}</span>
          <button type="button" className={`${form.pillGrande} ${styles.empezar}`} onClick={empezar}>
            Empezar a leer
          </button>
        </>
      )}

      {libro.estado === "leido" && (
        <>
          <span className={form.nota}>¿Qué te pareció?</span>
          <div className={styles.valorar}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`${styles.estrella} ${valoracion >= n ? styles.estrellaOn : ""}`}
                onClick={() => patch({ valoracion: n })}
                aria-label={`Valorar con ${n} estrella${n === 1 ? "" : "s"}`}
                aria-pressed={valoracion >= n}
              >
                ★
              </button>
            ))}
          </div>
        </>
      )}

      <button type="button" className={form.enlaceDestructivo} onClick={quitar}>
        Quitar de la estantería
      </button>
    </Hoja>
  );
}
