/**
 * Formatacao brasileira e utilitarios de apresentacao.
 * Tudo aqui roda tanto no servidor quanto no cliente.
 */

export function cx(...partes: Array<string | false | null | undefined>) {
  return partes.filter(Boolean).join(" ");
}

/** Prisma devolve Decimal/Date; o React Server Component precisa de valor simples. */
export function plain<T>(valor: T): T {
  if (valor === null || valor === undefined) return valor;
  if (typeof valor !== "object") return valor;
  if (valor instanceof Date) return valor as T;
  if (Array.isArray(valor)) return valor.map(plain) as unknown as T;

  const obj = valor as Record<string, unknown>;
  // Prisma.Decimal expõe toNumber()
  if (typeof (obj as { toNumber?: unknown }).toNumber === "function") {
    return (obj as unknown as { toNumber(): number }).toNumber() as unknown as T;
  }

  const saida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) saida[k] = plain(v);
  return saida as T;
}

export function num(valor: unknown, padrao = 0): number {
  if (valor === null || valor === undefined) return padrao;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : padrao;
  if (typeof valor === "string") {
    const limpo = valor.replace(/\./g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
    const n = Number(limpo);
    return Number.isFinite(n) ? n : padrao;
  }
  if (typeof valor === "object" && typeof (valor as { toNumber?: unknown }).toNumber === "function") {
    return (valor as { toNumber(): number }).toNumber();
  }
  const n = Number(valor);
  return Number.isFinite(n) ? n : padrao;
}

// ------------------------------------------------------------------
// Dinheiro
// ------------------------------------------------------------------

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function dinheiro(valor: unknown): string {
  return brl.format(num(valor));
}

/**
 * R$ 128,4 mil — para tiles e graficos onde espaco é curto.
 *
 * Feito na mao de proposito: o `notation: "compact"` do Intl sai
 * diferente no Node e no Chrome ("R$ 180,0 mil" x "R$ 180 mil"), o que
 * quebra a hidratacao do React.
 */
export function dinheiroCurto(valor: unknown): string {
  const n = num(valor);
  const absoluto = Math.abs(n);
  if (absoluto < 1000) return brl.format(n);

  const sinal = n < 0 ? "-" : "";
  const enxugar = (x: number) => {
    const texto = x.toFixed(1).replace(".", ",");
    return texto.endsWith(",0") ? texto.slice(0, -2) : texto;
  };

  if (absoluto < 1_000_000) return `${sinal}R$ ${enxugar(absoluto / 1_000)} mil`;
  if (absoluto < 1_000_000_000) return `${sinal}R$ ${enxugar(absoluto / 1_000_000)} mi`;
  return `${sinal}R$ ${enxugar(absoluto / 1_000_000_000)} bi`;
}

/** Sem o "R$", para quando o rotulo ja diz que é reais. */
export function numeroBR(valor: unknown, casas = 2): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(num(valor));
}

export function percentual(valor: unknown, casas = 2): string {
  return `${numeroBR(valor, casas).replace(/,00$/, "")}%`;
}

export function km(valor: unknown): string {
  const n = num(valor);
  return `${numeroBR(n, n < 10 ? 1 : 0)} km`;
}

export function litros(valor: unknown): string {
  return `${numeroBR(valor, 1)} L`;
}

export function duracao(minutos: unknown): string {
  const m = Math.max(0, Math.round(num(minutos)));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}min`;
  if (r === 0) return `${h}h`;
  return `${h}h${String(r).padStart(2, "0")}`;
}

// ------------------------------------------------------------------
// Datas
// ------------------------------------------------------------------

const TZ = "America/Sao_Paulo";

export function dataBR(valor: Date | string | null | undefined): string {
  if (!valor) return "—";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ }).format(d);
}

export function dataHoraBR(valor: Date | string | null | undefined): string {
  if (!valor) return "—";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

export function hora(valor: Date | string | null | undefined): string {
  if (!valor) return "—";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function dataExtenso(valor: Date | string): string {
  const d = new Date(valor);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(d);
}

export function diaMes(valor: Date | string): string {
  const d = new Date(valor);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit" }).format(d);
}

export function mesAno(competencia: string): string {
  const [ano, mes] = competencia.split("-").map(Number);
  if (!ano || !mes) return competencia;
  const nomes = [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez",
  ];
  return `${nomes[mes - 1]}/${String(ano).slice(2)}`;
}

export function diasEntre(a: Date | string, b: Date | string = new Date()): number {
  const d1 = new Date(a).getTime();
  const d2 = new Date(b).getTime();
  return Math.round((d2 - d1) / 86_400_000);
}

/** "há 3 dias", "em 12 dias", "hoje" */
export function tempoRelativo(valor: Date | string | null | undefined): string {
  if (!valor) return "nunca";
  const dias = diasEntre(valor);
  if (dias === 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias === -1) return "amanhã";
  if (dias > 0) {
    if (dias < 30) return `há ${dias} dias`;
    const meses = Math.round(dias / 30);
    if (meses < 12) return `há ${meses} ${meses === 1 ? "mês" : "meses"}`;
    return `há ${Math.round(meses / 12)} ano(s)`;
  }
  const falta = Math.abs(dias);
  if (falta < 30) return `em ${falta} dias`;
  return `em ${Math.round(falta / 30)} ${Math.round(falta / 30) === 1 ? "mês" : "meses"}`;
}

export function competenciaDe(data: Date | string): string {
  const d = new Date(data);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** yyyy-mm-dd no fuso local, para <input type="date"> */
export function paraInputData(valor: Date | string | null | undefined): string {
  if (!valor) return "";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

export function paraInputDataHora(valor: Date | string | null | undefined): string {
  if (!valor) return "";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
}

export function inicioDoDia(valor: Date | string = new Date()): Date {
  const d = new Date(valor);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function fimDoDia(valor: Date | string = new Date()): Date {
  const d = new Date(valor);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function somaDias(valor: Date | string, dias: number): Date {
  const d = new Date(valor);
  d.setDate(d.getDate() + dias);
  return d;
}

/** Junta "08:00" a uma data. */
export function comHorario(data: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(data);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

// ------------------------------------------------------------------
// Documentos e contatos
// ------------------------------------------------------------------

export function soDigitos(valor: string | null | undefined): string {
  return (valor ?? "").replace(/\D/g, "");
}

export function formatarCnpj(valor: string | null | undefined): string {
  const d = soDigitos(valor);
  if (d.length !== 14) return valor ?? "";
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export function formatarCpf(valor: string | null | undefined): string {
  const d = soDigitos(valor);
  if (d.length !== 11) return valor ?? "";
  return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

export function formatarDocumento(valor: string | null | undefined): string {
  const d = soDigitos(valor);
  if (d.length === 14) return formatarCnpj(d);
  if (d.length === 11) return formatarCpf(d);
  return valor ?? "";
}

export function formatarCep(valor: string | null | undefined): string {
  const d = soDigitos(valor);
  if (d.length !== 8) return valor ?? "";
  return d.replace(/^(\d{5})(\d{3})$/, "$1-$2");
}

export function formatarTelefone(valor: string | null | undefined): string {
  const d = soDigitos(valor);
  if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  return valor ?? "";
}

export function validarCnpj(valor: string | null | undefined): boolean {
  const c = soDigitos(valor);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const calc = (base: string) => {
    let peso = base.length - 7;
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * peso--;
      if (peso < 2) peso = 9;
    }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(c.slice(0, 12));
  const d2 = calc(c.slice(0, 12) + d1);
  return c === c.slice(0, 12) + d1 + d2;
}

export function validarCpf(valor: string | null | undefined): boolean {
  const c = soDigitos(valor);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const calc = (qtd: number) => {
    let soma = 0;
    for (let i = 0; i < qtd; i++) soma += Number(c[i]) * (qtd + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(c[9]) && calc(10) === Number(c[10]);
}

/** Link de conversa no WhatsApp com mensagem pronta. */
export function linkWhatsapp(telefone: string | null | undefined, mensagem?: string): string | null {
  const d = soDigitos(telefone);
  if (d.length < 10) return null;
  const completo = d.startsWith("55") ? d : `55${d}`;
  const texto = mensagem ? `?text=${encodeURIComponent(mensagem)}` : "";
  return `https://wa.me/${completo}${texto}`;
}

export function iniciais(nome: string | null | undefined): string {
  if (!nome) return "—";
  const partes = nome.trim().split(/\s+/).filter((p) => p.length > 2);
  if (partes.length === 0) return nome.slice(0, 2).toUpperCase();
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function primeiroNome(nome: string | null | undefined): string {
  return (nome ?? "").trim().split(/\s+/)[0] ?? "";
}

export function titulo(valor: string | null | undefined): string {
  if (!valor) return "";
  const minusculas = new Set(["de", "da", "do", "das", "dos", "e", "em", "a", "o"]);
  return valor
    .toLowerCase()
    .split(" ")
    .map((p, i) => (i > 0 && minusculas.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");
}

/**
 * Enums do banco viram texto legivel. O dicionario existe porque os
 * valores sao gravados sem acento e "Prospeccao" fica feio na tela.
 */
const ROTULOS: Record<string, string> = {
  // situacao de cliente e representada
  PROSPECCAO: "Prospecção",
  EM_RISCO: "Em risco",
  // agenda
  PROSPECCAO_VISITA: "Prospecção",
  COBRANCA: "Cobrança",
  REUNIAO: "Reunião",
  POS_VENDA: "Pós-venda",
  EM_ROTA: "Em rota",
  EM_ATENDIMENTO: "Em atendimento",
  CONCLUIDO: "Concluído",
  CONCLUIDA: "Concluída",
  NAO_ATENDIDO: "Não atendido",
  // resultado de visita
  ORCAMENTO: "Orçamento",
  SEM_PEDIDO: "Sem pedido",
  CLIENTE_AUSENTE: "Cliente ausente",
  AGENDOU_RETORNO: "Agendou retorno",
  RECLAMACAO: "Reclamação",
  // rota
  RAPIDO: "Rápido",
  ECONOMICO: "Econômico",
  EM_ANDAMENTO: "Em andamento",
  // comissao
  A_RECEBER: "A receber",
  NOTA_SERVICO: "Nota de serviço",
  DEPOSITO: "Depósito",
  VALOR_LIQUIDO: "Valor líquido",
  EMISSAO_NF: "Emissão da NF",
  EMISSAO_PEDIDO: "Emissão do pedido",
  PAGAMENTO_CLIENTE: "Pagamento do cliente",
  DATA_FIXA: "Data fixa",
  POR_PEDIDO: "Por pedido",
  POR_LINHA: "Por linha",
  UNICO: "Único",
  PROGRESSIVO: "Progressivo",
  // veiculo
  ELETRICO: "Elétrico",
  // importacao
  clientes: "Clientes",
  pedidos: "Pedidos",
  produtos: "Produtos",
};

export function rotulo(valor: string | null | undefined): string {
  if (!valor) return "—";
  return ROTULOS[valor] ?? titulo(valor.replace(/_/g, " ").toLowerCase());
}

export function endereco(c: {
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
}): string {
  const linha1 = [c.logradouro, c.numero].filter(Boolean).join(", ");
  const linha2 = [c.bairro, c.cidade && c.uf ? `${c.cidade}/${c.uf}` : c.cidade].filter(Boolean).join(" · ");
  return [linha1, linha2].filter(Boolean).join(" — ") || "Sem endereço";
}

/** Saudacao conforme a hora — usada no cabecalho do Meu Dia. */
export function saudacao(agora = new Date()): string {
  const h = Number(
    new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "numeric", hour12: false }).format(agora),
  );
  if (h < 5) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}
