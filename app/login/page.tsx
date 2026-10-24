import shellStyles from "@/app/components/ui/marco.module.css";
import comun from "@/app/components/ui/comun.module.css";
import { NOMBRE } from "@/lib/core/perfil";
import styles from "./login.module.css";

interface LoginPageProps {
  searchParams: Promise<{ from?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const from = params.from ?? "/";

  return (
    <div className={shellStyles.shell}>
      <div className={styles.center}>
        <form className={styles.card} action="/api/login" method="POST">
          <span className={styles.marca} aria-hidden="true">
            A
          </span>
          <h1 className={comun.h1}>Atenea</h1>
          <span className={styles.kicker}>Hola de nuevo{NOMBRE ? `, ${NOMBRE}` : ""}</span>
          <input type="hidden" name="from" value={from} />
          <input
            className={styles.input}
            type="password"
            name="password"
            placeholder="Contraseña"
            aria-label="Contraseña"
            autoComplete="current-password"
            autoFocus
            required
          />
          <button className={comun.btn} type="submit">
            Entrar
          </button>
          {params.error && (
            <p className={styles.error} role="alert">
              {params.error === "bloqueado" ? "Demasiados intentos. Espera unos minutos." : "Contraseña incorrecta."}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
