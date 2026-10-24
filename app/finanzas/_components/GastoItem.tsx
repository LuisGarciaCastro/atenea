import comun from "@/app/components/ui/comun.module.css";
import styles from "@/app/finanzas/analisis.module.css";
import { iconoDeGasto } from "@/app/components/ui/iconos";
import { CATEGORIAS_GASTO, type Gasto } from "@/lib/finanzas/tipos";
import { colorParaCategoria } from "@/lib/finanzas/calc";
import { formatoDinero } from "@/app/finanzas/formato";
import { fechaCorta } from "@/app/components/ui/fechas";

export default function GastoItem({
  gasto,
  editando,
  formCategoria,
  formImporte,
  onEmpezarEdicion,
  onCategoriaChange,
  onImporteChange,
  onGuardar,
  onCancelar,
  onBorrar,
  mostrarFecha = false,
}: {
  gasto: Gasto;
  editando: boolean;
  formCategoria: string;
  formImporte: string;
  onEmpezarEdicion: (gasto: Gasto) => void;
  onCategoriaChange: (valor: string) => void;
  onImporteChange: (valor: string) => void;
  onGuardar: (id: number) => void;
  onCancelar: () => void;
  onBorrar: (id: number) => void;
  mostrarFecha?: boolean;
}) {
  const g = gasto;

  if (editando) {
    return (
      <div className={styles.gastoEdicion}>
        <select aria-label="Categoría" value={formCategoria} onChange={(e) => onCategoriaChange(e.target.value)}>
          {CATEGORIAS_GASTO.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={formImporte}
          onChange={(e) => onImporteChange(e.target.value)}
          inputMode="decimal"
          placeholder="Importe"
          aria-label="Importe"
        />
        <button type="button" className={styles.gastoGuardar} onClick={() => onGuardar(g.id)}>
          Guardar
        </button>
        <button type="button" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="button" className={styles.gastoCancelDel} onClick={() => onBorrar(g.id)}>
          Eliminar
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={comun.row}
      style={{ width: "100%", textAlign: "left" }}
      onClick={() => onEmpezarEdicion(g)}
    >
      <span className={comun.ic} style={{ background: colorParaCategoria(g.categoria) }}>
        {iconoDeGasto(g.categoria)}
      </span>
      <span className={comun.rowT}>
        <b>{g.descripcion ?? g.texto_original}</b>
        <span>
          {mostrarFecha ? `${fechaCorta(g.fecha)} · ` : ""}
          {g.estado === "pendiente_categorizar" ? "Pendiente de categorizar" : g.categoria}
        </span>
      </span>
      <span className={comun.rowAmt}>{g.importe != null ? formatoDinero(Number(g.importe)) : "—"}</span>
    </button>
  );
}
