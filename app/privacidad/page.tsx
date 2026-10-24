import Link from "next/link";
import type { Metadata } from "next";
import comun from "@/app/components/ui/comun.module.css";
import shellStyles from "@/app/components/ui/marco.module.css";
import { T } from "@/app/components/ui/iconos";
import { CONTACTO_PRIVACIDAD as CONTACTO } from "@/lib/core/perfil";
import styles from "./privacidad.module.css";

export const metadata: Metadata = {
  title: "Privacidad — Atenea",
};

export default function PrivacidadPage() {
  return (
    <div className={shellStyles.shell}>
      <div className={shellStyles.content}>
        <Link href="/" className={comun.back}>
          {T.volver} Atenea
        </Link>

        <h1 className={comun.h1} style={{ marginTop: 8 }}>
          Política de privacidad
        </h1>
        <p className={styles.updated}>Última actualización: 26 de septiembre de 2026</p>

        <div className={`${comun.w} ${comun.wIn}`}>
          <div className={styles.section}>
            <h2>Una aplicación personal</h2>
            <p>
              Atenea es el hub personal de un único usuario (quien la despliega y la usa). No es un servicio público ni
              está pensada para que se registren otras personas: no hay altas de usuarios, ni planes, ni un equipo
              detrás. Es, en la práctica, una libreta y un panel de control personal con forma de aplicación web.
            </p>
          </div>

          <div className={styles.section}>
            <h2>Qué datos se manejan</h2>
            <p>La aplicación guarda y muestra datos de uso estrictamente personal:</p>
            <ul>
              <li>Gastos y finanzas personales.</li>
              <li>Libros leídos y en progreso.</li>
              <li>Tareas y pendientes.</li>
              <li>Notas generadas a partir de vídeos procesados (por ejemplo, de YouTube).</li>
              <li>Eventos de calendario.</li>
            </ul>
            <p>
              Estos datos se usan únicamente para la organización personal de su usuario: llevar cuentas, seguimiento de
              lecturas, gestión de tareas y notas de contenido. No se usan con ningún otro fin.
            </p>
          </div>

          <div className={styles.section}>
            <h2>No se comparte con terceros</h2>
            <p>
              Los datos no se venden, ni se ceden, ni se comparten con terceros. Se almacenan en la infraestructura
              propia de la aplicación y solo son accesibles por su usuario.
            </p>
          </div>

          <div className={styles.section}>
            <h2>Acceso a Google Calendar</h2>
            <p>
              Cuando se conecta con Google Calendar, la aplicación usa ese acceso únicamente para crear y leer eventos
              en el propio calendario personal de su usuario, con el fin de reflejar tareas y planes en el calendario.
              No se accede a calendarios de otras personas, ni se usa la información para ningún otro propósito, ni se
              comparte con terceros.
            </p>
          </div>

          {CONTACTO && (
            <div className={styles.section}>
              <h2>Contacto</h2>
              <p>
                Si tienes alguna pregunta sobre esta política, puedes escribir a{" "}
                <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
