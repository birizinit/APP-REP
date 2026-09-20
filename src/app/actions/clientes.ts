"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type Curva, type StatusCliente } from "@prisma/client";

import { classificarCurva, frequenciaPorCurva } from "@/lib/analise";
import { exigirUsuario } from "@/lib/auth";
import { consultarCep, consultarCnpj, geocodificar } from "@/lib/consultas";
import { num, soDigitos } from "@/lib/format";
import { prisma } from "@/lib/prisma";

// ==================================================================
// Consultas para preencher o formulario
// ==================================================================

export async function buscarPorCnpj(cnpj: string) {
  await exigirUsuario();
  try {
    const ficha = await consultarCnpj(cnpj);
    return { ok: true as const, ficha };
  } catch (erro) {
    return { ok: false as const, erro: (erro as Error).message };
  }
}

export async function buscarPorCep(cep: string) {
  await exigirUsuario();
  try {
    const ficha = await consultarCep(cep);
    return { ok: true as const, ficha };
  } catch (erro) {
    return { ok: false as const, erro: (erro as Error).message };
  }
}

/** Avisa se o CNPJ ja esta na carteira, para nao duplicar. */
export async function conferirDuplicado(cnpj: string) {
  const user = await exigirUsuario();
  const digitos = soDigitos(cnpj);
  if (digitos.length !== 14) return { existe: false as const };

  const cliente = await prisma.client.findFirst({
    where: { userId: user.id, cnpj: digitos },
    select: { id: true, razaoSocial: true, nomeFantasia: true },
  });

  return cliente ? { existe: true as const, cliente } : { existe: false as const };
}

// ==================================================================
// Cadastro
// ==================================================================

function textoOuNulo(dados: FormData, campo: string): string | null {
  const valor = String(dados.get(campo) ?? "").trim();
  return valor.length > 0 ? valor : null;
}

export async function salvarCliente(dados: FormData) {
  const user = await exigirUsuario();
  const id = String(dados.get("id") ?? "") || null;

  const razaoSocial = String(dados.get("razaoSocial") ?? "").trim();
  if (!razaoSocial) return { erro: "A razão social é obrigatória." };

  const cnpj = soDigitos(String(dados.get("cnpj") ?? "")) || null;
  const curva = (String(dados.get("curva") ?? "C") as Curva) || "C";

  const campos = {
    tipoPessoa: (String(dados.get("tipoPessoa") ?? "PJ") as "PJ" | "PF") || "PJ",
    cnpj,
    cpf: soDigitos(String(dados.get("cpf") ?? "")) || null,
    razaoSocial,
    nomeFantasia: textoOuNulo(dados, "nomeFantasia"),
    inscricaoEstadual: textoOuNulo(dados, "inscricaoEstadual"),
    email: textoOuNulo(dados, "email")?.toLowerCase() ?? null,
    telefone: soDigitos(String(dados.get("telefone") ?? "")) || null,
    whatsapp: soDigitos(String(dados.get("whatsapp") ?? "")) || null,
    contatoNome: textoOuNulo(dados, "contatoNome"),
    contatoCargo: textoOuNulo(dados, "contatoCargo"),
    contatoEmail: textoOuNulo(dados, "contatoEmail"),
    contatoFone: soDigitos(String(dados.get("contatoFone") ?? "")) || null,
    cep: soDigitos(String(dados.get("cep") ?? "")) || null,
    logradouro: textoOuNulo(dados, "logradouro"),
    numero: textoOuNulo(dados, "numero"),
    complemento: textoOuNulo(dados, "complemento"),
    bairro: textoOuNulo(dados, "bairro"),
    cidade: textoOuNulo(dados, "cidade"),
    uf: textoOuNulo(dados, "uf")?.toUpperCase() ?? null,
    pontoReferencia: textoOuNulo(dados, "pontoReferencia"),
    regionId: textoOuNulo(dados, "regionId"),
    curva,
    curvaAutomatica: dados.get("curvaAutomatica") === "on",
    status: (String(dados.get("status") ?? "PROSPECT") as StatusCliente) || "PROSPECT",
    frequenciaVisitaDias: Number(dados.get("frequenciaVisitaDias")) || frequenciaPorCurva[curva],
    tempoVisitaMin: Number(dados.get("tempoVisitaMin")) || 40,
    horaAbre: textoOuNulo(dados, "horaAbre"),
    horaFecha: textoOuNulo(dados, "horaFecha"),
    condicaoPagamento: textoOuNulo(dados, "condicaoPagamento"),
    limiteCredito: dados.get("limiteCredito")
      ? new Prisma.Decimal(num(dados.get("limiteCredito")).toFixed(2))
      : null,
    potencialMensal: dados.get("potencialMensal")
      ? new Prisma.Decimal(num(dados.get("potencialMensal")).toFixed(2))
      : null,
    origem: textoOuNulo(dados, "origem"),
    observacoes: textoOuNulo(dados, "observacoes"),
    tags: String(dados.get("tags") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  };

  // Duplicidade por CNPJ
  if (cnpj) {
    const existente = await prisma.client.findFirst({
      where: { userId: user.id, cnpj, ...(id ? { NOT: { id } } : {}) },
      select: { id: true, razaoSocial: true },
    });
    if (existente) {
      return { erro: `Esse CNPJ já está cadastrado como "${existente.razaoSocial}".` };
    }
  }

  // Coordenada: usa a enviada pelo formulario ou geocodifica
  let lat = dados.get("lat") ? Number(dados.get("lat")) : null;
  let lng = dados.get("lng") ? Number(dados.get("lng")) : null;

  if ((!lat || !lng) && (campos.cep || campos.cidade)) {
    const coord = await geocodificar({
      logradouro: campos.logradouro,
      numero: campos.numero,
      bairro: campos.bairro,
      cidade: campos.cidade,
      uf: campos.uf,
      cep: campos.cep,
    });
    if (coord) {
      lat = coord.lat;
      lng = coord.lng;
    }
  }

  const representadasSelecionadas = dados.getAll("representadas").map(String).filter(Boolean);

  const cliente = id
    ? await prisma.client.update({
        where: { id },
        data: {
          ...campos,
          lat,
          lng,
          geocodadoEm: lat && lng ? new Date() : undefined,
        },
      })
    : await prisma.client.create({
        data: {
          ...campos,
          userId: user.id,
          lat,
          lng,
          geocodadoEm: lat && lng ? new Date() : null,
        },
      });

  // vinculo com representadas
  if (representadasSelecionadas.length > 0 || id) {
    await prisma.clientRepresentada.deleteMany({ where: { clientId: cliente.id } });
    if (representadasSelecionadas.length > 0) {
      await prisma.clientRepresentada.createMany({
        data: representadasSelecionadas.map((representadaId) => ({
          clientId: cliente.id,
          representadaId,
        })),
        skipDuplicates: true,
      });
    }
  }

  await prisma.activity.create({
    data: {
      userId: user.id,
      clientId: cliente.id,
      tipo: "sistema",
      titulo: id ? "Cadastro atualizado" : "Cliente cadastrado",
      descricao: lat && lng ? "Endereço localizado no mapa." : "Sem coordenada — a rota vai ignorar este cliente.",
    },
  });

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${cliente.id}`);
  revalidatePath("/");

  return { ok: true, id: cliente.id, semCoordenada: !lat || !lng };
}

export async function excluirCliente(id: string) {
  const user = await exigirUsuario();

  const pedidos = await prisma.order.count({ where: { clientId: id, userId: user.id } });
  if (pedidos > 0) {
    return {
      erro: `Esse cliente tem ${pedidos} pedidos no histórico. Marque como perdido em vez de excluir.`,
    };
  }

  await prisma.client.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/clientes");
  return { ok: true };
}

export async function mudarStatusCliente(id: string, status: StatusCliente) {
  const user = await exigirUsuario();
  await prisma.client.updateMany({ where: { id, userId: user.id }, data: { status } });
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { ok: true };
}

/** Tenta achar a coordenada de quem ficou sem — roda em lote. */
export async function geocodificarPendentes() {
  const user = await exigirUsuario();

  const pendentes = await prisma.client.findMany({
    where: { userId: user.id, OR: [{ lat: null }, { lng: null }] },
    take: 25,
  });

  let achados = 0;
  for (const c of pendentes) {
    const coord = await geocodificar({
      logradouro: c.logradouro,
      numero: c.numero,
      bairro: c.bairro,
      cidade: c.cidade,
      uf: c.uf,
      cep: c.cep,
    });
    if (coord) {
      await prisma.client.update({
        where: { id: c.id },
        data: { lat: coord.lat, lng: coord.lng, geocodadoEm: new Date() },
      });
      achados++;
    }
    // respeita o limite do Nominatim (1 req/s)
    await new Promise((r) => setTimeout(r, 1100));
  }

  revalidatePath("/clientes");
  return { total: pendentes.length, achados };
}

/**
 * Recalcula a curva ABC de toda a carteira por Pareto de faturamento
 * e ajusta a frequencia de visita de quem esta no automatico.
 */
export async function recalcularCurvaABC() {
  const user = await exigirUsuario();

  const clientes = await prisma.client.findMany({
    where: { userId: user.id },
    select: { id: true, totalComprado: true, curva: true, curvaAutomatica: true, frequenciaVisitaDias: true },
  });

  const mapa = classificarCurva(
    clientes.map((c) => ({ id: c.id, totalComprado: num(c.totalComprado) })),
  );

  let mudaram = 0;
  for (const c of clientes) {
    if (!c.curvaAutomatica) continue;
    const nova = mapa.get(c.id);
    if (!nova || nova === c.curva) continue;

    await prisma.client.update({
      where: { id: c.id },
      data: { curva: nova, frequenciaVisitaDias: frequenciaPorCurva[nova] },
    });
    mudaram++;
  }

  revalidatePath("/clientes");
  revalidatePath("/");
  return { total: clientes.length, mudaram };
}
