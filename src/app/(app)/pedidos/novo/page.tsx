import type { Metadata } from "next";
import Link from "next/link";

import { FormPedido } from "@/app/(app)/pedidos/form";
import { Icone } from "@/components/icone";
import { BotaoLink, Vazio } from "@/components/ui";
import { FabricaVazia } from "@/components/ilustracoes";
import { exigirUsuario } from "@/lib/auth";
import { num, paraInputData } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Novo pedido" };
export const dynamic = "force-dynamic";

export default async function NovoPedido({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; representada?: string }>;
}) {
  const params = await searchParams;
  const user = await exigirUsuario();

  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const fimMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

  const [clientes, representadas, acumulados] = await Promise.all([
    prisma.client.findMany({
      where: { userId: user.id, status: { notIn: ["PERDIDO", "BLOQUEADO"] } },
      orderBy: { razaoSocial: "asc" },
      include: { representadas: { select: { representadaId: true } } },
    }),
    prisma.representada.findMany({
      where: { userId: user.id, status: { in: ["ATIVA", "PROSPECCAO"] } },
      orderBy: { razaoSocial: "asc" },
      include: {
        planos: {
          where: { ativo: true },
          orderBy: [{ padrao: "desc" }, { createdAt: "desc" }],
          include: { faixas: { orderBy: { ordem: "asc" } } },
        },
        produtos: { where: { ativo: true }, orderBy: { codigo: "asc" } },
      },
    }),
    prisma.order.groupBy({
      by: ["representadaId"],
      where: {
        userId: user.id,
        data: { gte: inicioMes, lte: fimMes },
        status: { notIn: ["CANCELADO", "RASCUNHO"] },
      },
      _sum: { valorLiquido: true },
    }),
  ]);

  if (representadas.length === 0) {
    return (
      <div>
        <header className="mb-5">
          <Link href="/pedidos" className="text-[12.5px] text-tinta-3 flex items-center gap-1 mb-1.5">
            <Icone nome="setaEsquerda" tamanho={13} />
            Pedidos
          </Link>
          <h1 className="text-[27px] sm:text-[32px] tracking-[-0.04em] text-tinta">Novo pedido</h1>
        </header>

        <Vazio
          ilustracao={<FabricaVazia />}
          titulo="Cadastre uma representada primeiro"
          descricao="O pedido precisa saber de qual indústria é para calcular a comissão e a data em que ela cai."
          acao={
            <BotaoLink href="/representadas/nova" variante="tinta" icone="representada">
              Cadastrar representada
            </BotaoLink>
          }
        />
      </div>
    );
  }

  const mapaAcumulado = Object.fromEntries(
    acumulados.map((a) => [a.representadaId, num(a._sum.valorLiquido)]),
  );

  return (
    <div>
      <header className="mb-5">
        <Link href="/pedidos" className="text-[12.5px] text-tinta-3 flex items-center gap-1 mb-1.5">
          <Icone nome="setaEsquerda" tamanho={13} />
          Pedidos
        </Link>
        <h1 className="text-[27px] sm:text-[32px] tracking-[-0.04em] text-tinta">Novo pedido</h1>
        <p className="text-[13.5px] text-tinta-3 mt-1">
          A comissão aparece enquanto você digita.
        </p>
      </header>

      <FormPedido
        dataPadrao={paraInputData(new Date())}
        clientePre={params.cliente ?? null}
        representadaPre={params.representada ?? null}
        acumulados={mapaAcumulado}
        clientes={clientes.map((c) => ({
          id: c.id,
          nome: c.nomeFantasia ?? c.razaoSocial,
          razaoSocial: c.razaoSocial,
          cidade: c.cidade,
          uf: c.uf,
          curva: c.curva,
          condicaoPagamento: c.condicaoPagamento,
          representadas: c.representadas.map((r) => r.representadaId),
        }))}
        representadas={representadas.map((r) => ({
          id: r.id,
          nome: r.nomeFantasia ?? r.razaoSocial,
          cor: r.cor,
          pedidoMinimo: r.pedidoMinimo ? num(r.pedidoMinimo) : null,
          produtos: r.produtos.map((p) => ({
            id: p.id,
            codigo: p.codigo,
            descricao: p.descricao,
            unidade: p.unidade,
            precoTabela: num(p.precoTabela),
            linha: p.linha,
            comissaoPercentual: p.comissaoPercentual === null ? null : num(p.comissaoPercentual),
          })),
          plano: r.planos[0]
            ? {
                nome: r.planos[0].nome,
                baseCalculo: r.planos[0].baseCalculo,
                tipoFaixa: r.planos[0].tipoFaixa,
                percentualPadrao: num(r.planos[0].percentualPadrao),
                gatilho: r.planos[0].gatilho,
                prazoDias: r.planos[0].prazoDias,
                periodicidade: r.planos[0].periodicidade,
                diaPagamento: r.planos[0].diaPagamento,
                impostoPercentual: num(r.planos[0].impostoPercentual),
                metaPeriodo: r.planos[0].metaPeriodo ? num(r.planos[0].metaPeriodo) : null,
                bonusPercentual: r.planos[0].bonusPercentual ? num(r.planos[0].bonusPercentual) : null,
                bonusMeta: r.planos[0].bonusMeta ? num(r.planos[0].bonusMeta) : null,
                faixas: r.planos[0].faixas.map((f) => ({
                  deValor: num(f.deValor),
                  ateValor: f.ateValor === null ? null : num(f.ateValor),
                  percentual: num(f.percentual),
                  rotulo: f.rotulo,
                })),
              }
            : null,
        }))}
      />
    </div>
  );
}
