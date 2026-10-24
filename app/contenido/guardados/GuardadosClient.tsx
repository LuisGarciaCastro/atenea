"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import comun from "@/app/components/ui/comun.module.css";
import styles from "./guardados.module.css";
import { Cabecera, ErrorCarga, Esqueleto } from "@/app/components/ui/Rincon";
import { useDatos } from "@/app/components/ui/useDatos";
import Acciones from "@/app/components/ui/Acciones";
import type { Guardado } from "@/lib/guardados/tipos";

export default function GuardadosClient() {
  const {
    datos: guardados,
    error: errorCarga,
    recargar,
    mutar,
  } = useDatos("/api/guardados", (j) => (j as { guardados?: Guardado[] }).guardados ?? []);
  const [url, setUrl] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setAviso(null);
    const res = await fetch("/api/guardados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }).catch(() => null);
    if (!res?.ok) {
      setAviso("No he podido guardar ese enlace.");
      return;
    }
    const { guardado } = (await res.json()) as { guardado: Guardado };
    mutar((lista) => [guardado, ...lista.filter((g) => g.id !== guardado.id)]);
    setUrl("");
  }

  async function quitar(id: number) {
    const res = await fetch(`/api/guardados/${id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) mutar((lista) => lista.filter((g) => g.id !== id));
    else setAviso("No he podido quitarlo.");
  }

  return (
    <main className={comun.lectura}>
      <Cabecera
        separada
        kicker="Enlaces sin procesar"
        titulo="Guardados"
        volver={{ label: "Ideas", href: "/contenido?ver=guardados" }}
        acciones={<Acciones />}
      />

      <form onSubmit={guardar} className={comun.search}>
        <input
          aria-label="Enlace para guardar"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Pega un enlace para guardarlo…"
          inputMode="url"
        />
      </form>
      {aviso && (
        <p className={comun.empty} role="alert">
          {aviso}
        </p>
      )}

      {guardados === null ? (
        errorCarga ? (
          <ErrorCarga onReintentar={recargar} />
        ) : (
          <Esqueleto alto={120} />
        )
      ) : guardados.length === 0 ? (
        <p className={comun.empty}>Aún no has guardado nada.</p>
      ) : (
        <div className={comun.list}>
          {guardados.map((g) => (
            <div key={g.id} className={styles.fila}>
              <a href={g.url} target="_blank" rel="noopener noreferrer" className={styles.enlace}>
                <b className={styles.titulo}>{g.titulo ?? g.url}</b>
                <span className={comun.cap}>
                  {g.fuente}
                  {g.autor ? ` · ${g.autor}` : ""} · {new Date(g.creado_en).toLocaleDateString("es-ES")}
                </span>
                {g.nota && <span className={`${comun.cap} ${styles.nota}`}>{g.nota}</span>}
              </a>
              <button
                type="button"
                className={comun.chip}
                onClick={() => quitar(g.id)}
                aria-label={`Quitar «${g.titulo ?? g.url}» de guardados`}
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
