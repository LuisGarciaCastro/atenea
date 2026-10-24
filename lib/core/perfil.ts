/** Nombre con el que saluda la app. Opcional: sin él, el saludo va sin nombre. */
export const NOMBRE = process.env.NEXT_PUBLIC_NOMBRE?.trim() ?? "";

/** Email de contacto de /privacidad. Opcional: sin él, la sección de contacto no sale. */
export const CONTACTO_PRIVACIDAD = process.env.NEXT_PUBLIC_CONTACTO_PRIVACIDAD?.trim() ?? "";
