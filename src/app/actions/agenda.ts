"use server";

import { revalidatePath } from "next/cache";

import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { haversine } from "@/lib/rotas";
import type { ResultadoVisita, StatusCompromisso, TipoCompromisso } from "@prisma/client";

export async function criarCompromisso(dados: FormData) {
  const user = await exigirUsuario();

  const clientId = String(dados.get("clientId") ?? "") || null;
  const tipo = (String(dados.get("tipo") ?? "VISITA") as TipoCompromisso) || "VISITA";
  const inicioTexto = String(dados.get("inicio") ?? "");
  const duracao = Number(dados.get("duracao") ?? 45);

  if (!inicioTexto) return { erro: "Escolha a data e a hora." };

  const inicio = new Date(inicioTexto);
  if (Number.isNaN(inicio.getTime())) return { erro: "Data inválida." };

  const cliente = clientId
    ? await prisma.client.findFirst({ where: { id: clientId, userId: user.id } })
    : null;

  let titulo = String(dados.get("titulo") ?? "").trim();
  if (!titulo) {
    const nome = cliente?.nomeFantasia ?? cliente?.razaoSocial ?? "Compromisso";
    const prefixos: Record<string, string> = {
      VISITA: "Visita",
      PROSPECCAO: "Prospecção",
      COBRANCA: "Cobrança",
      ENTREGA: "Entrega",
      REUNIAO: "Reunião",
      TREINAMENTO: "Treinamento",
      POS_VENDA: "Pós-venda",
      PESSOAL: "Pessoal",
    };
    titulo = cliente ? `${prefixos[tipo] ?? "Compromisso"} — ${nome}` : prefixos[tipo] ?? "Compromisso";
  }

  await prisma.agendaEvent.create({
    data: {
      userId: user.id,
      clientId: cliente?.id ?? null,
      representadaId: String(dados.get("representadaId") ?? "") || null,
      tipo,
      titulo,
      descricao: String(dados.get("descricao") ?? "").trim() || null,
      local: cliente ? `${cliente.cidade ?? ""}${cliente.uf ? `/${cliente.uf}` : ""}` : null,
      inicio,
      fim: new Date(inicio.getTime() + duracao * 60_000),
      lembreteMin: Number(dados.get("lembreteMin") ?? 30) || null,
    },
  });

  if (cliente) {
    await prisma.client.update({
      where: { id: cliente.id },
      data: { proximaVisitaEm: inicio },
    });
  }

  revalidatePath("/agenda");
  revalidatePath("/");
  return { ok: true };
}

export async function mudarStatusCompromisso(id: string, status: StatusCompromisso) {
  const user = await exigirUsuario();
  await prisma.agendaEvent.updateMany({
    where: { id, userId: user.id },
    data: { status },
  });
  revalidatePath("/agenda");
  revalidatePath("/");
}

/**
 * Check-in com prova de localizacao: guarda a distancia entre onde o
 * representante esta e o endereco cadastrado do cliente.
 */
export async function registrarCheckin(id: string, lat?: number, lng?: number) {
  const user = await exigirUsuario();

  const evento = await prisma.agendaEvent.findFirst({
    where: { id, userId: user.id },
    include: { cliente: true },
  });
  if (!evento) return { erro: "Compromisso não encontrado." };

  let distancia: number | null = null;
  if (lat && lng && evento.cliente?.lat && evento.cliente?.lng) {
    distancia = Math.round(
      haversine({ lat, lng }, { lat: evento.cliente.lat, lng: evento.cliente.lng }) * 1000,
    );
  }

  await prisma.agendaEvent.update({
    where: { id },
    data: {
      status: "EM_ATENDIMENTO",
      checkinEm: new Date(),
      checkinLat: lat ?? null,
      checkinLng: lng ?? null,
      checkinDistanciaM: distancia,
    },
  });

  if (evento.clientId) {
    await prisma.client.update({
      where: { id: evento.clientId },
      data: { ultimaVisitaEm: new Date() },
    });
    await prisma.activity.create({
      data: {
        userId: user.id,
        clientId: evento.clientId,
        tipo: "visita",
        titulo: "Check-in na visita",
        descricao:
          distancia !== null
            ? `A ${distancia} m do endereço cadastrado.`
            : "Sem localização disponível no aparelho.",
      },
    });
  }

  revalidatePath("/agenda");
  revalidatePath("/");
  return { ok: true, distancia };
}

export async function concluirVisita(
  id: string,
  resultado: ResultadoVisita,
  notas?: string,
) {
  const user = await exigirUsuario();

  const evento = await prisma.agendaEvent.findFirst({
    where: { id, userId: user.id },
    include: { cliente: true },
  });
  if (!evento) return { erro: "Compromisso não encontrado." };

  await prisma.agendaEvent.update({
    where: { id },
    data: {
      status: "CONCLUIDO",
      resultado,
      checkoutEm: new Date(),
      notas: notas?.trim() || evento.notas,
    },
  });

  if (evento.clientId) {
    const cliente = evento.cliente!;
    const proxima = new Date();
    proxima.setDate(proxima.getDate() + (cliente.frequenciaVisitaDias || 30));

    await prisma.client.update({
      where: { id: evento.clientId },
      data: {
        ultimaVisitaEm: evento.checkinEm ?? new Date(),
        proximaVisitaEm: proxima,
        status: cliente.status === "PROSPECT" && resultado === "PEDIDO" ? "ATIVO" : cliente.status,
      },
    });

    const rotulos: Record<ResultadoVisita, string> = {
      PEDIDO: "Saiu pedido",
      ORCAMENTO: "Deixou orçamento",
      SEM_PEDIDO: "Sem pedido desta vez",
      CLIENTE_AUSENTE: "Cliente ausente",
      AGENDOU_RETORNO: "Agendou retorno",
      RECLAMACAO: "Registrou reclamação",
    };

    await prisma.activity.create({
      data: {
        userId: user.id,
        clientId: evento.clientId,
        tipo: "visita",
        titulo: `Visita concluída — ${rotulos[resultado]}`,
        descricao: notas?.trim() || null,
      },
    });
  }

  if (evento.routeStopId) {
    await prisma.routeStop.update({
      where: { id: evento.routeStopId },
      data: { status: "VISITADO" },
    });
  }

  revalidatePath("/agenda");
  revalidatePath("/");
  revalidatePath("/rotas");
  return { ok: true };
}

export async function excluirCompromisso(id: string) {
  const user = await exigirUsuario();
  await prisma.agendaEvent.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/agenda");
  revalidatePath("/");
}
