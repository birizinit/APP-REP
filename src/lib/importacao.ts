import "server-only";

/**
 * Importacao de planilha (xlsx/csv) e leitura de PDF de pedido.
 *
 * A planilha nunca vem no formato que a gente quer, entao o sistema tenta
 * adivinhar o mapeamento das colunas e devolve a sugestao para o usuario
 * confirmar na tela.
 */

import Papa from "papaparse";

import { num, soDigitos, validarCnpj } from "@/lib/format";

export interface PlanilhaLida {
  colunas: string[];
  linhas: Array<Record<string, string>>;
  total: number;
}

// ==================================================================
// Leitura
// ==================================================================

export async function lerPlanilha(arquivo: Buffer, nome: string): Promise<PlanilhaLida> {
  const extensao = nome.toLowerCase().split(".").pop() ?? "";

  if (extensao === "csv" || extensao === "txt") return lerCsv(arquivo);
  if (extensao === "xlsx" || extensao === "xlsm" || extensao === "xls") return lerExcel(arquivo);

  throw new Error("Formato não suportado. Envie .xlsx, .xls ou .csv.");
}

function lerCsv(arquivo: Buffer): PlanilhaLida {
  const texto = arquivo.toString("utf8").replace(/^﻿/, "");
  const resultado = Papa.parse<Record<string, string>>(texto, {
    header: true,
    skipEmptyLines: "greedy",
    delimiter: "", // detecta ; ou ,
    transformHeader: (h) => h.trim(),
  });

  const linhas = (resultado.data ?? []).filter((l) =>
    Object.values(l).some((v) => String(v ?? "").trim() !== ""),
  );

  return {
    colunas: resultado.meta.fields ?? Object.keys(linhas[0] ?? {}),
    linhas,
    total: linhas.length,
  };
}

async function lerExcel(arquivo: Buffer): Promise<PlanilhaLida> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(arquivo as unknown as ArrayBuffer);

  const aba = wb.worksheets[0];
  if (!aba) throw new Error("A planilha está vazia.");

  // Acha a linha de cabecalho: a primeira com 2+ celulas de texto
  let linhaCabecalho = 1;
  for (let i = 1; i <= Math.min(10, aba.rowCount); i++) {
    const preenchidas = (aba.getRow(i).values as unknown[]).filter(
      (v) => v !== null && v !== undefined && String(v).trim() !== "",
    );
    if (preenchidas.length >= 2) {
      linhaCabecalho = i;
      break;
    }
  }

  const cabecalho = aba.getRow(linhaCabecalho);
  const colunas: string[] = [];
  cabecalho.eachCell({ includeEmpty: false }, (cell, col) => {
    colunas[col - 1] = String(valorDaCelula(cell.value) ?? `Coluna ${col}`).trim();
  });

  const linhas: Array<Record<string, string>> = [];
  for (let i = linhaCabecalho + 1; i <= aba.rowCount; i++) {
    const linha = aba.getRow(i);
    const registro: Record<string, string> = {};
    let temConteudo = false;
    colunas.forEach((nomeColuna, idx) => {
      if (!nomeColuna) return;
      const valor = valorDaCelula(linha.getCell(idx + 1).value);
      const texto = valor === null || valor === undefined ? "" : String(valor).trim();
      registro[nomeColuna] = texto;
      if (texto !== "") temConteudo = true;
    });
    if (temConteudo) linhas.push(registro);
  }

  return { colunas: colunas.filter(Boolean), linhas, total: linhas.length };
}

function valorDaCelula(valor: unknown): unknown {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === "object") {
    const v = valor as Record<string, unknown>;
    if ("text" in v) return v.text;
    if ("result" in v) return v.result;
    if ("richText" in v && Array.isArray(v.richText)) {
      return (v.richText as Array<{ text: string }>).map((p) => p.text).join("");
    }
    if (v instanceof Date) return v;
  }
  return valor;
}

// ==================================================================
// Mapeamento automatico de colunas
// ==================================================================

export const camposCliente = {
  cnpj: ["cnpj", "cnpj/cpf", "cpf/cnpj", "documento", "doc", "cnpjcpf"],
  razaoSocial: ["razao social", "razão social", "razao", "cliente", "nome", "empresa", "razaosocial"],
  nomeFantasia: ["fantasia", "nome fantasia", "apelido", "nomefantasia"],
  email: ["email", "e-mail", "mail"],
  telefone: ["telefone", "fone", "tel", "celular", "whatsapp", "contato fone"],
  contatoNome: ["contato", "comprador", "responsavel", "responsável", "nome contato"],
  cep: ["cep", "codigo postal"],
  logradouro: ["endereco", "endereço", "logradouro", "rua", "av"],
  numero: ["numero", "número", "nro", "num"],
  complemento: ["complemento", "compl"],
  bairro: ["bairro"],
  cidade: ["cidade", "municipio", "município", "localidade"],
  uf: ["uf", "estado", "sigla"],
  inscricaoEstadual: ["ie", "inscricao estadual", "inscrição estadual", "insc estadual"],
  observacoes: ["obs", "observacao", "observação", "observacoes", "anotacoes"],
} as const;

export const camposPedido = {
  numero: ["pedido", "numero", "número", "nro pedido", "num pedido", "n pedido", "documento"],
  cnpj: ["cnpj", "cnpj cliente", "documento cliente"],
  cliente: ["cliente", "razao social", "razão social", "nome cliente"],
  data: ["data", "data pedido", "emissao", "emissão", "dt emissao"],
  valor: ["valor", "total", "valor total", "vl total", "valor pedido", "total pedido"],
  condicaoPagamento: ["condicao", "condição", "cond pagamento", "pagamento", "prazo"],
  representada: ["representada", "fornecedor", "fabricante", "industria", "indústria"],
  comissao: ["comissao", "comissão", "percentual", "% comissao"],
  produto: ["produto", "descricao", "descrição", "item", "mercadoria"],
  codigo: ["codigo", "código", "cod", "sku", "referencia", "referência"],
  quantidade: ["quantidade", "qtd", "qtde", "qt"],
  precoUnitario: ["preco", "preço", "unitario", "unitário", "vl unit", "preco unit"],
} as const;

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Sugere qual coluna da planilha corresponde a cada campo do sistema. */
export function sugerirMapeamento(
  colunas: string[],
  dicionario: Record<string, readonly string[]>,
): Record<string, string | null> {
  const mapa: Record<string, string | null> = {};
  const usadas = new Set<string>();
  const normalizadas = colunas.map((c) => ({ original: c, norm: normalizar(c) }));

  for (const [campo, apelidos] of Object.entries(dicionario)) {
    let achou: string | null = null;

    // 1) igualdade exata
    for (const apelido of apelidos) {
      const alvo = normalizar(apelido);
      const col = normalizadas.find((c) => c.norm === alvo && !usadas.has(c.original));
      if (col) {
        achou = col.original;
        break;
      }
    }

    // 2) contem
    if (!achou) {
      for (const apelido of apelidos) {
        const alvo = normalizar(apelido);
        const col = normalizadas.find(
          (c) => !usadas.has(c.original) && (c.norm.includes(alvo) || alvo.includes(c.norm)),
        );
        if (col) {
          achou = col.original;
          break;
        }
      }
    }

    if (achou) usadas.add(achou);
    mapa[campo] = achou;
  }

  return mapa;
}

/** Converte "1.234,56", "R$ 1.234,56" e "1234.56" em numero. */
export function valorBR(texto: string | null | undefined): number {
  if (!texto) return 0;
  const limpo = String(texto).replace(/[^\d,.-]/g, "").trim();
  if (!limpo) return 0;
  const temVirgula = limpo.includes(",");
  const temPonto = limpo.includes(".");
  if (temVirgula && temPonto) return num(limpo.replace(/\./g, "").replace(",", "."));
  if (temVirgula) return num(limpo.replace(",", "."));
  return num(limpo);
}

/** Aceita 31/12/2025, 2025-12-31 e serial do Excel. */
export function dataDoTexto(texto: string | null | undefined): Date | null {
  if (!texto) return null;
  const t = String(texto).trim();

  const br = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (br) {
    const ano = Number(br[3].length === 2 ? `20${br[3]}` : br[3]);
    const d = new Date(ano, Number(br[2]) - 1, Number(br[1]), 12);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12);

  const serial = Number(t);
  if (Number.isFinite(serial) && serial > 20000 && serial < 60000) {
    return new Date(Date.UTC(1899, 11, 30 + serial, 12));
  }

  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ==================================================================
// PDF de pedido
// ==================================================================

export interface PedidoExtraido {
  numero: string | null;
  cnpj: string | null;
  razaoSocial: string | null;
  data: Date | null;
  valorTotal: number | null;
  condicaoPagamento: string | null;
  itens: Array<{
    codigo: string | null;
    descricao: string;
    quantidade: number;
    precoUnitario: number;
    total: number;
  }>;
  textoBruto: string;
  confianca: "alta" | "media" | "baixa";
}

export async function lerTextoDoPdf(arquivo: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(arquivo));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

/**
 * Extrai o que dá de um PDF de pedido. Layout varia de industria para
 * industria, entao o resultado sempre volta para conferencia na tela.
 */
export async function extrairPedidoDoPdf(arquivo: Buffer): Promise<PedidoExtraido> {
  const texto = await lerTextoDoPdf(arquivo);
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  // --- CNPJ: pega o segundo (o primeiro costuma ser da industria emissora)
  const cnpjs = [...texto.matchAll(/\b(\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-\s]?\d{2})\b/g)]
    .map((m) => soDigitos(m[1]))
    .filter((c) => c.length === 14 && validarCnpj(c));
  const cnpjUnicos = [...new Set(cnpjs)];
  const cnpj = cnpjUnicos[1] ?? cnpjUnicos[0] ?? null;

  // --- numero do pedido
  const numeroMatch =
    texto.match(/(?:pedido|ped\.?|n[uú]mero|n[º°.]?)\s*[:#nº°-]*\s*(\d{2,12})/i) ??
    texto.match(/\bOP\s*(\d{3,10})\b/i);
  const numero = numeroMatch?.[1] ?? null;

  // --- data
  const dataMatch = texto.match(/\b(\d{2}[/-]\d{2}[/-]\d{4})\b/);
  const data = dataMatch ? dataDoTexto(dataMatch[1]) : null;

  // --- razao social: linha proxima ao CNPJ do cliente
  let razaoSocial: string | null = null;
  if (cnpj) {
    const idx = linhas.findIndex((l) => soDigitos(l).includes(cnpj));
    if (idx >= 0) {
      const candidatas = [linhas[idx], linhas[idx - 1], linhas[idx + 1]].filter(Boolean);
      for (const c of candidatas) {
        const semDoc = c.replace(/\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-\s]?\d{2}/g, "").trim();
        const limpo = semDoc
          .replace(/^(cliente|raz[aã]o social|destinat[aá]rio|comprador)\s*[:.-]?\s*/i, "")
          .trim();
        if (limpo.length > 6 && /[A-Za-zÀ-ú]/.test(limpo)) {
          razaoSocial = limpo.slice(0, 120);
          break;
        }
      }
    }
  }

  // --- total: prefere a linha que fala "total geral" / "valor total"
  let valorTotal: number | null = null;
  const linhaTotal = linhas
    .slice()
    .reverse()
    .find((l) => /(total geral|valor total|total do pedido|total da nota|total r\$)/i.test(l));
  if (linhaTotal) {
    const valores = linhaTotal.match(/[\d.]+,\d{2}/g);
    if (valores?.length) valorTotal = valorBR(valores[valores.length - 1]);
  }
  if (valorTotal === null) {
    const todos = (texto.match(/[\d.]+,\d{2}/g) ?? []).map(valorBR);
    if (todos.length) valorTotal = Math.max(...todos);
  }

  // --- condicao de pagamento
  const condicaoMatch = texto.match(
    /(?:cond(?:i[cç][aã]o)?(?:\s*de)?\s*pag(?:amento)?|prazo)\s*[:.-]?\s*([^\n]{2,40})/i,
  );
  const condicaoPagamento = condicaoMatch?.[1]?.trim().slice(0, 40) ?? null;

  // --- itens: linhas com codigo, quantidade e dois valores monetarios
  const itens: PedidoExtraido["itens"] = [];
  for (const linha of linhas) {
    const valores = linha.match(/[\d.]+,\d{2}/g);
    if (!valores || valores.length < 2) continue;
    if (/(total|subtotal|frete|desconto|ipi|icms|base)/i.test(linha)) continue;

    const qtdMatch = linha.match(/\b(\d{1,5}(?:[.,]\d{1,3})?)\s*(?:un|pc|cx|pç|kg|mt|m|lt|pct|fd|dz)?\b/i);
    const codigoMatch = linha.match(/^([A-Z0-9][A-Z0-9.\-/]{2,14})\s/i);

    const precoUnitario = valorBR(valores[valores.length - 2]);
    const total = valorBR(valores[valores.length - 1]);
    if (precoUnitario <= 0 || total <= 0) continue;

    const quantidade = qtdMatch ? valorBR(qtdMatch[1]) || 1 : Math.max(1, Math.round(total / precoUnitario));

    const descricao = linha
      .replace(/[\d.]+,\d{2}/g, "")
      .replace(codigoMatch?.[1] ?? "", "")
      .replace(/\s+/g, " ")
      .trim();

    if (descricao.length < 3) continue;

    itens.push({
      codigo: codigoMatch?.[1] ?? null,
      descricao: descricao.slice(0, 160),
      quantidade,
      precoUnitario,
      total,
    });
  }

  const acertos = [cnpj, numero, valorTotal, itens.length > 0].filter(Boolean).length;
  const confianca = acertos >= 3 ? "alta" : acertos === 2 ? "media" : "baixa";

  return {
    numero,
    cnpj,
    razaoSocial,
    data,
    valorTotal,
    condicaoPagamento,
    itens: itens.slice(0, 200),
    textoBruto: texto.slice(0, 20000),
    confianca,
  };
}
