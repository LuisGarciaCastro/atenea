"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Hoja from "@/app/components/ui/Hoja";
import form from "@/app/components/ui/formulario.module.css";
import { capitalizar, fechaCercana } from "@/app/components/ui/fechas";
import { CATEGORIAS_GASTO, type Gasto } from "@/lib/finanzas/tipos";
import { colorParaCategoria } from "@/lib/finanzas/calc";

/**
 * Detalle de un gasto: se abre al tocar la fila. Aquí se corrige la categoría,
 * el importe o el concepto, y se borra (con confirmación), en vez de una «×»
 * en cada fila que se puede pulsar sin querer.
 */
export default function HojaGasto({
  gasto,
  onCerrar,
  onGuardado,
  onBorrar,
}: {
  gasto: Gasto;
  onCerrar: () => void;
  onGuardado: (gasto: Gasto) => void;
  onBorrar: () => void;
}) {
  const [categoria, setCategoria] = useState(gasto.categoria ?? "");
  const [importe, setImporte] = useState(gasto.importe !== null ? String(gasto.importe).replace(".", ",") : "");
  const [concepto, setConcepto] = useState(gasto.descripcion ?? gasto.texto_original);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const valor = Number(importe.replace(",", "."));
    if (!(valor > 0)) return setError("Pon un importe válido");
    setEnviando(true);
    const res = await fetch(`/api/finanzas/${gasto.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ importe: valor, categoria: categoria || undefined, descripcion: concepto.trim() }),
    }).catch(() => null);
    setEnviando(false);
    if (!res?.ok) return setError("No he podido guardarlo. Inténtalo otra vez.");
    onGuardado({
      ...gasto,
      importe: valor,
      categoria: categoria || gasto.categoria,
      descripcion: concepto.trim(),
      estado: categoria ? "categorizado" : gasto.estado,
    });
  }

  function borrar() {
    if (window.confirm("¿Borrar este gasto?")) onBorrar();
  }

  return (
    <Hoja
      kicker={capitalizar(fechaCercana(gasto.fecha))}
      titulo={gasto.descripcion ?? gasto.texto_original}
      onCerrar={onCerrar}
    >
      <form className={form.formulario} onSubmit={guardar}>
        <input
          className={form.input}
          value={importe}
          onChange={(e) => {
            setImporte(e.target.value);
            setError("");
          }}
          inputMode="decimal"
          aria-label="Importe en euros"
          placeholder="Importe (€)"
        />
        <input
          className={form.input}
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          aria-label="Concepto"
          placeholder="Concepto"
        />
        <span className={form.nota}>Categoría</span>
        <div className={form.chips}>
          {CATEGORIAS_GASTO.map((c) => (
            <button
              key={c}
              type="button"
              className={`${form.chip} ${categoria === c ? form.chipColor : ""}`}
              style={categoria === c ? { background: colorParaCategoria(c) } : undefined}
              aria-pressed={categoria === c}
              onClick={() => setCategoria(c)}
            >
              {c}
            </button>
          ))}
        </div>
        {error && (
          <span className={form.error} role="alert">
            {error}
          </span>
        )}
        <button type="submit" className={form.guardar} disabled={enviando}>
          Guardar cambios
        </button>
        <button type="button" className={form.enlaceDestructivo} onClick={borrar}>
          Borrar gasto
        </button>
      </form>
    </Hoja>
  );
}
