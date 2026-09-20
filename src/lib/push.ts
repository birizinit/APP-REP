import "server-only";

import webpush from "web-push";
import type { TipoNotificacao } from "@prisma/client";

import { prisma } from "@/lib/prisma";

let configurado = false;

function configurar(): boolean {
  if (configurado) return true;
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) return false;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:contato@representei.app",
    publica,
    privada,
  );
  configurado = true;
  return true;
}

export function pushDisponivel(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export interface Aviso {
  tipo?: TipoNotificacao;
  titulo: string;
  corpo: string;
  url?: string;
  icone?: string;
  /** Impede repetir o mesmo aviso (ex.: "comissao-<id>-3dias"). */
  chaveUnica?: string;
}

/**
 * Registra a notificacao no banco e dispara o push.
 * Se a chave unica ja existir, nao faz nada — o representante nao pode
 * ser bombardeado com o mesmo aviso todo dia.
 */
export async function avisar(userId: string, aviso: Aviso): Promise<boolean> {
  if (aviso.chaveUnica) {
    const jaExiste = await prisma.notification.findUnique({
      where: { chaveUnica: aviso.chaveUnica },
      select: { id: true },
    });
    if (jaExiste) return false;
  }

  const notificacao = await prisma.notification.create({
    data: {
      userId,
      tipo: aviso.tipo ?? "SISTEMA",
      titulo: aviso.titulo,
      corpo: aviso.corpo,
      url: aviso.url,
      icone: aviso.icone,
      chaveUnica: aviso.chaveUnica,
    },
  });

  await dispararPush(userId, {
    titulo: aviso.titulo,
    corpo: aviso.corpo,
    url: aviso.url ?? "/",
    id: notificacao.id,
    tipo: aviso.tipo ?? "SISTEMA",
  });

  return true;
}

/** Envia o push para todos os aparelhos registrados, limpando os mortos. */
export async function dispararPush(
  userId: string,
  dados: { titulo: string; corpo: string; url: string; id?: string; tipo?: string },
): Promise<number> {
  if (!configurar()) return 0;

  const inscricoes = await prisma.pushSubscription.findMany({ where: { userId } });
  if (inscricoes.length === 0) return 0;

  const payload = JSON.stringify(dados);
  let enviados = 0;
  const mortos: string[] = [];

  await Promise.all(
    inscricoes.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 60 * 60 * 12, urgency: "normal" },
        );
        enviados++;
      } catch (erro) {
        const status = (erro as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) mortos.push(s.id);
      }
    }),
  );

  if (mortos.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: mortos } } });
  }

  if (enviados > 0 && dados.id) {
    await prisma.notification.update({
      where: { id: dados.id },
      data: { enviadaPush: true },
    });
  }

  return enviados;
}
