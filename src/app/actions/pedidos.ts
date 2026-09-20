"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type OrigemPedido, type StatusPedido, type TipoFrete } from "@prisma/client";

import { exigirUsuario } from "@/lib/auth";
import { calcularComissao, gerarParcelas, statusDaComissao, type Plano } from "@/lib/comissao";
import { competenciaDe, num } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { avisar } from "@/lib/push";

export interface ItemEntrada {
  productId?: string | null;
  codigo?: string | null;
  descricao: string;
  unidade?: string;
  quantidade: number;
  precoUnitario: number;
  descontoPercentual?: number;
  comissaoPercentual?: number | null;
}

// ==================================================================
// Plano vigente
// ==================================================================

export async function planoDaRepresentada(representadaId: string): Promise<Plano | null> {
  const registro = await prisma.commissionPlan.findFirst({
    where: { representadaId, ativo: true },
    orderBy: [{ padrao: "desc" }, { createdAt: "desc" }],
    include: { faixas: { orderBy: { ordem: "asc" } } },
  });
  if (!registro) return null;

  return {
    id: registro.id,
    nome: registro.nome,
    baseCalculo: registro.baseCalculo,
    tipoFaixa: registro.tipoFaixa,
    percentualPadrao: num(registro.percentualPadrao),
    gatilho: registro.gatilho,
    prazoDias: registro.prazoDias,
    periodicidade: registro.periodicidade,
    diaPagamento: registro.diaPagamento,
    impostoPercentual: num(registro.impostoPercentual),
    metaPeriodo: registro.metaPeriodo === null ? null : num(registro.metaPeriodo),
    bonusPercentual: registro.bonusPercentual === null ? null : num(registro.bonusPercentual),
    bonusMeta: registro.bonusMeta === null ? null : num(registro.bonusMeta),
    faixas: registro.faixas.map((f) => ({
      deValor: num(f.deValor),
      ateValor: f.ateValor === null ? null : num(f.ateValor),
      percentual: num(f.percentual),
      rotulo: f.rotulo,
    })),
  };
}

/** Quanto ja foi vendido para a representada no mes — base das faixas. */
export async function acumuladoDoPeriodo(representadaId: string, data: Date) {
  const user = await exigirUsuario();
  const inicio = new Date(data.getFullYear(), data.getMonth(), 1);
  const fim = new Date(data.getFullYear(), data.getMonth() + 1, 0, 23, 59, 59);

  const total = await prisma.order.aggregate({
    where: {
      userId: user.id,
      representadaId,
      data: { gte: inicio, lte: fim },
      status: { notIn: ["CANCELADO", "RASCUNHO"] },
    },
    _sum: { valorLiquido: true },
  });

  return num(total._sum.valorLiquido);
}

/** Simulacao usada na tela de novo pedido, antes de salvar. */
export async function simularPedido(entrada: {
  representadaId: string;
  valorBruto: number;
  descontoPercentual?: number;
  valorFrete?: number;
  valorImpostos?: number;
  condicaoPagamento?: string | null;
  data?: string;
  itens?: Array<{ total: number; comissaoPercentual?: number | null }>;
}) {
  await exigirUsuario();

  const plano = await planoDaRepresentada(entrada.representadaId);
  if (!plano) return { ok: false as const, erro: "Essa representada ainda não tem plano de comissão." };

  const data = entrada.data ? new Date(entrada.data) : new Date();
  const acumulado = await acumuladoDoPeriodo(entrada.representadaId, data);

  const bruto = num(entrada.valorBruto);
  const descontoValor = (bruto * num(entrada.descontoPercentual)) / 100;
  const liquido = bruto - descontoValor - num(entrada.valorFrete) - num(entrada.valorImpostos);

  const pedido = {
    valorBruto: bruto,
    descontoValor,
    valorFrete: num(entrada.valorFrete),
    valorImpostos: num(entrada.valorImpostos),
    valorLiquido: liquido,
    data,
    condicaoPagamento: entrada.condicaoPagamento,
    itens: entrada.itens,
  };

  const resultado = calcularComissao(pedido, plano, acumulado);
  const parcelas = gerarParcelas(pedido, plano, resultado);

  return {
    ok: true as const,
    plano: {
      nome: plano.nome ?? "Plano",
      baseCalculo: plano.baseCalculo,
      gatilho: plano.gatilho,
      periodicidade: plano.periodicidade,
      impostoPercentual: num(plano.impostoPercentual),
    },
    acumulado,
    valorLiquido: liquido,
    base: resultado.base,
    percentual: resultado.percentual,
    comissaoBruta: resultado.valorBruto,
    imposto: resultado.imposto,
    comissaoLiquida: resultado.valorLiquido,
    bonus: resultado.bonus,
    explicacao: resultado.explicacao,
    faixaAplicada: resultado.faixaAplicada,
    parcelas: parcelas.map((p) => ({
      parcela: p.parcela,
      totalParcelas: p.totalParcelas,
      vencimento: p.vencimento.toISOString(),
      valorPrevisto: p.valorPrevisto,
      valorLiquido: p.valorLiquido,
    })),
  };
}

// ==================================================================
// Gravacao
// ==================================================================

async function proximoNumero(userId: string) {
  const ultimo = await prisma.order.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { numero: true },
  });
  const n = Number((ultimo?.numero ?? "PD-0000").replace(/\D/g, "")) + 1;
  return `PD-${String(n).padStart(4, "0")}`;
}

export async function salvarPedido(entrada: {
  id?: string | null;
  clientId: string;
  representadaId: string;
  data: string;
  numeroFornecedor?: string | null;
  status?: StatusPedido;
  origem?: OrigemPedido;
  itens: ItemEntrada[];
  descontoPercentual?: number;
  valorFrete?: number;
  valorImpostos?: number;
  tipoFrete?: TipoFrete;
  condicaoPagamento?: string | null;
  comissaoManual?: boolean;
  comissaoPercentual?: number | null;
  notaFiscalNumero?: string | null;
  notaFiscalData?: string | null;
  observacoes?: string | null;
  arquivoNome?: string | null;
}) {
  const user = await exigirUsuario();

  if (!entrada.clientId) return { erro: "Escolha o cliente." };
  if (!entrada.representadaId) return { erro: "Escolha a representada." };
  if (!entrada.itens || entrada.itens.length === 0) return { erro: "Adicione pelo menos um item." };

  const data = new Date(entrada.data);
  const plano = await planoDaRepresentada(entrada.representadaId);

  // --- totais ---
  const itens = entrada.itens.map((item, i) => {
    const bruto = num(item.quantidade) * num(item.precoUnitario);
    const total = bruto * (1 - num(item.descontoPercentual) / 100);
    return {
      productId: item.productId || null,
      codigo: item.codigo || null,
      descricao: item.descricao,
      unidade: item.unidade || "UN",
      quantidade: new Prisma.Decimal(num(item.quantidade).toFixed(4)),
      precoUnitario: new Prisma.Decimal(num(item.precoUnitario).toFixed(4)),
      descontoPercentual: new Prisma.Decimal(num(item.descontoPercentual).toFixed(3)),
      total: new Prisma.Decimal(total.toFixed(2)),
      comissaoPercentual:
        item.comissaoPercentual === null || item.comissaoPercentual === undefined
          ? null
          : new Prisma.Decimal(num(item.comissaoPercentual).toFixed(3)),
      ordem: i,
    };
  });

  const valorBruto = itens.reduce((s, i) => s + num(i.total), 0);
  const descontoPercentual = num(entrada.descontoPercentual);
  const descontoValor = (valorBruto * descontoPercentual) / 100;
  const valorFrete = num(entrada.valorFrete);
  const valorImpostos = num(entrada.valorImpostos);
  const valorLiquido = valorBruto - descontoValor - valorFrete - valorImpostos;

  // --- comissao ---
  const acumulado = await acumuladoDoPeriodo(entrada.representadaId, data);
  const pedidoParaCalculo = {
    valorBruto,
    descontoValor,
    valorFrete,
    valorImpostos,
    valorLiquido,
    data,
    notaFiscalData: entrada.notaFiscalData ? new Date(entrada.notaFiscalData) : null,
    condicaoPagamento: entrada.condicaoPagamento,
    itens: itens.map((i) => ({
      total: num(i.total),
      comissaoPercentual: i.comissaoPercentual === null ? null : num(i.comissaoPercentual),
    })),
  };

  const calculado = plano
    ? calcularComissao(pedidoParaCalculo, plano, acumulado)
    : { base: valorLiquido, percentual: 0, valorBruto: 0, imposto: 0, valorLiquido: 0, explicacao: "", faixaAplicada: null, bonus: 0 };

  const percentualFinal =
    entrada.comissaoManual && entrada.comissaoPercentual !== null && entrada.comissaoPercentual !== undefined
      ? num(entrada.comissaoPercentual)
      : calculado.percentual;

  const comissaoValor = entrada.comissaoManual
    ? (calculado.base * percentualFinal) / 100
    : calculado.valorBruto;

  const condicao = entrada.condicaoPagamento ?? null;
  const parcelasPedido = condicao ? Math.max(1, condicao.split("/").length) : 1;

  const dadosPedido = {
    clientId: entrada.clientId,
    representadaId: entrada.representadaId,
    planId: plano?.id ?? null,
    numeroFornecedor: entrada.numeroFornecedor || null,
    data,
    status: entrada.status ?? "ENVIADO",
    origem: entrada.origem ?? "MANUAL",
    valorBruto: new Prisma.Decimal(valorBruto.toFixed(2)),
    descontoValor: new Prisma.Decimal(descontoValor.toFixed(2)),
    descontoPercentual: new Prisma.Decimal(descontoPercentual.toFixed(3)),
    valorFrete: new Prisma.Decimal(valorFrete.toFixed(2)),
    valorImpostos: new Prisma.Decimal(valorImpostos.toFixed(2)),
    valorLiquido: new Prisma.Decimal(valorLiquido.toFixed(2)),
    tipoFrete: entrada.tipoFrete ?? "CIF",
    condicaoPagamento: condicao,
    parcelas: parcelasPedido,
    comissaoBase: new Prisma.Decimal(calculado.base.toFixed(2)),
    comissaoPercentual: new Prisma.Decimal(percentualFinal.toFixed(3)),
    comissaoValor: new Prisma.Decimal(comissaoValor.toFixed(2)),
    comissaoManual: Boolean(entrada.comissaoManual),
    notaFiscalNumero: entrada.notaFiscalNumero || null,
    notaFiscalData: entrada.notaFiscalData ? new Date(entrada.notaFiscalData) : null,
    observacoes: entrada.observacoes || null,
    arquivoNome: entrada.arquivoNome || null,
  };

  const cliente = await prisma.client.findUnique({
    where: { id: entrada.clientId },
    select: { nomeFantasia: true, razaoSocial: true },
  });
  const nomeCliente = cliente?.nomeFantasia ?? cliente?.razaoSocial ?? "Cliente";

  const pedido = entrada.id
    ? await prisma.order.update({
        where: { id: entrada.id },
        data: { ...dadosPedido, itens: { deleteMany: {}, create: itens } },
      })
    : await prisma.order.create({
        data: {
          ...dadosPedido,
          userId: user.id,
          numero: await proximoNumero(user.id),
          itens: { create: itens },
        },
      });

  // --- comissoes a receber ---
  if (plano && comissaoValor > 0) {
    await prisma.commission.deleteMany({
      where: { orderId: pedido.id, valorRecebido: 0, status: { notIn: ["RECEBIDA", "PARCIAL"] } },
    });

    const resultadoFinal = {
      ...calculado,
      valorBruto: comissaoValor,
      imposto: (comissaoValor * num(plano.impostoPercentual)) / 100,
      valorLiquido: comissaoValor - (comissaoValor * num(plano.impostoPercentual)) / 100,
    };

    const parcelas = gerarParcelas(pedidoParaCalculo, plano, resultadoFinal);

    for (const p of parcelas) {
      await prisma.commission.create({
        data: {
          userId: user.id,
          orderId: pedido.id,
          representadaId: entrada.representadaId,
          planId: plano.id,
          descricao: `${p.descricao} · ${nomeCliente}`,
          competencia: p.competencia,
          parcela: p.parcela,
          totalParcelas: p.totalParcelas,
          valorPrevisto: new Prisma.Decimal(p.valorPrevisto.toFixed(2)),
          valorImposto: new Prisma.Decimal(p.valorImposto.toFixed(2)),
          valorLiquido: new Prisma.Decimal(p.valorLiquido.toFixed(2)),
          vencimento: p.vencimento,
          status: statusDaComissao({
            vencimento: p.vencimento,
            valorPrevisto: p.valorPrevisto,
            valorRecebido: 0,
            status: "PREVISTA",
          }),
        },
      });
    }
  }

  // --- consolidacao do cliente ---
  await consolidarCliente(entrada.clientId);

  await prisma.activity.create({
    data: {
      userId: user.id,
      clientId: entrada.clientId,
      representadaId: entrada.representadaId,
      orderId: pedido.id,
      tipo: "pedido",
      titulo: entrada.id ? `Pedido ${pedido.numero} atualizado` : `Pedido ${pedido.numero} lançado`,
      descricao: `${itens.length} itens · ${percentualFinal.toFixed(2)}% de comissão`,
      meta: { valorLiquido, comissaoValor },
    },
  });

  if (!entrada.id && comissaoValor > 0) {
    await avisar(user.id, {
      tipo: "PEDIDO_FATURADO",
      titulo: `Pedido ${pedido.numero} lançado`,
      corpo: `${nomeCurto(nomeCliente)} · comissão prevista de R$ ${comissaoValor.toFixed(2)}`,
      url: `/pedidos/${pedido.id}`,
      chaveUnica: `pedido-${pedido.id}`,
    });
  }

  revalidatePath("/pedidos");
  revalidatePath("/comissoes");
  revalidatePath("/");
  revalidatePath(`/clientes/${entrada.clientId}`);

  return { ok: true, id: pedido.id, numero: pedido.numero, comissaoValor, percentual: percentualFinal };

  function nomeCurto(nome: string) {
    return nome.length > 28 ? `${nome.slice(0, 28)}…` : nome;
  }
}

export async function consolidarCliente(clientId: string) {
  const agregado = await prisma.order.aggregate({
    where: { clientId, status: { notIn: ["CANCELADO", "RASCUNHO"] } },
    _sum: { valorLiquido: true },
    _count: true,
    _max: { data: true },
  });

  const total = num(agregado._sum.valorLiquido);
  const qtd = agregado._count;

  await prisma.client.update({
    where: { id: clientId },
    data: {
      totalComprado: new Prisma.Decimal(total.toFixed(2)),
      qtdPedidos: qtd,
      ticketMedio: new Prisma.Decimal((qtd > 0 ? total / qtd : 0).toFixed(2)),
      ultimoPedidoEm: agregado._max.data,
    },
  });
}

export async function mudarStatusPedido(id: string, status: StatusPedido) {
  const user = await exigirUsuario();

  const pedido = await prisma.order.findFirst({ where: { id, userId: user.id } });
  if (!pedido) return { erro: "Pedido não encontrado." };

  await prisma.order.update({ where: { id }, data: { status } });

  if (status === "CANCELADO") {
    await prisma.commission.updateMany({
      where: { orderId: id, valorRecebido: 0 },
      data: { status: "CANCELADA" },
    });
  }

  await consolidarCliente(pedido.clientId);

  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${id}`);
  revalidatePath("/comissoes");
  return { ok: true };
}

/** Lanca a NF e, quando o plano paga no faturamento, ajusta o vencimento. */
export async function lancarNotaFiscal(dados: FormData) {
  const user = await exigirUsuario();

  const id = String(dados.get("id") ?? "");
  const numero = String(dados.get("notaFiscalNumero") ?? "").trim();
  const dataTexto = String(dados.get("notaFiscalData") ?? "");

  const pedido = await prisma.order.findFirst({
    where: { id, userId: user.id },
    include: { plano: { include: { faixas: true } } },
  });
  if (!pedido) return { erro: "Pedido não encontrado." };
  if (!numero) return { erro: "Informe o número da nota." };

  const notaFiscalData = dataTexto ? new Date(dataTexto) : new Date();

  await prisma.order.update({
    where: { id },
    data: {
      notaFiscalNumero: numero,
      notaFiscalSerie: String(dados.get("notaFiscalSerie") ?? "") || null,
      notaFiscalChave: String(dados.get("notaFiscalChave") ?? "").replace(/\D/g, "") || null,
      notaFiscalData,
      notaFiscalValor: dados.get("notaFiscalValor")
        ? new Prisma.Decimal(num(dados.get("notaFiscalValor")).toFixed(2))
        : pedido.valorLiquido,
      status: pedido.status === "ENVIADO" || pedido.status === "APROVADO" ? "FATURADO" : pedido.status,
    },
  });

  if (pedido.plano?.gatilho === "EMISSAO_NF") {
    const novoVencimento = new Date(notaFiscalData);
    novoVencimento.setDate(novoVencimento.getDate() + pedido.plano.prazoDias);

    await prisma.commission.updateMany({
      where: { orderId: id, status: { in: ["PREVISTA", "A_RECEBER"] } },
      data: { vencimento: novoVencimento, competencia: competenciaDe(novoVencimento) },
    });
  }

  revalidatePath(`/pedidos/${id}`);
  revalidatePath("/comissoes");
  return { ok: true };
}

export async function excluirPedido(id: string) {
  const user = await exigirUsuario();

  const pedido = await prisma.order.findFirst({ where: { id, userId: user.id } });
  if (!pedido) return { erro: "Pedido não encontrado." };

  const recebidas = await prisma.commission.count({
    where: { orderId: id, status: { in: ["RECEBIDA", "PARCIAL"] } },
  });
  if (recebidas > 0) {
    return { erro: "Esse pedido já tem comissão recebida. Cancele em vez de excluir." };
  }

  await prisma.order.delete({ where: { id } });
  await consolidarCliente(pedido.clientId);

  revalidatePath("/pedidos");
  revalidatePath("/comissoes");
  return { ok: true };
}
