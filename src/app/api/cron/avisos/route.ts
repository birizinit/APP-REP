import { NextResponse } from "next/server";

import { filaDeVisita } from "@/lib/analise";
import { statusDaComissao } from "@/lib/comissao";
import { dinheiro, duracao, fimDoDia, inicioDoDia, km, num } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { avisar } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Rotina de avisos. Chame de hora em hora por um cron externo
 * (Railway cron, cron-job.org, GitHub Actions):
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://SEU-APP/api/cron/avisos
 *
 * Cada aviso tem chave unica, entao rodar varias vezes no mesmo dia
 * nao duplica notificacao.
 */
export async function GET(requisicao: Request) {
  const segredo = process.env.CRON_SECRET;
  const autorizacao = requisicao.headers.get("authorization");
  const chaveNaUrl = new URL(requisicao.url).searchParams.get("chave");

  if (segredo && autorizacao !== `Bearer ${segredo}` && chaveNaUrl !== segredo) {
    return NextResponse.json({ erro: "Nao autorizado" }, { status: 401 });
  }

  const agora = new Date();
  const hoje = inicioDoDia(agora);
  const fimDeHoje = fimDoDia(agora);
  const diaTexto = hoje.toISOString().slice(0, 10);

  const usuarios = await prisma.user.findMany({ select: { id: true, nome: true } });
  const relatorio: Record<string, number> = {
    rotas: 0,
    visitas: 0,
    comissoes: 0,
    riscos: 0,
    statusAtualizados: 0,
  };

  for (const user of usuarios) {
    // ---------------------------------------------------------- rota do dia
    const rota = await prisma.route.findFirst({
      where: { userId: user.id, data: { gte: hoje, lte: fimDeHoje } },
      include: { _count: { select: { paradas: true } } },
    });

    if (rota && agora.getHours() >= 6) {
      const enviou = await avisar(user.id, {
        tipo: "ROTA_DO_DIA",
        titulo: "Sua rota de hoje está pronta",
        corpo: `${rota._count.paradas} paradas · ${km(rota.distanciaKm)} · ${dinheiro(rota.custoTotal)} de custo`,
        url: `/rotas/${rota.id}`,
        chaveUnica: `rota-${user.id}-${diaTexto}`,
      });
      if (enviou) relatorio.rotas++;
    }

    // ---------------------------------------------------------- visita próxima
    const emBreve = new Date(agora.getTime() + 35 * 60_000);
    const proximas = await prisma.agendaEvent.findMany({
      where: {
        userId: user.id,
        inicio: { gte: agora, lte: emBreve },
        status: { in: ["PLANEJADO", "CONFIRMADO", "EM_ROTA"] },
        lembreteEnviadoEm: null,
      },
      include: { cliente: { select: { nomeFantasia: true, razaoSocial: true, cidade: true } } },
    });

    for (const visita of proximas) {
      const minutos = Math.round((visita.inicio.getTime() - agora.getTime()) / 60_000);
      const enviou = await avisar(user.id, {
        tipo: "VISITA_PROXIMA",
        titulo: `Em ${minutos} min: ${visita.cliente?.nomeFantasia ?? visita.titulo}`,
        corpo: visita.local ? `${visita.local} · ${visita.titulo}` : visita.titulo,
        url: "/agenda",
        chaveUnica: `visita-${visita.id}`,
      });
      await prisma.agendaEvent.update({
        where: { id: visita.id },
        data: { lembreteEnviadoEm: agora },
      });
      if (enviou) relatorio.visitas++;
    }

    // ---------------------------------------------------------- comissões
    const abertas = await prisma.commission.findMany({
      where: { userId: user.id, status: { in: ["PREVISTA", "A_RECEBER", "VENCIDA", "PARCIAL"] } },
      include: { representada: { select: { nomeFantasia: true, razaoSocial: true } } },
    });

    for (const c of abertas) {
      const novo = statusDaComissao({
        vencimento: c.vencimento,
        valorPrevisto: num(c.valorPrevisto),
        valorRecebido: num(c.valorRecebido),
        status: c.status,
      });

      if (novo !== c.status) {
        await prisma.commission.update({ where: { id: c.id }, data: { status: novo } });
        relatorio.statusAtualizados++;
      }

      const nome = c.representada.nomeFantasia ?? c.representada.razaoSocial;
      const aberto = num(c.valorPrevisto) - num(c.valorRecebido);
      const faltam = Math.ceil((c.vencimento.getTime() - agora.getTime()) / 86_400_000);

      if (novo === "VENCIDA" && !c.lembreteAtraso) {
        const enviou = await avisar(user.id, {
          tipo: "COMISSAO_VENCIDA",
          titulo: `${nome} está atrasada`,
          corpo: `${dinheiro(aberto)} venceu em ${c.vencimento.toLocaleDateString("pt-BR")}. Hora de cobrar.`,
          url: "/comissoes?status=VENCIDA",
          chaveUnica: `comissao-vencida-${c.id}`,
        });
        await prisma.commission.update({ where: { id: c.id }, data: { lembreteAtraso: true } });
        if (enviou) relatorio.comissoes++;
      } else if (faltam >= 0 && faltam <= 3 && !c.lembrete3d) {
        const enviou = await avisar(user.id, {
          tipo: "COMISSAO_A_VENCER",
          titulo:
            faltam === 0 ? `Cai hoje: ${nome}` : `Cai em ${faltam} dia${faltam > 1 ? "s" : ""}: ${nome}`,
          corpo: `${dinheiro(aberto)} · ${c.descricao}`,
          url: "/comissoes",
          chaveUnica: `comissao-3d-${c.id}`,
        });
        await prisma.commission.update({ where: { id: c.id }, data: { lembrete3d: true } });
        if (enviou) relatorio.comissoes++;
      }
    }

    // ---------------------------------------------------------- clientes sumindo
    // uma vez por semana, na segunda de manhã
    if (agora.getDay() === 1 && agora.getHours() >= 7 && agora.getHours() < 12) {
      const clientes = await prisma.client.findMany({
        where: { userId: user.id, status: { notIn: ["PERDIDO", "BLOQUEADO", "PROSPECT"] } },
      });

      const criticos = filaDeVisita(
        clientes.map((c) => ({
          id: c.id,
          razaoSocial: c.razaoSocial,
          nomeFantasia: c.nomeFantasia,
          totalComprado: num(c.totalComprado),
          qtdPedidos: c.qtdPedidos,
          ticketMedio: num(c.ticketMedio),
          ultimoPedidoEm: c.ultimoPedidoEm,
          ultimaVisitaEm: c.ultimaVisitaEm,
          frequenciaVisitaDias: c.frequenciaVisitaDias,
          curva: c.curva,
          status: c.status,
        })),
      ).filter((c) => c.risco.nivel === "critico");

      if (criticos.length > 0) {
        const semana = `${agora.getFullYear()}-${Math.ceil(
          (agora.getTime() - new Date(agora.getFullYear(), 0, 1).getTime()) / 604_800_000,
        )}`;

        const enviou = await avisar(user.id, {
          tipo: "CLIENTE_EM_RISCO",
          titulo: `${criticos.length} clientes estão sumindo`,
          corpo: `Começa por ${criticos[0].nomeFantasia ?? criticos[0].razaoSocial}: ${criticos[0].risco.motivos[0]}`,
          url: "/clientes?ordem=risco",
          chaveUnica: `risco-semana-${user.id}-${semana}`,
        });
        if (enviou) relatorio.riscos++;
      }
    }
  }

  return NextResponse.json({ ok: true, em: agora.toISOString(), ...relatorio });
}
