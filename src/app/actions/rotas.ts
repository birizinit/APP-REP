"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type ModoRota as ModoPrisma } from "@prisma/client";

import { exigirUsuario } from "@/lib/auth";
import { comHorario, num } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { montarRota, type ModoRota, type PerfilVeiculo, type Ponto } from "@/lib/rotas";

async function perfilDoVeiculo(userId: string, vehicleId?: string | null): Promise<{
  perfil: PerfilVeiculo | undefined;
  veiculo: Awaited<ReturnType<typeof prisma.vehicle.findFirst>>;
}> {
  const veiculo = vehicleId
    ? await prisma.vehicle.findFirst({ where: { id: vehicleId, userId } })
    : await prisma.vehicle.findFirst({ where: { userId, ativo: true }, orderBy: { padrao: "desc" } });

  if (!veiculo) return { perfil: undefined, veiculo: null };

  return {
    veiculo,
    perfil: {
      combustivel: veiculo.combustivel,
      flex: veiculo.flex,
      consumoCidade: veiculo.consumoCidade,
      consumoEstrada: veiculo.consumoEstrada,
      precoGasolina: num(veiculo.precoGasolina),
      precoEtanol: num(veiculo.precoEtanol),
      precoDiesel: num(veiculo.precoDiesel),
      precoKwh: num(veiculo.precoKwh),
      custoManutencaoKm: num(veiculo.custoManutencaoKm),
      pedagioMedioDia: num(veiculo.pedagioMedioDia),
    },
  };
}

export interface PreviaRota {
  ok: boolean;
  erro?: string;
  previa?: {
    modo: ModoRota;
    distanciaKm: number;
    duracaoMin: number;
    litros: number;
    combustivel: string;
    precoLitro: number;
    custoCombustivel: number;
    custoManutencao: number;
    custoPedagio: number;
    custoTotal: number;
    custoPorKm: number;
    kmEconomizados: number;
    reaisEconomizados: number;
    dicaCombustivel: string | null;
    provider: string;
    horaFim: string;
    estouraJornada: boolean;
    polyline: string | null;
    paradas: Array<{
      clientId: string | null;
      label: string;
      lat: number;
      lng: number;
      ordem: number;
      distanciaAnteriorKm: number;
      duracaoAnteriorMin: number;
      permanenciaMin: number;
      chegadaPrevista: string;
      saidaPrevista: string;
    }>;
  };
}

/**
 * Calcula a rota nos tres modos de uma vez para o usuario comparar
 * "mais rapido" x "mais barato" antes de salvar.
 */
export async function calcularPrevia(entrada: {
  clienteIds: string[];
  data: string;
  modo: ModoRota;
  vehicleId?: string | null;
  retornaBase?: boolean;
  otimizar?: boolean;
}): Promise<PreviaRota> {
  const user = await exigirUsuario();

  if (entrada.clienteIds.length === 0) {
    return { ok: false, erro: "Escolha pelo menos um cliente." };
  }
  if (!user.baseLat || !user.baseLng) {
    return {
      ok: false,
      erro: "Cadastre o endereço da sua base em Ajustes — é de onde a rota começa.",
    };
  }

  const clientes = await prisma.client.findMany({
    where: { id: { in: entrada.clienteIds }, userId: user.id },
  });

  const semCoordenada = clientes.filter((c) => !c.lat || !c.lng);
  const comCoordenada = clientes.filter((c) => c.lat && c.lng);

  if (comCoordenada.length === 0) {
    return {
      ok: false,
      erro: "Nenhum dos clientes escolhidos tem endereço localizado no mapa.",
    };
  }

  const { perfil } = await perfilDoVeiculo(user.id, entrada.vehicleId);

  const data = new Date(entrada.data);
  const inicio = comHorario(data, user.jornadaInicio);

  // mantem a ordem em que o usuario escolheu
  const ordenados = entrada.clienteIds
    .map((id) => comCoordenada.find((c) => c.id === id))
    .filter((c): c is (typeof comCoordenada)[number] => Boolean(c));

  const paradas: Ponto[] = ordenados.map((c) => ({
    id: c.id,
    clientId: c.id,
    lat: c.lat!,
    lng: c.lng!,
    label: c.nomeFantasia ?? c.razaoSocial,
    permanenciaMin: c.tempoVisitaMin,
  }));

  const resultado = await montarRota({
    origem: {
      id: "base",
      lat: user.baseLat,
      lng: user.baseLng,
      label: user.baseLabel ?? "Base",
    },
    paradas,
    modo: entrada.modo,
    veiculo: perfil,
    retornaBase: entrada.retornaBase ?? true,
    inicio,
    jornadaFim: user.jornadaFim,
    almocoInicio: user.almocoInicio,
    almocoMinutos: user.almocoMinutos,
    otimizar: entrada.otimizar ?? true,
  });

  return {
    ok: true,
    erro:
      semCoordenada.length > 0
        ? `${semCoordenada.length} cliente(s) ficaram de fora por não ter endereço no mapa.`
        : undefined,
    previa: {
      modo: entrada.modo,
      distanciaKm: resultado.custo.distanciaKm,
      duracaoMin: resultado.custo.duracaoMin,
      litros: resultado.custo.litros,
      combustivel: resultado.custo.combustivel,
      precoLitro: resultado.custo.precoLitro,
      custoCombustivel: resultado.custo.custoCombustivel,
      custoManutencao: resultado.custo.custoManutencao,
      custoPedagio: resultado.custo.custoPedagio,
      custoTotal: resultado.custo.custoTotal,
      custoPorKm: resultado.custo.custoPorKm,
      kmEconomizados: resultado.kmEconomizados,
      reaisEconomizados: resultado.reaisEconomizados,
      dicaCombustivel: resultado.custo.dicaCombustivel,
      provider: resultado.provider,
      horaFim: resultado.horaFim.toISOString(),
      estouraJornada: resultado.estouraJornada,
      polyline: resultado.polyline,
      paradas: resultado.paradas.map((p) => ({
        clientId: p.clientId ?? null,
        label: p.label,
        lat: p.lat,
        lng: p.lng,
        ordem: p.ordem,
        distanciaAnteriorKm: p.distanciaAnteriorKm,
        duracaoAnteriorMin: p.duracaoAnteriorMin,
        permanenciaMin: p.permanenciaMin,
        chegadaPrevista: p.chegadaPrevista.toISOString(),
        saidaPrevista: p.saidaPrevista.toISOString(),
      })),
    },
  };
}

/** Salva a rota calculada e, opcionalmente, joga as paradas na agenda. */
export async function salvarRota(entrada: {
  nome?: string;
  data: string;
  modo: ModoRota;
  vehicleId?: string | null;
  retornaBase?: boolean;
  criarAgenda?: boolean;
  previa: NonNullable<PreviaRota["previa"]>;
}) {
  const user = await exigirUsuario();
  const data = new Date(entrada.data);
  const p = entrada.previa;

  const rota = await prisma.route.create({
    data: {
      userId: user.id,
      nome: entrada.nome?.trim() || `Rota de ${data.toLocaleDateString("pt-BR")}`,
      data,
      vehicleId: entrada.vehicleId || null,
      modo: entrada.modo as ModoPrisma,
      status: "PLANEJADA",
      origemLabel: user.baseLabel,
      origemLat: user.baseLat,
      origemLng: user.baseLng,
      retornaBase: entrada.retornaBase ?? true,
      distanciaKm: p.distanciaKm,
      duracaoMin: Math.round(p.duracaoMin),
      consumoLitros: p.litros,
      custoCombustivel: new Prisma.Decimal(p.custoCombustivel.toFixed(2)),
      custoManutencao: new Prisma.Decimal(p.custoManutencao.toFixed(2)),
      custoPedagio: new Prisma.Decimal(p.custoPedagio.toFixed(2)),
      custoTotal: new Prisma.Decimal(p.custoTotal.toFixed(2)),
      kmEconomizados: p.kmEconomizados,
      reaisEconomizados: new Prisma.Decimal(p.reaisEconomizados.toFixed(2)),
      provider: p.provider,
      polyline: p.polyline,
      paradas: {
        create: p.paradas.map((parada) => ({
          clientId: parada.clientId,
          ordem: parada.ordem,
          label: parada.label,
          lat: parada.lat,
          lng: parada.lng,
          distanciaAnteriorKm: parada.distanciaAnteriorKm,
          duracaoAnteriorMin: parada.duracaoAnteriorMin,
          permanenciaMin: parada.permanenciaMin,
          chegadaPrevista: new Date(parada.chegadaPrevista),
          saidaPrevista: new Date(parada.saidaPrevista),
        })),
      },
    },
    include: { paradas: { include: { cliente: true } } },
  });

  if (entrada.criarAgenda) {
    for (const parada of rota.paradas) {
      if (!parada.clientId || !parada.chegadaPrevista) continue;
      const nome = parada.cliente?.nomeFantasia ?? parada.cliente?.razaoSocial ?? parada.label;

      const evento = await prisma.agendaEvent.create({
        data: {
          userId: user.id,
          clientId: parada.clientId,
          tipo: "VISITA",
          status: "PLANEJADO",
          titulo: `Visita — ${nome}`,
          local: parada.cliente ? `${parada.cliente.cidade ?? ""}/${parada.cliente.uf ?? ""}` : null,
          inicio: parada.chegadaPrevista,
          fim: parada.saidaPrevista ?? new Date(parada.chegadaPrevista.getTime() + 45 * 60_000),
          geradoAuto: true,
          routeStopId: parada.id,
        },
      });

      await prisma.client.update({
        where: { id: parada.clientId },
        data: { proximaVisitaEm: evento.inicio },
      });
    }
  }

  revalidatePath("/rotas");
  revalidatePath("/agenda");
  revalidatePath("/");

  return { ok: true, id: rota.id };
}

export async function iniciarRota(id: string) {
  const user = await exigirUsuario();
  await prisma.route.updateMany({
    where: { id, userId: user.id },
    data: { status: "EM_ANDAMENTO", iniciadaEm: new Date() },
  });
  revalidatePath("/rotas");
  revalidatePath(`/rotas/${id}`);
  revalidatePath("/");
}

export async function concluirRota(id: string) {
  const user = await exigirUsuario();
  await prisma.route.updateMany({
    where: { id, userId: user.id },
    data: { status: "CONCLUIDA", concluidaEm: new Date() },
  });
  revalidatePath("/rotas");
  revalidatePath(`/rotas/${id}`);
  revalidatePath("/");
}

export async function marcarParada(paradaId: string, status: "VISITADO" | "PULADO" | "PENDENTE") {
  const user = await exigirUsuario();

  const parada = await prisma.routeStop.findFirst({
    where: { id: paradaId, rota: { userId: user.id } },
  });
  if (!parada) return { erro: "Parada não encontrada." };

  await prisma.routeStop.update({ where: { id: paradaId }, data: { status } });

  if (status === "VISITADO" && parada.clientId) {
    await prisma.client.update({
      where: { id: parada.clientId },
      data: { ultimaVisitaEm: new Date() },
    });
  }

  revalidatePath(`/rotas/${parada.routeId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function excluirRota(id: string) {
  const user = await exigirUsuario();
  await prisma.route.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/rotas");
  revalidatePath("/");
}
