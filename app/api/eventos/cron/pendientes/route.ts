import { NextResponse } from "next/server";
import { listarEventosPendientes } from "@/lib/eventos/db";
import { conToken } from "@/lib/core/autorizacion";

export const GET = conToken("EVENTOS_CRON_SECRET", async () =>
  NextResponse.json({ eventos: await listarEventosPendientes() })
);
