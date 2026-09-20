/**
 * Inteligencia da carteira: curva ABC, risco de perder o cliente,
 * proxima visita sugerida e montagem automatica da semana.
 *
 * Tudo puro — recebe dados, devolve conclusao. Fica facil de testar e
 * de rodar tanto no cron quanto na tela.
 */

import { diasEntre, num, somaDias } from "@/lib/format";

export type Curva = "A" | "B" | "C" | "D";

export interface ClienteAnalise {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
  totalComprado: number;
  qtdPedidos: number;
  ticketMedio: number;
  ultimoPedidoEm?: Date | string | null;
  ultimaVisitaEm?: Date | string | null;
  frequenciaVisitaDias: number;
  curva: Curva;
  status: string;
  regionId?: string | null;
  lat?: number | null;
  lng?: number | null;
  cidade?: string | null;
  tempoVisitaMin?: number;
  diasAtendimento?: number[];
}

// ==================================================================
// Curva ABC (Pareto sobre o faturamento)
// ==================================================================

/**
 * A = clientes que somam os primeiros 80% do faturamento
 * B = os proximos 15%
 * C = os ultimos 5%
 * D = nunca comprou
 */
export function classificarCurva<T extends { id: string; totalComprado: number }>(
  clientes: T[],
): Map<string, Curva> {
  const mapa = new Map<string, Curva>();
  const comCompra = clientes.filter((c) => num(c.totalComprado) > 0);
  const semCompra = clientes.filter((c) => num(c.totalComprado) <= 0);

  for (const c of semCompra) mapa.set(c.id, "D");
  if (comCompra.length === 0) return mapa;

  const ordenados = [...comCompra].sort((a, b) => num(b.totalComprado) - num(a.totalComprado));
  const total = ordenados.reduce((s, c) => s + num(c.totalComprado), 0);

  let acumulado = 0;
  for (const c of ordenados) {
    acumulado += num(c.totalComprado);
    const fatia = total > 0 ? acumulado / total : 1;
    mapa.set(c.id, fatia <= 0.8 ? "A" : fatia <= 0.95 ? "B" : "C");
  }
  return mapa;
}

/** Frequencia sugerida por curva — quem compra mais, vê mais. */
export const frequenciaPorCurva: Record<Curva, number> = {
  A: 15,
  B: 30,
  C: 60,
  D: 90,
};

// ==================================================================
// Risco
// ==================================================================

export interface Risco {
  nivel: "ok" | "atencao" | "critico";
  pontos: number;
  motivos: string[];
  diasSemVisita: number | null;
  diasSemPedido: number | null;
  atrasoVisitaDias: number;
}

/**
 * Cliente em risco: comprava com regularidade e parou, ou passou muito
 * do prazo de visita. E o aviso que mais salva carteira.
 */
export function avaliarRisco(c: ClienteAnalise): Risco {
  const motivos: string[] = [];
  let pontos = 0;

  const diasSemVisita = c.ultimaVisitaEm ? diasEntre(c.ultimaVisitaEm) : null;
  const diasSemPedido = c.ultimoPedidoEm ? diasEntre(c.ultimoPedidoEm) : null;
  const frequencia = Math.max(7, num(c.frequenciaVisitaDias, 30));
  const atrasoVisitaDias = diasSemVisita === null ? 0 : Math.max(0, diasSemVisita - frequencia);

  if (diasSemVisita === null && c.qtdPedidos > 0) {
    motivos.push("Nunca registrou visita");
    pontos += 20;
  } else if (atrasoVisitaDias > 0) {
    const proporcao = atrasoVisitaDias / frequencia;
    pontos += Math.min(45, Math.round(proporcao * 45));
    motivos.push(`${atrasoVisitaDias} dias além da frequência combinada`);
  }

  if (c.qtdPedidos >= 2 && diasSemPedido !== null) {
    // intervalo tipico entre pedidos deste cliente
    const intervaloTipico = Math.max(20, frequencia);
    if (diasSemPedido > intervaloTipico * 2) {
      pontos += 40;
      motivos.push(`Sem pedido há ${diasSemPedido} dias — o dobro do normal`);
    } else if (diasSemPedido > intervaloTipico * 1.4) {
      pontos += 22;
      motivos.push(`Sem pedido há ${diasSemPedido} dias`);
    }
  }

  if (c.curva === "A") pontos = Math.round(pontos * 1.35);
  if (c.curva === "B") pontos = Math.round(pontos * 1.15);
  if (c.status === "INATIVO") pontos += 15;

  const nivel: Risco["nivel"] = pontos >= 55 ? "critico" : pontos >= 28 ? "atencao" : "ok";

  return { nivel, pontos: Math.min(100, pontos), motivos, diasSemVisita, diasSemPedido, atrasoVisitaDias };
}

// ==================================================================
// Proxima visita
// ==================================================================

export function proximaVisitaSugerida(c: ClienteAnalise): Date {
  const frequencia = Math.max(7, num(c.frequenciaVisitaDias, 30));
  const referencia = c.ultimaVisitaEm ? new Date(c.ultimaVisitaEm) : new Date();
  const alvo = somaDias(referencia, frequencia);
  const hoje = new Date();
  hoje.setHours(9, 0, 0, 0);
  return alvo < hoje ? hoje : alvo;
}

/** Ordena a carteira por urgencia de visita — o coração do "quem vejo hoje". */
export function filaDeVisita(clientes: ClienteAnalise[]): Array<ClienteAnalise & { risco: Risco; prioridade: number }> {
  const pesoCurva: Record<Curva, number> = { A: 3, B: 2, C: 1.2, D: 0.8 };

  return clientes
    .map((c) => {
      const risco = avaliarRisco(c);
      const prioridade =
        risco.pontos * pesoCurva[c.curva] + Math.min(30, risco.atrasoVisitaDias) + (c.status === "PROSPECT" ? 8 : 0);
      return { ...c, risco, prioridade };
    })
    .sort((a, b) => b.prioridade - a.prioridade);
}

// ==================================================================
// Montagem automatica da semana
// ==================================================================

export interface SugestaoDia {
  data: Date;
  diaSemana: number;
  clientes: Array<ClienteAnalise & { risco: Risco; prioridade: number }>;
  minutosOcupados: number;
}

export interface OpcoesSemana {
  inicio?: Date;
  diasUteis?: number[];
  visitasPorDia?: number;
  minutosPorDia?: number;
  /** Agrupa por regiao para nao cruzar a cidade duas vezes. */
  agruparPorRegiao?: boolean;
}

/**
 * Distribui a carteira pela semana: primeiro quem esta mais atrasado,
 * agrupando por regiao para o dia nao virar zigue-zague.
 */
export function montarSemana(clientes: ClienteAnalise[], opcoes: OpcoesSemana = {}): SugestaoDia[] {
  const diasUteis = opcoes.diasUteis ?? [1, 2, 3, 4, 5];
  const visitasPorDia = opcoes.visitasPorDia ?? 8;
  const minutosPorDia = opcoes.minutosPorDia ?? 8 * 60;
  const agrupar = opcoes.agruparPorRegiao ?? true;

  const base = opcoes.inicio ? new Date(opcoes.inicio) : new Date();
  base.setHours(0, 0, 0, 0);

  // proximos dias uteis a partir de hoje
  const dias: SugestaoDia[] = [];
  const cursor = new Date(base);
  let guarda = 0;
  while (dias.length < diasUteis.length && guarda < 21) {
    guarda++;
    if (diasUteis.includes(cursor.getDay())) {
      dias.push({ data: new Date(cursor), diaSemana: cursor.getDay(), clientes: [], minutosOcupados: 0 });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  if (dias.length === 0) return [];

  const fila = filaDeVisita(clientes).filter(
    (c) => c.status !== "PERDIDO" && c.status !== "BLOQUEADO",
  );

  // Regiao dominante por dia: o primeiro cliente encaixado define o dia.
  const regiaoDoDia = new Map<number, string | null>();

  for (const cliente of fila) {
    const duracao = num(cliente.tempoVisitaMin, 40) + 20; // visita + deslocamento medio

    const candidatos = dias
      .filter((d) => d.clientes.length < visitasPorDia && d.minutosOcupados + duracao <= minutosPorDia)
      .filter((d) => !cliente.diasAtendimento?.length || cliente.diasAtendimento.includes(d.diaSemana));

    if (candidatos.length === 0) continue;

    let escolhido = candidatos[0];
    if (agrupar && cliente.regionId) {
      const mesmaRegiao = candidatos.find(
        (d) => regiaoDoDia.get(d.diaSemana) === cliente.regionId,
      );
      const vazio = candidatos.find((d) => !regiaoDoDia.has(d.diaSemana));
      escolhido = mesmaRegiao ?? vazio ?? candidatos[0];
    }

    if (!regiaoDoDia.has(escolhido.diaSemana)) {
      regiaoDoDia.set(escolhido.diaSemana, cliente.regionId ?? null);
    }
    escolhido.clientes.push(cliente);
    escolhido.minutosOcupados += duracao;
  }

  return dias;
}

// ==================================================================
// ROI por cliente
// ==================================================================

export interface RoiCliente {
  comissaoGerada: number;
  custoAtendimento: number;
  resultado: number;
  retornoPorReal: number;
  saudavel: boolean;
}

/**
 * Quanto aquele cliente deixa depois de descontar o que custa ir até ele.
 * Uso: "esse cliente rende R$ 12 pra cada R$ 1 de estrada".
 */
export function roiDoCliente(entrada: {
  comissaoRecebida: number;
  visitasNoPeriodo: number;
  kmPorVisita: number;
  custoPorKm: number;
  tempoVisitaMin: number;
  custoMinuto?: number;
}): RoiCliente {
  const custoMinuto = entrada.custoMinuto ?? 0.6;
  const custoAtendimento =
    entrada.visitasNoPeriodo * (entrada.kmPorVisita * 2 * entrada.custoPorKm + entrada.tempoVisitaMin * custoMinuto);
  const comissaoGerada = num(entrada.comissaoRecebida);
  const resultado = comissaoGerada - custoAtendimento;

  return {
    comissaoGerada,
    custoAtendimento,
    resultado,
    retornoPorReal: custoAtendimento > 0 ? comissaoGerada / custoAtendimento : comissaoGerada > 0 ? Infinity : 0,
    saudavel: resultado > 0,
  };
}

// ==================================================================
// Previsao de caixa
// ==================================================================

export interface PontoFluxo {
  competencia: string;
  rotulo: string;
  previsto: number;
  recebido: number;
  vencido: number;
}

/** Agrupa comissoes por competencia para o grafico de previsao. */
export function fluxoDeCaixa(
  comissoes: Array<{
    competencia: string;
    valorPrevisto: number;
    valorRecebido: number;
    status: string;
  }>,
  meses = 6,
): PontoFluxo[] {
  const mapa = new Map<string, PontoFluxo>();

  const hoje = new Date();
  for (let i = 0; i < meses; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    const comp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    mapa.set(comp, { competencia: comp, rotulo: comp, previsto: 0, recebido: 0, vencido: 0 });
  }

  for (const c of comissoes) {
    const atual = mapa.get(c.competencia);
    if (!atual) continue;
    if (c.status === "RECEBIDA" || c.status === "PARCIAL") atual.recebido += num(c.valorRecebido);
    if (c.status === "VENCIDA") atual.vencido += num(c.valorPrevisto) - num(c.valorRecebido);
    if (c.status !== "CANCELADA" && c.status !== "GLOSADA") atual.previsto += num(c.valorPrevisto);
  }

  return [...mapa.values()];
}
