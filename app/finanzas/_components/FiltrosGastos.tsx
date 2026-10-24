import comun from "@/app/components/ui/comun.module.css";
import styles from "@/app/finanzas/analisis.module.css";
import { T } from "@/app/components/ui/iconos";
import type { OrdenGastos } from "@/lib/finanzas/calc";
import { CATEGORIAS_GASTO } from "@/lib/finanzas/tipos";

export interface EstadoFiltros {
  categoria: string;
  texto: string;
  importeMin: string;
  desde: string;
  hasta: string;
  orden: OrdenGastos;
}

export function filtrosVacios(): EstadoFiltros {
  return { categoria: "", texto: "", importeMin: "", desde: "", hasta: "", orden: "fecha" };
}

function hayFiltrosActivos(f: EstadoFiltros): boolean {
  return (
    f.categoria !== "" ||
    f.texto !== "" ||
    f.importeMin !== "" ||
    f.desde !== "" ||
    f.hasta !== "" ||
    f.orden !== "fecha"
  );
}

export default function FiltrosGastos({
  filtros,
  onChange,
}: {
  filtros: EstadoFiltros;
  onChange: (filtros: EstadoFiltros) => void;
}) {
  function set<K extends keyof EstadoFiltros>(campo: K, valor: EstadoFiltros[K]) {
    onChange({ ...filtros, [campo]: valor });
  }

  return (
    <div>
      <label className={comun.search}>
        {T.lupa}
        <input
          type="text"
          placeholder="Buscar por descripción…"
          aria-label="Buscar por descripción"
          value={filtros.texto}
          onChange={(e) => set("texto", e.target.value)}
        />
      </label>
      <div className={styles.filtrosFila}>
        <select aria-label="Categoría" value={filtros.categoria} onChange={(e) => set("categoria", e.target.value)}>
          <option value="">Todas las categorías</option>
          {CATEGORIAS_GASTO.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select aria-label="Orden" value={filtros.orden} onChange={(e) => set("orden", e.target.value as OrdenGastos)}>
          <option value="fecha">Más recientes primero</option>
          <option value="importe-desc">Importe: mayor a menor</option>
          <option value="importe-asc">Importe: menor a mayor</option>
        </select>
      </div>
      <div className={styles.filtrosFila}>
        <input
          type="number"
          inputMode="decimal"
          placeholder="Importe mínimo"
          aria-label="Importe mínimo"
          value={filtros.importeMin}
          onChange={(e) => set("importeMin", e.target.value)}
        />
        <label className={styles.filtroFecha}>
          Desde
          <input type="date" value={filtros.desde} onChange={(e) => set("desde", e.target.value)} />
        </label>
        <label className={styles.filtroFecha}>
          Hasta
          <input type="date" value={filtros.hasta} onChange={(e) => set("hasta", e.target.value)} />
        </label>
      </div>
      {hayFiltrosActivos(filtros) && (
        <button type="button" className={styles.filtrosLimpiar} onClick={() => onChange(filtrosVacios())}>
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
