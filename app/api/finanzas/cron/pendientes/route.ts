import { NextResponse } from "next/server";
import { listarGastosPendientes } from "@/lib/finanzas/db";
import { conToken } from "@/lib/core/autorizacion";

export const GET = conToken("FINANZAS_CRON_SECRET", async () =>
  NextResponse.json({ gastos: await listarGastosPendientes() })
);
