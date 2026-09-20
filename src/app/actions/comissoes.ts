"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type FormaRecebimento } from "@prisma/client";

import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { statusDaComissao } from "@/lib/comissao";
import { num } from "@/lib/format";
import { avisar } from "@/lib/push";

/** Registra um recebimento (total ou parcial) e recalcula o status. */
export async function darBaixa(dados: FormData) {
  const user = await exigirUsuario();

  const id = String(dados.get("id") ?? "");
  const valor = num(dados.get("valor"));
  const dataTexto = String(dados.get("data") ?? "");
  const forma = (String(dados.get("forma") ?? "PIX") as FormaRecebimento) || "PIX";

  const comissao = await prisma.commission.findFirst({
    where: { id, userId: user.id },
    include: { representada: true },
  });
  if (!comissao) return { erro: "Comissão não encontrada." };
  if (valor <= 0) return { erro: "Informe o valor recebido." };

  const data = dataTexto ? new Date(dataTexto) : new Date();

  await prisma.commissionPayment.create({
    data: {
      commissionId: id,
      valor: new Prisma.Decimal(valor.toFixed(2)),
      data,
      forma,
      comprovanteNome: String(dados.get("comprovanteNome") ?? "") || null,
      observacao: String(dados.get("observacao") ?? "").trim() || null,
    },
  });

  const totalRecebido = num(comissao.valorRecebido) + valor;
  const novoStatus = statusDaComissao({
    vencimento: comissao.vencimento,
    valorPrevisto: num(comissao.valorPrevisto),
    valorRecebido: totalRecebido,
    status: "PREVISTA",
  });

  await prisma.commission.update({
    where: { id },
    data: {
      valorRecebido: new Prisma.Decimal(totalRecebido.toFixed(2)),
      recebidoEm: novoStatus === "RECEBIDA" ? data : comissao.recebidoEm,
      status: novoStatus,
      formaRecebimento: forma,
      notaServicoNumero: String(dados.get("notaServicoNumero") ?? "") || comissao.notaServicoNumero,
    },
  });

  await prisma.activity.create({
    data: {
      userId: user.id,
      representadaId: comissao.representadaId,
      orderId: comissao.orderId,
      tipo: "comissao",
      titulo: novoStatus === "RECEBIDA" ? "Comissão recebida" : "Recebimento parcial",
      descricao: `${comissao.descricao} — ${forma}`,
      meta: { valor, comissaoId: id },
    },
  });

  revalidatePath("/comissoes");
  revalidatePath("/");
  return { ok: true, status: novoStatus };
}

/** Comissão que a representada cortou (devolução, inadimplência, erro). */
export async function glosarComissao(id: string, motivo: string) {
  const user = await exigirUsuario();

  await prisma.commission.updateMany({
    where: { id, userId: user.id },
    data: { status: "GLOSADA", motivoGlosa: motivo.trim() || "Sem motivo informado" },
  });

  revalidatePath("/comissoes");
  revalidatePath("/");
  return { ok: true };
}

export async function reabrirComissao(id: string) {
  const user = await exigirUsuario();

  const comissao = await prisma.commission.findFirst({ where: { id, userId: user.id } });
  if (!comissao) return { erro: "Comissão não encontrada." };

  await prisma.commission.update({
    where: { id },
    data: {
      status: statusDaComissao({
        vencimento: comissao.vencimento,
        valorPrevisto: num(comissao.valorPrevisto),
        valorRecebido: num(comissao.valorRecebido),
        status: "PREVISTA",
      }),
      motivoGlosa: null,
    },
  });

  revalidatePath("/comissoes");
  return { ok: true };
}

/** Cria uma comissão avulsa — bônus, acerto, campanha, prêmio. */
export async function criarComissaoAvulsa(dados: FormData) {
  const user = await exigirUsuario();

  const representadaId = String(dados.get("representadaId") ?? "");
  const descricao = String(dados.get("descricao") ?? "").trim();
  const valor = num(dados.get("valor"));
  const vencimentoTexto = String(dados.get("vencimento") ?? "");

  if (!representadaId) return { erro: "Escolha a representada." };
  if (!descricao) return { erro: "Descreva do que se trata." };
  if (valor <= 0) return { erro: "Informe o valor." };
  if (!vencimentoTexto) return { erro: "Informe o vencimento." };

  const vencimento = new Date(vencimentoTexto);
  const impostoPercentual = num(dados.get("impostoPercentual"));
  const imposto = (valor * impostoPercentual) / 100;

  await prisma.commission.create({
    data: {
      userId: user.id,
      representadaId,
      descricao,
      competencia: `${vencimento.getFullYear()}-${String(vencimento.getMonth() + 1).padStart(2, "0")}`,
      valorPrevisto: new Prisma.Decimal(valor.toFixed(2)),
      valorImposto: new Prisma.Decimal(imposto.toFixed(2)),
      valorLiquido: new Prisma.Decimal((valor - imposto).toFixed(2)),
      vencimento,
      status: statusDaComissao({
        vencimento,
        valorPrevisto: valor,
        valorRecebido: 0,
        status: "PREVISTA",
      }),
      observacoes: String(dados.get("observacoes") ?? "").trim() || null,
    },
  });

  revalidatePath("/comissoes");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Passa a régua em todas as comissões: recalcula status pelo vencimento
 * e avisa o que está vencendo ou já venceu. Roda no cron e no botão.
 */
export async function revisarComissoes(userId?: string) {
  const id = userId ?? (await exigirUsuario()).id;

  const abertas = await prisma.commission.findMany({
    where: { userId: id, status: { in: ["PREVISTA", "A_RECEBER", "VENCIDA", "PARCIAL"] } },
    include: { representada: { select: { nomeFantasia: true, razaoSocial: true } } },
  });

  let atualizadas = 0;
  let avisos = 0;

  for (const c of abertas) {
    const novo = statusDaComissao({
      vencimento: c.vencimento,
      valorPrevisto: num(c.valorPrevisto),
      valorRecebido: num(c.valorRecebido),
      status: c.status,
    });

    if (novo !== c.status) {
      await prisma.commission.update({ where: { id: c.id }, data: { status: novo } });
      atualizadas++;
    }

    const nome = c.representada.nomeFantasia ?? c.representada.razaoSocial;
    const falta = Math.ceil((c.vencimento.getTime() - Date.now()) / 86_400_000);
    const aberto = num(c.valorPrevisto) - num(c.valorRecebido);

    if (novo === "VENCIDA" && !c.lembreteAtraso) {
      const enviou = await avisar(id, {
        tipo: "COMISSAO_VENCIDA",
        titulo: `Comissão vencida — ${nome}`,
        corpo: `${c.descricao}: R$ ${aberto.toFixed(2)} venceu em ${c.vencimento.toLocaleDateString("pt-BR")}.`,
        url: "/comissoes?status=VENCIDA",
        chaveUnica: `comissao-vencida-${c.id}`,
      });
      await prisma.commission.update({ where: { id: c.id }, data: { lembreteAtraso: true } });
      if (enviou) avisos++;
    } else if (novo === "A_RECEBER" && falta <= 3 && falta >= 0 && !c.lembrete3d) {
      const enviou = await avisar(id, {
        tipo: "COMISSAO_A_VENCER",
        titulo: `Cai em ${falta === 0 ? "hoje" : `${falta} dia(s)`} — ${nome}`,
        corpo: `${c.descricao}: R$ ${aberto.toFixed(2)}.`,
        url: "/comissoes",
        chaveUnica: `comissao-3d-${c.id}`,
      });
      await prisma.commission.update({ where: { id: c.id }, data: { lembrete3d: true } });
      if (enviou) avisos++;
    }
  }

  revalidatePath("/comissoes");
  revalidatePath("/");
  return { atualizadas, avisos };
}
