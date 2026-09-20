"use server";

import { revalidatePath } from "next/cache";

import { exigirUsuario } from "@/lib/auth";
import { geocodificar } from "@/lib/consultas";
import { num, soDigitos, validarCnpj } from "@/lib/format";
import {
  camposCliente,
  camposPedido,
  dataDoTexto,
  extrairPedidoDoPdf,
  lerPlanilha,
  sugerirMapeamento,
  valorBR,
  type PedidoExtraido,
} from "@/lib/importacao";
import { prisma } from "@/lib/prisma";
import { salvarPedido } from "@/app/actions/pedidos";

const LIMITE_BYTES = 12 * 1024 * 1024;

export interface AnalisePlanilha {
  tipo: "planilha";
  arquivoNome: string;
  colunas: string[];
  mapeamento: Record<string, string | null>;
  amostra: Array<Record<string, string>>;
  total: number;
  jobId: string;
}

export interface AnalisePdf {
  tipo: "pdf";
  arquivoNome: string;
  extraido: PedidoExtraido;
  clienteSugerido: { id: string; razaoSocial: string; nomeFantasia: string | null } | null;
  jobId: string;
}

/** Lê o arquivo e devolve a prévia para o usuário conferir antes de gravar. */
export async function analisarArquivo(dados: FormData) {
  const user = await exigirUsuario();

  const arquivo = dados.get("arquivo");
  const destino = String(dados.get("destino") ?? "clientes");

  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false as const, erro: "Escolha um arquivo." };
  }
  if (arquivo.size > LIMITE_BYTES) {
    return { ok: false as const, erro: "Arquivo muito grande (máximo 12 MB)." };
  }

  const buffer = Buffer.from(await arquivo.arrayBuffer());
  const extensao = arquivo.name.toLowerCase().split(".").pop() ?? "";

  try {
    if (extensao === "pdf") {
      const extraido = await extrairPedidoDoPdf(buffer);

      const clienteSugerido = extraido.cnpj
        ? await prisma.client.findFirst({
            where: { userId: user.id, cnpj: extraido.cnpj },
            select: { id: true, razaoSocial: true, nomeFantasia: true },
          })
        : null;

      const job = await prisma.importJob.create({
        data: {
          userId: user.id,
          tipo: "pedidos",
          formato: "pdf",
          arquivoNome: arquivo.name,
          status: "PROCESSANDO",
          totalLinhas: extraido.itens.length,
          preview: JSON.parse(JSON.stringify({ ...extraido, textoBruto: undefined })),
        },
      });

      return {
        ok: true as const,
        analise: {
          tipo: "pdf" as const,
          arquivoNome: arquivo.name,
          extraido,
          clienteSugerido,
          jobId: job.id,
        },
      };
    }

    const planilha = await lerPlanilha(buffer, arquivo.name);
    if (planilha.total === 0) {
      return { ok: false as const, erro: "Não encontrei nenhuma linha preenchida." };
    }

    const dicionario = destino === "pedidos" ? camposPedido : camposCliente;
    const mapeamento = sugerirMapeamento(planilha.colunas, dicionario);

    const job = await prisma.importJob.create({
      data: {
        userId: user.id,
        tipo: destino,
        formato: extensao === "csv" ? "csv" : "xlsx",
        arquivoNome: arquivo.name,
        status: "PROCESSANDO",
        totalLinhas: planilha.total,
        mapeamento,
        preview: planilha.linhas.slice(0, 200),
      },
    });

    return {
      ok: true as const,
      analise: {
        tipo: "planilha" as const,
        arquivoNome: arquivo.name,
        colunas: planilha.colunas,
        mapeamento,
        amostra: planilha.linhas.slice(0, 8),
        total: planilha.total,
        jobId: job.id,
      },
    };
  } catch (erro) {
    return { ok: false as const, erro: (erro as Error).message };
  }
}

// ==================================================================
// Clientes
// ==================================================================

export async function importarClientes(entrada: {
  jobId: string;
  mapeamento: Record<string, string | null>;
  atualizarExistentes: boolean;
  regionId?: string | null;
  representadaId?: string | null;
  geocodificarDepois?: boolean;
}) {
  const user = await exigirUsuario();

  const job = await prisma.importJob.findFirst({
    where: { id: entrada.jobId, userId: user.id },
  });
  if (!job?.preview) return { erro: "Importação expirou. Envie o arquivo de novo." };

  const linhas = job.preview as Array<Record<string, string>>;
  const m = entrada.mapeamento;
  const valor = (linha: Record<string, string>, campo: string) => {
    const coluna = m[campo];
    return coluna ? String(linha[coluna] ?? "").trim() : "";
  };

  let importados = 0;
  let atualizados = 0;
  let ignorados = 0;
  const erros: Array<{ linha: number; motivo: string }> = [];

  for (const [indice, linha] of linhas.entries()) {
    const razaoSocial = valor(linha, "razaoSocial");
    const cnpjBruto = valor(linha, "cnpj");
    const cnpj = soDigitos(cnpjBruto);

    if (!razaoSocial && !cnpj) {
      ignorados++;
      continue;
    }
    if (cnpj && cnpj.length === 14 && !validarCnpj(cnpj)) {
      erros.push({ linha: indice + 2, motivo: `CNPJ inválido: ${cnpjBruto}` });
      ignorados++;
      continue;
    }

    const campos = {
      razaoSocial: razaoSocial || `Cliente ${cnpj}`,
      nomeFantasia: valor(linha, "nomeFantasia") || null,
      cnpj: cnpj.length === 14 ? cnpj : null,
      inscricaoEstadual: valor(linha, "inscricaoEstadual") || null,
      email: valor(linha, "email").toLowerCase() || null,
      telefone: soDigitos(valor(linha, "telefone")) || null,
      whatsapp: soDigitos(valor(linha, "telefone")) || null,
      contatoNome: valor(linha, "contatoNome") || null,
      cep: soDigitos(valor(linha, "cep")) || null,
      logradouro: valor(linha, "logradouro") || null,
      numero: valor(linha, "numero") || null,
      complemento: valor(linha, "complemento") || null,
      bairro: valor(linha, "bairro") || null,
      cidade: valor(linha, "cidade") || null,
      uf: valor(linha, "uf").toUpperCase().slice(0, 2) || null,
      observacoes: valor(linha, "observacoes") || null,
      regionId: entrada.regionId || null,
      origem: `Importação · ${job.arquivoNome}`,
    };

    try {
      const existente = campos.cnpj
        ? await prisma.client.findFirst({ where: { userId: user.id, cnpj: campos.cnpj } })
        : await prisma.client.findFirst({
            where: { userId: user.id, razaoSocial: { equals: campos.razaoSocial, mode: "insensitive" } },
          });

      if (existente) {
        if (!entrada.atualizarExistentes) {
          ignorados++;
          continue;
        }
        await prisma.client.update({
          where: { id: existente.id },
          data: Object.fromEntries(
            Object.entries(campos).filter(([, v]) => v !== null && v !== ""),
          ),
        });
        atualizados++;

        if (entrada.representadaId) {
          await prisma.clientRepresentada.upsert({
            where: {
              clientId_representadaId: {
                clientId: existente.id,
                representadaId: entrada.representadaId,
              },
            },
            create: { clientId: existente.id, representadaId: entrada.representadaId },
            update: {},
          });
        }
      } else {
        const novo = await prisma.client.create({
          data: { ...campos, userId: user.id, status: "PROSPECT" },
        });
        importados++;

        if (entrada.representadaId) {
          await prisma.clientRepresentada.create({
            data: { clientId: novo.id, representadaId: entrada.representadaId },
          });
        }
      }
    } catch (erro) {
      erros.push({ linha: indice + 2, motivo: (erro as Error).message.slice(0, 160) });
      ignorados++;
    }
  }

  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      status: erros.length > 0 && importados + atualizados === 0 ? "ERRO" : "CONCLUIDA",
      importados,
      atualizados,
      ignorados,
      erros: erros.slice(0, 60),
      mapeamento: entrada.mapeamento,
      preview: undefined,
      concluidoEm: new Date(),
    },
  });

  revalidatePath("/clientes");
  revalidatePath("/importar");
  return { ok: true, importados, atualizados, ignorados, erros: erros.slice(0, 20) };
}

/** Roda depois da importação para achar as coordenadas em lote. */
export async function geocodificarImportados(limite = 20) {
  const user = await exigirUsuario();

  const pendentes = await prisma.client.findMany({
    where: { userId: user.id, lat: null, OR: [{ cep: { not: null } }, { cidade: { not: null } }] },
    take: limite,
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
    await new Promise((r) => setTimeout(r, 1100));
  }

  revalidatePath("/clientes");
  return { total: pendentes.length, achados };
}

// ==================================================================
// Pedidos por planilha
// ==================================================================

export async function importarPedidos(entrada: {
  jobId: string;
  mapeamento: Record<string, string | null>;
  representadaId: string;
  criarClientesFaltantes: boolean;
}) {
  const user = await exigirUsuario();

  const job = await prisma.importJob.findFirst({ where: { id: entrada.jobId, userId: user.id } });
  if (!job?.preview) return { erro: "Importação expirou. Envie o arquivo de novo." };

  const linhas = job.preview as Array<Record<string, string>>;
  const m = entrada.mapeamento;
  const valor = (linha: Record<string, string>, campo: string) => {
    const coluna = m[campo];
    return coluna ? String(linha[coluna] ?? "").trim() : "";
  };

  // Agrupa por número de pedido: uma linha por item é o formato mais comum.
  const grupos = new Map<string, Array<Record<string, string>>>();
  for (const linha of linhas) {
    const chave = valor(linha, "numero") || valor(linha, "cnpj") || `linha-${grupos.size}`;
    const atual = grupos.get(chave) ?? [];
    atual.push(linha);
    grupos.set(chave, atual);
  }

  let importados = 0;
  let ignorados = 0;
  const erros: Array<{ linha: number; motivo: string }> = [];

  for (const [chave, linhasDoPedido] of grupos) {
    const primeira = linhasDoPedido[0];
    const cnpj = soDigitos(valor(primeira, "cnpj"));
    const nomeCliente = valor(primeira, "cliente");

    let cliente = cnpj
      ? await prisma.client.findFirst({ where: { userId: user.id, cnpj } })
      : nomeCliente
        ? await prisma.client.findFirst({
            where: { userId: user.id, razaoSocial: { contains: nomeCliente, mode: "insensitive" } },
          })
        : null;

    if (!cliente && entrada.criarClientesFaltantes && (cnpj || nomeCliente)) {
      cliente = await prisma.client.create({
        data: {
          userId: user.id,
          razaoSocial: nomeCliente || `Cliente ${cnpj}`,
          cnpj: cnpj.length === 14 ? cnpj : null,
          status: "ATIVO",
          origem: `Importação · ${job.arquivoNome}`,
        },
      });
    }

    if (!cliente) {
      erros.push({ linha: 0, motivo: `Cliente não encontrado para o pedido ${chave}` });
      ignorados++;
      continue;
    }

    const itens = linhasDoPedido
      .map((linha) => {
        const descricao = valor(linha, "produto") || valor(linha, "codigo") || "Item importado";
        const quantidade = valorBR(valor(linha, "quantidade")) || 1;
        const precoUnitario = valorBR(valor(linha, "precoUnitario"));
        const totalLinha = valorBR(valor(linha, "valor"));

        return {
          codigo: valor(linha, "codigo") || null,
          descricao,
          quantidade,
          precoUnitario: precoUnitario > 0 ? precoUnitario : quantidade > 0 ? totalLinha / quantidade : totalLinha,
        };
      })
      .filter((i) => i.precoUnitario > 0);

    if (itens.length === 0) {
      // pedido de uma linha só, sem itens detalhados
      const total = valorBR(valor(primeira, "valor"));
      if (total <= 0) {
        erros.push({ linha: 0, motivo: `Sem valor no pedido ${chave}` });
        ignorados++;
        continue;
      }
      itens.push({ codigo: null, descricao: "Pedido importado", quantidade: 1, precoUnitario: total });
    }

    const resultado = await salvarPedido({
      clientId: cliente.id,
      representadaId: entrada.representadaId,
      data: (dataDoTexto(valor(primeira, "data")) ?? new Date()).toISOString(),
      numeroFornecedor: valor(primeira, "numero") || null,
      origem: "PLANILHA",
      status: "APROVADO",
      condicaoPagamento: valor(primeira, "condicaoPagamento") || cliente.condicaoPagamento,
      itens,
      arquivoNome: job.arquivoNome,
    });

    if ("erro" in resultado && resultado.erro) {
      erros.push({ linha: 0, motivo: resultado.erro });
      ignorados++;
    } else {
      importados++;
    }
  }

  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      status: importados > 0 ? "CONCLUIDA" : "ERRO",
      importados,
      ignorados,
      erros: erros.slice(0, 60),
      mapeamento: entrada.mapeamento,
      preview: undefined,
      concluidoEm: new Date(),
    },
  });

  revalidatePath("/pedidos");
  revalidatePath("/comissoes");
  revalidatePath("/importar");
  return { ok: true, importados, ignorados, erros: erros.slice(0, 20) };
}

// ==================================================================
// Pedido vindo de PDF
// ==================================================================

export async function gravarPedidoDoPdf(entrada: {
  jobId: string;
  clientId: string;
  representadaId: string;
  numeroFornecedor?: string | null;
  data?: string | null;
  condicaoPagamento?: string | null;
  itens: Array<{ codigo: string | null; descricao: string; quantidade: number; precoUnitario: number }>;
}) {
  const user = await exigirUsuario();

  const job = await prisma.importJob.findFirst({ where: { id: entrada.jobId, userId: user.id } });

  const resultado = await salvarPedido({
    clientId: entrada.clientId,
    representadaId: entrada.representadaId,
    data: entrada.data ?? new Date().toISOString(),
    numeroFornecedor: entrada.numeroFornecedor ?? null,
    origem: "PDF",
    status: "APROVADO",
    condicaoPagamento: entrada.condicaoPagamento ?? null,
    itens: entrada.itens.map((i) => ({
      codigo: i.codigo,
      descricao: i.descricao,
      quantidade: num(i.quantidade, 1),
      precoUnitario: num(i.precoUnitario),
    })),
    arquivoNome: job?.arquivoNome ?? null,
  });

  if (job) {
    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: "erro" in resultado && resultado.erro ? "ERRO" : "CONCLUIDA",
        importados: "erro" in resultado && resultado.erro ? 0 : 1,
        preview: undefined,
        concluidoEm: new Date(),
      },
    });
  }

  revalidatePath("/pedidos");
  revalidatePath("/importar");
  return resultado;
}

export async function descartarImportacao(jobId: string) {
  const user = await exigirUsuario();
  await prisma.importJob.deleteMany({ where: { id: jobId, userId: user.id } });
  revalidatePath("/importar");
  return { ok: true };
}
