/**
 * Motor de comissao.
 *
 * Traduz o plano acertado com a representada em: quanto eu ganho neste
 * pedido, quando cada parcela cai e quanto sobra depois do imposto.
 */

import { competenciaDe, num, somaDias } from "@/lib/format";

export type BaseCalculo = "VALOR_BRUTO" | "VALOR_LIQUIDO" | "VALOR_RECEBIDO" | "MARGEM";
export type GatilhoComissao =
  | "EMISSAO_PEDIDO"
  | "EMISSAO_NF"
  | "ENTREGA"
  | "PAGAMENTO_CLIENTE"
  | "DATA_FIXA";
export type Periodicidade = "POR_PEDIDO" | "SEMANAL" | "QUINZENAL" | "MENSAL" | "BIMESTRAL";
export type TipoFaixa = "UNICO" | "PROGRESSIVO" | "POR_LINHA";

export interface Faixa {
  deValor: number;
  ateValor: number | null;
  percentual: number;
  rotulo?: string | null;
}

export interface Plano {
  id?: string;
  nome?: string;
  baseCalculo: BaseCalculo;
  tipoFaixa: TipoFaixa;
  percentualPadrao: number;
  gatilho: GatilhoComissao;
  prazoDias: number;
  periodicidade: Periodicidade;
  diaPagamento?: number | null;
  impostoPercentual?: number | null;
  faixas?: Faixa[];
  metaPeriodo?: number | null;
  bonusPercentual?: number | null;
  bonusMeta?: number | null;
}

export interface PedidoParaComissao {
  valorBruto: number;
  descontoValor?: number;
  valorFrete?: number;
  valorImpostos?: number;
  valorLiquido?: number;
  data: Date | string;
  notaFiscalData?: Date | string | null;
  condicaoPagamento?: string | null;
  parcelas?: number;
  itens?: Array<{ total: number; comissaoPercentual?: number | null }>;
}

// ==================================================================
// Base de calculo
// ==================================================================

export function baseDoCalculo(pedido: PedidoParaComissao, base: BaseCalculo): number {
  const bruto = num(pedido.valorBruto);
  const desconto = num(pedido.descontoValor);
  const frete = num(pedido.valorFrete);
  const impostos = num(pedido.valorImpostos);
  const liquido = pedido.valorLiquido !== undefined ? num(pedido.valorLiquido) : bruto - desconto - frete - impostos;

  switch (base) {
    case "VALOR_BRUTO":
      return bruto;
    case "VALOR_RECEBIDO":
      // Enquanto o cliente nao paga, a previsao usa o liquido.
      return Math.max(0, liquido);
    case "MARGEM":
      return Math.max(0, liquido);
    case "VALOR_LIQUIDO":
    default:
      return Math.max(0, liquido);
  }
}

export const rotuloBase: Record<BaseCalculo, string> = {
  VALOR_BRUTO: "Valor bruto do pedido",
  VALOR_LIQUIDO: "Valor líquido (sem frete e impostos)",
  VALOR_RECEBIDO: "Só sobre o que o cliente pagar",
  MARGEM: "Margem de contribuição",
};

export const rotuloGatilho: Record<GatilhoComissao, string> = {
  EMISSAO_PEDIDO: "Na emissão do pedido",
  EMISSAO_NF: "No faturamento (emissão da NF)",
  ENTREGA: "Na entrega da mercadoria",
  PAGAMENTO_CLIENTE: "Conforme o cliente paga",
  DATA_FIXA: "Em data fixa do mês",
};

export const rotuloPeriodicidade: Record<Periodicidade, string> = {
  POR_PEDIDO: "A cada pedido",
  SEMANAL: "Semanal",
  QUINZENAL: "Quinzenal",
  MENSAL: "Mensal",
  BIMESTRAL: "Bimestral",
};

// ==================================================================
// Percentual
// ==================================================================

/** Faixa progressiva: aplica sobre o acumulado do periodo, nao sobre o pedido. */
export function percentualDaFaixa(faixas: Faixa[] | undefined, acumulado: number, padrao: number): number {
  if (!faixas || faixas.length === 0) return padrao;
  const ordenadas = [...faixas].sort((a, b) => num(a.deValor) - num(b.deValor));
  let escolhido = padrao;
  for (const f of ordenadas) {
    const de = num(f.deValor);
    const ate = f.ateValor === null || f.ateValor === undefined ? Infinity : num(f.ateValor);
    if (acumulado >= de && acumulado < ate) return num(f.percentual);
    if (acumulado >= de) escolhido = num(f.percentual);
  }
  return escolhido;
}

export interface ResultadoComissao {
  base: number;
  percentual: number;
  valorBruto: number;
  imposto: number;
  valorLiquido: number;
  explicacao: string;
  faixaAplicada: string | null;
  bonus: number;
}

/**
 * Calcula a comissao de um pedido.
 * `acumuladoPeriodo` e o quanto ja foi vendido para essa representada no
 * periodo — usado nas faixas progressivas e no bonus de meta.
 */
export function calcularComissao(
  pedido: PedidoParaComissao,
  plano: Plano,
  acumuladoPeriodo = 0,
): ResultadoComissao {
  const base = baseDoCalculo(pedido, plano.baseCalculo);
  let percentual = num(plano.percentualPadrao);
  let faixaAplicada: string | null = null;
  let valorBruto = 0;
  let explicacao = "";

  if (plano.tipoFaixa === "POR_LINHA" && pedido.itens && pedido.itens.length > 0) {
    // Cada item pode ter percentual proprio (linha de produto).
    let somaComissao = 0;
    let somaItens = 0;
    for (const item of pedido.itens) {
      const total = num(item.total);
      const pct = item.comissaoPercentual !== null && item.comissaoPercentual !== undefined
        ? num(item.comissaoPercentual)
        : percentual;
      somaComissao += (total * pct) / 100;
      somaItens += total;
    }
    // Reflete descontos do cabecalho na proporcao
    const fator = somaItens > 0 ? base / somaItens : 1;
    valorBruto = somaComissao * fator;
    percentual = base > 0 ? (valorBruto / base) * 100 : percentual;
    explicacao = `Percentual por linha de produto (média de ${percentual.toFixed(2)}%).`;
  } else if (plano.tipoFaixa === "PROGRESSIVO") {
    const acumuladoComEste = acumuladoPeriodo + base;
    percentual = percentualDaFaixa(plano.faixas, acumuladoComEste, num(plano.percentualPadrao));
    const faixa = (plano.faixas ?? []).find((f) => {
      const de = num(f.deValor);
      const ate = f.ateValor === null || f.ateValor === undefined ? Infinity : num(f.ateValor);
      return acumuladoComEste >= de && acumuladoComEste < ate;
    });
    faixaAplicada = faixa?.rotulo ?? (faixa ? `A partir de ${faixa.deValor}` : null);
    valorBruto = (base * percentual) / 100;
    explicacao = `Faixa progressiva: com este pedido o acumulado do período chega a ${acumuladoComEste.toFixed(2)}, o que cai na faixa de ${percentual}%.`;
  } else {
    valorBruto = (base * percentual) / 100;
    explicacao = `${percentual}% sobre ${rotuloBase[plano.baseCalculo].toLowerCase()}.`;
  }

  // Bonus por meta do periodo
  let bonus = 0;
  const meta = num(plano.metaPeriodo);
  if (meta > 0 && acumuladoPeriodo + base >= meta) {
    if (plano.bonusPercentual) bonus += (base * num(plano.bonusPercentual)) / 100;
    if (plano.bonusMeta) bonus += num(plano.bonusMeta);
  }

  const totalBruto = valorBruto + bonus;
  const imposto = (totalBruto * num(plano.impostoPercentual)) / 100;

  return {
    base,
    percentual,
    valorBruto: totalBruto,
    imposto,
    valorLiquido: totalBruto - imposto,
    explicacao,
    faixaAplicada,
    bonus,
  };
}

// ==================================================================
// Vencimentos
// ==================================================================

/** "30/60/90" -> [30, 60, 90]; "a vista" -> [0] */
export function parcelasDaCondicao(condicao: string | null | undefined, qtdFallback = 1): number[] {
  if (!condicao) return Array.from({ length: Math.max(1, qtdFallback) }, (_, i) => (i + 1) * 30);
  const texto = condicao.toLowerCase().trim();
  if (/vista|avista|à vista|antecipad/.test(texto)) return [0];

  const numeros = texto.match(/\d+/g);
  if (!numeros || numeros.length === 0) {
    return Array.from({ length: Math.max(1, qtdFallback) }, (_, i) => (i + 1) * 30);
  }
  // "3x de 30" -> 30/60/90
  if (/x/.test(texto) && numeros.length === 2) {
    const vezes = Number(numeros[0]);
    const passo = Number(numeros[1]);
    return Array.from({ length: Math.max(1, vezes) }, (_, i) => passo * (i + 1));
  }
  return numeros.map(Number).filter((n) => Number.isFinite(n));
}

function proximoDiaDoMes(data: Date, dia: number): Date {
  const d = new Date(data);
  const alvo = new Date(d.getFullYear(), d.getMonth(), Math.min(dia, 28));
  if (alvo < d) alvo.setMonth(alvo.getMonth() + 1);
  // respeita meses curtos
  const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  alvo.setDate(Math.min(dia, ultimoDia));
  alvo.setHours(12, 0, 0, 0);
  return alvo;
}

function ajustarPelaPeriodicidade(data: Date, plano: Plano): Date {
  switch (plano.periodicidade) {
    case "MENSAL":
    case "BIMESTRAL": {
      if (!plano.diaPagamento) return data;
      const alvo = proximoDiaDoMes(data, plano.diaPagamento);
      if (plano.periodicidade === "BIMESTRAL" && alvo.getMonth() % 2 !== 0) {
        alvo.setMonth(alvo.getMonth() + 1);
      }
      return alvo;
    }
    case "QUINZENAL": {
      const d = new Date(data);
      const dia = d.getDate();
      if (dia <= 15) d.setDate(15);
      else d.setMonth(d.getMonth() + 1, 1);
      d.setHours(12, 0, 0, 0);
      return d;
    }
    case "SEMANAL": {
      const d = new Date(data);
      const ateSexta = (5 - d.getDay() + 7) % 7;
      d.setDate(d.getDate() + ateSexta);
      d.setHours(12, 0, 0, 0);
      return d;
    }
    default:
      return data;
  }
}

export interface ParcelaComissao {
  parcela: number;
  totalParcelas: number;
  descricao: string;
  competencia: string;
  vencimento: Date;
  valorPrevisto: number;
  valorImposto: number;
  valorLiquido: number;
}

/**
 * Quebra a comissao do pedido em parcelas com data de vencimento.
 * Quando o gatilho e "conforme o cliente paga", gera uma parcela por
 * parcela do pedido — que e como a maioria das representadas acerta.
 */
export function gerarParcelas(
  pedido: PedidoParaComissao,
  plano: Plano,
  resultado: ResultadoComissao,
): ParcelaComissao[] {
  const dataPedido = new Date(pedido.data);
  const dataNf = pedido.notaFiscalData ? new Date(pedido.notaFiscalData) : null;

  let datasBase: Date[];

  switch (plano.gatilho) {
    case "PAGAMENTO_CLIENTE": {
      const prazos = parcelasDaCondicao(pedido.condicaoPagamento, pedido.parcelas ?? 1);
      datasBase = prazos.map((dias) => somaDias(dataPedido, dias));
      break;
    }
    case "EMISSAO_NF":
      datasBase = [dataNf ?? dataPedido];
      break;
    case "ENTREGA":
      datasBase = [somaDias(dataPedido, 7)];
      break;
    case "DATA_FIXA":
      datasBase = [proximoDiaDoMes(dataPedido, plano.diaPagamento ?? 10)];
      break;
    case "EMISSAO_PEDIDO":
    default:
      datasBase = [dataPedido];
      break;
  }

  const total = datasBase.length;
  const valorPorParcela = resultado.valorBruto / total;
  const impostoPorParcela = resultado.imposto / total;

  return datasBase.map((base, i) => {
    let vencimento = somaDias(base, num(plano.prazoDias));
    vencimento = ajustarPelaPeriodicidade(vencimento, plano);
    vencimento.setHours(12, 0, 0, 0);

    return {
      parcela: i + 1,
      totalParcelas: total,
      descricao:
        total > 1
          ? `Comissão parcela ${i + 1}/${total}`
          : "Comissão do pedido",
      competencia: competenciaDe(vencimento),
      vencimento,
      valorPrevisto: arredondar(valorPorParcela),
      valorImposto: arredondar(impostoPorParcela),
      valorLiquido: arredondar(valorPorParcela - impostoPorParcela),
    };
  });
}

function arredondar(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

// ==================================================================
// Status
// ==================================================================

export type StatusComissao =
  | "PREVISTA"
  | "A_RECEBER"
  | "VENCIDA"
  | "PARCIAL"
  | "RECEBIDA"
  | "GLOSADA"
  | "CANCELADA";

/** Recalcula o status olhando vencimento e valor ja baixado. */
export function statusDaComissao(c: {
  vencimento: Date | string;
  valorPrevisto: number;
  valorRecebido: number;
  status: StatusComissao;
}): StatusComissao {
  if (c.status === "GLOSADA" || c.status === "CANCELADA") return c.status;

  const previsto = num(c.valorPrevisto);
  const recebido = num(c.valorRecebido);

  if (recebido >= previsto - 0.01 && previsto > 0) return "RECEBIDA";
  if (recebido > 0) return "PARCIAL";

  const venc = new Date(c.vencimento);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  if (venc < hoje) return "VENCIDA";

  const emAte7Dias = somaDias(hoje, 7);
  if (venc <= emAte7Dias) return "A_RECEBER";

  return "PREVISTA";
}

export const rotuloStatusComissao: Record<StatusComissao, string> = {
  PREVISTA: "Prevista",
  A_RECEBER: "A receber",
  VENCIDA: "Vencida",
  PARCIAL: "Parcial",
  RECEBIDA: "Recebida",
  GLOSADA: "Glosada",
  CANCELADA: "Cancelada",
};

// ==================================================================
// Simulador (usado antes de fechar o pedido)
// ==================================================================

export interface Simulacao {
  valorBruto: number;
  desconto: number;
  valorLiquido: number;
  percentual: number;
  comissaoBruta: number;
  imposto: number;
  comissaoLiquida: number;
  porParcela: ParcelaComissao[];
  primeiroRecebimento: Date | null;
  diasAteReceber: number | null;
  /** Quanto cada 1% de desconto custa do seu bolso. */
  custoDoDesconto: number;
}

export function simular(
  entrada: {
    valorBruto: number;
    descontoPercentual?: number;
    valorFrete?: number;
    valorImpostos?: number;
    condicaoPagamento?: string | null;
    data?: Date;
  },
  plano: Plano,
  acumuladoPeriodo = 0,
): Simulacao {
  const data = entrada.data ?? new Date();
  const bruto = num(entrada.valorBruto);
  const descontoValor = (bruto * num(entrada.descontoPercentual)) / 100;

  const pedido: PedidoParaComissao = {
    valorBruto: bruto,
    descontoValor,
    valorFrete: num(entrada.valorFrete),
    valorImpostos: num(entrada.valorImpostos),
    valorLiquido: bruto - descontoValor - num(entrada.valorFrete) - num(entrada.valorImpostos),
    data,
    condicaoPagamento: entrada.condicaoPagamento,
  };

  const resultado = calcularComissao(pedido, plano, acumuladoPeriodo);
  const parcelas = gerarParcelas(pedido, plano, resultado);
  const primeiro = parcelas[0]?.vencimento ?? null;

  // quanto perco a cada ponto percentual de desconto
  const semDesconto = calcularComissao({ ...pedido, descontoValor: 0, valorLiquido: bruto - num(entrada.valorFrete) - num(entrada.valorImpostos) }, plano, acumuladoPeriodo);
  const custoDoDesconto = num(entrada.descontoPercentual) > 0
    ? (semDesconto.valorLiquido - resultado.valorLiquido) / num(entrada.descontoPercentual)
    : (bruto / 100) * (resultado.percentual / 100);

  return {
    valorBruto: bruto,
    desconto: descontoValor,
    valorLiquido: num(pedido.valorLiquido),
    percentual: resultado.percentual,
    comissaoBruta: resultado.valorBruto,
    imposto: resultado.imposto,
    comissaoLiquida: resultado.valorLiquido,
    porParcela: parcelas,
    primeiroRecebimento: primeiro,
    diasAteReceber: primeiro
      ? Math.round((primeiro.getTime() - data.getTime()) / 86_400_000)
      : null,
    custoDoDesconto,
  };
}
