import { NextResponse } from "next/server";

import { idDaSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(requisicao: Request) {
  const userId = await idDaSessao();
  if (!userId) return NextResponse.json({ erro: "Nao autorizado" }, { status: 401 });

  const corpo = await requisicao.json().catch(() => null);
  const endpoint = corpo?.endpoint;
  const p256dh = corpo?.keys?.p256dh;
  const auth = corpo?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ erro: "Inscricao incompleta" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId,
      endpoint,
      p256dh,
      auth,
      userAgent: requisicao.headers.get("user-agent") ?? undefined,
    },
    update: { userId, p256dh, auth },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(requisicao: Request) {
  const userId = await idDaSessao();
  if (!userId) return NextResponse.json({ erro: "Nao autorizado" }, { status: 401 });

  const corpo = await requisicao.json().catch(() => null);
  if (corpo?.endpoint) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: corpo.endpoint, userId } });
  }
  return NextResponse.json({ ok: true });
}
