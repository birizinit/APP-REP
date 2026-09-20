"use server";

import { revalidatePath } from "next/cache";
import {
  Prisma,
  type BaseCalculo,
  type FormaRecebimento,
  type GatilhoComissao,
  type Periodicidade,
  type StatusRepresentada,
  type TipoFaixa,
} from "@prisma/client";

import { exigirUsuario } from "@/lib/auth";
import { consultarCnpj } from "@/lib/consultas";
import { num, soDigitos } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function texto(dados: FormData, campo: string): string | null {
  const valor = String(dados.get(campo) ?? "").trim();
  return valor.length > 0 ? valor : null;
}

export async function buscarCnpjRepresentada(cnpj: string) {
  await exigirUsuario();
  try {
    return { ok: true as const, ficha: await consultarCnpj(cnpj) };
  } catch (erro) {
    return { ok: false as const, erro: (erro as Error).message };
  }
}

export async function salvarRepresentada(dados: FormData) {
  const user = await exigirUsuario();
  const id = String(dados.get("id") ?? "") || null;

  const razaoSocial = String(dados.get("razaoSocial") ?? "").trim();
  if (!razaoSocial) return { erro: "Informe a razão social." };

  const campos = {
    razaoSocial,
    nomeFantasia: texto(dados, "nomeFantasia"),
    cnpj: soDigitos(String(dados.get("cnpj") ?? "")) || null,
    inscricaoEstadual: texto(dados, "inscricaoEstadual"),
    segmento: texto(dados, "segmento"),
    site: texto(dados, "site"),
    cor: texto(dados, "cor") ?? "#1B34C4",
    email: texto(dados, "email")?.toLowerCase() ?? null,
    telefone: soDigitos(String(dados.get("telefone") ?? "")) || null,
    whatsapp: soDigitos(String(dados.get("whatsapp") ?? "")) || null,
    contatoNome: texto(dados, "contatoNome"),
    contatoCargo: texto(dados, "contatoCargo"),
    contatoEmail: texto(dados, "contatoEmail"),
    contatoFone: soDigitos(String(dados.get("contatoFone") ?? "")) || null,
    cep: soDigitos(String(dados.get("cep") ?? "")) || null,
    logradouro: texto(dados, "logradouro"),
    numero: texto(dados, "numero"),
    bairro: texto(dados, "bairro"),
    cidade: texto(dados, "cidade"),
    uf: texto(dados, "uf")?.toUpperCase() ?? null,
    status: (String(dados.get("status") ?? "ATIVA") as StatusRepresentada) || "ATIVA",
    contratoInicio: dados.get("contratoInicio") ? new Date(String(dados.get("contratoInicio"))) : null,
    contratoFim: dados.get("contratoFim") ? new Date(String(dados.get("contratoFim"))) : null,
    exclusividade: dados.get("exclusividade") === "on",
    territorio: texto(dados, "territorio"),
    prazoEntregaDias: dados.get("prazoEntregaDias") ? Number(dados.get("prazoEntregaDias")) : null,
    pedidoMinimo: dados.get("pedidoMinimo")
      ? new Prisma.Decimal(num(dados.get("pedidoMinimo")).toFixed(2))
      : null,
    metaMensal: new Prisma.Decimal(num(dados.get("metaMensal")).toFixed(2)),
    observacoes: texto(dados, "observacoes"),
  };

  const representada = id
    ? await prisma.representada.update({ where: { id }, data: campos })
    : await prisma.representada.create({ data: { ...campos, userId: user.id } });

  // Toda representada nova ja nasce com um plano, senao o pedido nao calcula.
  if (!id) {
    await prisma.commissionPlan.create({
      data: {
        representadaId: representada.id,
        nome: "Plano padrão",
        padrao: true,
        percentualPadrao: new Prisma.Decimal(num(dados.get("percentualInicial"), 5).toFixed(3)),
      },
    });
  }

  revalidatePath("/representadas");
  revalidatePath(`/representadas/${representada.id}`);
  return { ok: true, id: representada.id };
}

export async function excluirRepresentada(id: string) {
  const user = await exigirUsuario();

  const pedidos = await prisma.order.count({ where: { representadaId: id, userId: user.id } });
  if (pedidos > 0) {
    return { erro: `Existem ${pedidos} pedidos vinculados. Marque como encerrada em vez de excluir.` };
  }

  await prisma.representada.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/representadas");
  return { ok: true };
}

// ==================================================================
// Plano de comissao
// ==================================================================

export async function salvarPlano(dados: FormData) {
  const user = await exigirUsuario();

  const id = String(dados.get("id") ?? "") || null;
  const representadaId = String(dados.get("representadaId") ?? "");

  const dona = await prisma.representada.findFirst({
    where: { id: representadaId, userId: user.id },
    select: { id: true },
  });
  if (!dona) return { erro: "Representada não encontrada." };

  const padrao = dados.get("padrao") === "on";

  const campos = {
    nome: String(dados.get("nome") ?? "").trim() || "Plano",
    ativo: dados.get("ativo") !== "off",
    padrao,
    vigenciaInicio: dados.get("vigenciaInicio") ? new Date(String(dados.get("vigenciaInicio"))) : null,
    vigenciaFim: dados.get("vigenciaFim") ? new Date(String(dados.get("vigenciaFim"))) : null,
    baseCalculo: (String(dados.get("baseCalculo") ?? "VALOR_LIQUIDO") as BaseCalculo) || "VALOR_LIQUIDO",
    tipoFaixa: (String(dados.get("tipoFaixa") ?? "UNICO") as TipoFaixa) || "UNICO",
    percentualPadrao: new Prisma.Decimal(num(dados.get("percentualPadrao")).toFixed(3)),
    gatilho: (String(dados.get("gatilho") ?? "PAGAMENTO_CLIENTE") as GatilhoComissao) || "PAGAMENTO_CLIENTE",
    prazoDias: Number(dados.get("prazoDias")) || 0,
    periodicidade: (String(dados.get("periodicidade") ?? "MENSAL") as Periodicidade) || "MENSAL",
    diaPagamento: dados.get("diaPagamento") ? Number(dados.get("diaPagamento")) : null,
    formaRecebimento: (String(dados.get("formaRecebimento") ?? "PIX") as FormaRecebimento) || "PIX",
    emiteNotaServico: dados.get("emiteNotaServico") === "on",
    impostoPercentual: new Prisma.Decimal(num(dados.get("impostoPercentual")).toFixed(3)),
    descontaDevolucao: dados.get("descontaDevolucao") === "on",
    descontaInadimplencia: dados.get("descontaInadimplencia") === "on",
    antecipavel: dados.get("antecipavel") === "on",
    metaPeriodo: dados.get("metaPeriodo")
      ? new Prisma.Decimal(num(dados.get("metaPeriodo")).toFixed(2))
      : null,
    bonusPercentual: dados.get("bonusPercentual")
      ? new Prisma.Decimal(num(dados.get("bonusPercentual")).toFixed(3))
      : null,
    bonusMeta: dados.get("bonusMeta")
      ? new Prisma.Decimal(num(dados.get("bonusMeta")).toFixed(2))
      : null,
    observacoes: texto(dados, "observacoes"),
  };

  // faixas progressivas vindas como JSON
  let faixas: Array<{ rotulo?: string; deValor: number; ateValor: number | null; percentual: number }> = [];
  const faixasTexto = String(dados.get("faixas") ?? "");
  if (faixasTexto) {
    try {
      faixas = JSON.parse(faixasTexto);
    } catch {
      faixas = [];
    }
  }

  const plano = id
    ? await prisma.commissionPlan.update({ where: { id }, data: campos })
    : await prisma.commissionPlan.create({ data: { ...campos, representadaId } });

  await prisma.commissionTier.deleteMany({ where: { planId: plano.id } });
  if (campos.tipoFaixa === "PROGRESSIVO" && faixas.length > 0) {
    await prisma.commissionTier.createMany({
      data: faixas.map((f, i) => ({
        planId: plano.id,
        rotulo: f.rotulo ?? null,
        deValor: new Prisma.Decimal(num(f.deValor).toFixed(2)),
        ateValor: f.ateValor === null ? null : new Prisma.Decimal(num(f.ateValor).toFixed(2)),
        percentual: new Prisma.Decimal(num(f.percentual).toFixed(3)),
        ordem: i,
      })),
    });
  }

  if (padrao) {
    await prisma.commissionPlan.updateMany({
      where: { representadaId, NOT: { id: plano.id } },
      data: { padrao: false },
    });
  }

  revalidatePath(`/representadas/${representadaId}`);
  revalidatePath("/pedidos/novo");
  return { ok: true, id: plano.id };
}

export async function excluirPlano(id: string) {
  const user = await exigirUsuario();

  const plano = await prisma.commissionPlan.findFirst({
    where: { id, representada: { userId: user.id } },
    include: { _count: { select: { pedidos: true } } },
  });
  if (!plano) return { erro: "Plano não encontrado." };
  if (plano._count.pedidos > 0) {
    return { erro: "Esse plano já foi usado em pedidos. Desative em vez de excluir." };
  }

  await prisma.commissionPlan.delete({ where: { id } });
  revalidatePath(`/representadas/${plano.representadaId}`);
  return { ok: true };
}

// ==================================================================
// Produtos
// ==================================================================

export async function salvarProduto(dados: FormData) {
  const user = await exigirUsuario();

  const representadaId = String(dados.get("representadaId") ?? "");
  const dona = await prisma.representada.findFirst({
    where: { id: representadaId, userId: user.id },
    select: { id: true },
  });
  if (!dona) return { erro: "Representada não encontrada." };

  const codigo = String(dados.get("codigo") ?? "").trim();
  const descricao = String(dados.get("descricao") ?? "").trim();
  if (!codigo || !descricao) return { erro: "Código e descrição são obrigatórios." };

  await prisma.product.upsert({
    where: { representadaId_codigo: { representadaId, codigo } },
    update: {
      descricao,
      unidade: String(dados.get("unidade") ?? "UN"),
      precoTabela: new Prisma.Decimal(num(dados.get("precoTabela")).toFixed(4)),
      linha: texto(dados, "linha"),
      ncm: texto(dados, "ncm"),
      comissaoPercentual: dados.get("comissaoPercentual")
        ? new Prisma.Decimal(num(dados.get("comissaoPercentual")).toFixed(3))
        : null,
    },
    create: {
      representadaId,
      codigo,
      descricao,
      unidade: String(dados.get("unidade") ?? "UN"),
      precoTabela: new Prisma.Decimal(num(dados.get("precoTabela")).toFixed(4)),
      linha: texto(dados, "linha"),
      ncm: texto(dados, "ncm"),
      comissaoPercentual: dados.get("comissaoPercentual")
        ? new Prisma.Decimal(num(dados.get("comissaoPercentual")).toFixed(3))
        : null,
    },
  });

  revalidatePath(`/representadas/${representadaId}`);
  return { ok: true };
}

export async function excluirProduto(id: string) {
  const user = await exigirUsuario();
  const produto = await prisma.product.findFirst({
    where: { id, representada: { userId: user.id } },
  });
  if (!produto) return { erro: "Produto não encontrado." };

  await prisma.product.delete({ where: { id } });
  revalidatePath(`/representadas/${produto.representadaId}`);
  return { ok: true };
}
