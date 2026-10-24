import { NextResponse } from "next/server";
import { listarConversaciones } from "@/lib/chat/db";
import { conErrores } from "@/lib/core/api";

export const GET = conErrores(async () => NextResponse.json({ conversaciones: await listarConversaciones() }));
