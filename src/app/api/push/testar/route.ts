import { NextResponse } from "next/server";

import { idDaSessao } from "@/lib/auth";
import { dispararPush, pushDisponivel } from "@/lib/push";

export async function POST() {
  const userId = await idDaSessao();
  if (!userId) return NextResponse.json({ erro: "Nao autorizado" }, { status: 401 });

  if (!pushDisponivel()) {
    return NextResponse.json({ erro: "Chaves VAPID nao configuradas" }, { status: 400 });
  }

  const enviados = await dispararPush(userId, {
    titulo: "Representei funcionando",
    corpo: "É assim que os avisos de rota e comissão vão chegar.",
    url: "/",
    tipo: "SISTEMA",
  });

  return NextResponse.json({ ok: true, enviados });
}
