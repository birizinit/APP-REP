import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";

import { ListaComissoes } from "@/app/(app)/comissoes/lista";
import { BarrasFluxo } from "@/components/graficos";
import { Icone } from "@/components/icone";
import { Canhoto, CanhotoTitulo, Cifra, Secao, Tile } from "@/components/ui";
import { fluxoDeCaixa } from "@/lib/analise";
import { exigirUsuario } from "@/lib/auth";
import { dinheiro, num, plain, somaDias } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Comissões" };
export const dynamic = "force-dynamic";

export default async function PaginaComissoes({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    representada?: string;
    competencia?: string;
    pedido?: string;
    baixa?: string;
  }>;
}) {
  const params = await searchParams;
  const user = await exigirUsuario();

  const onde: Prisma.CommissionWhereInput = { userId: user.id };
  if (params.status) onde.status = params.status as never;
  if (params.representada) onde.representadaId = params.representada;
  if (params.competencia) onde.competencia = params.competencia;
  if (params.pedido) onde.orderId = params.pedido;

  const [comissoes, todas, representadas] = await Promise.all([
    prisma.commission.findMany({
      where: onde,
      orderBy: [{ status: "asc" }, { vencimento: "asc" }],
      take: 200,
      include: {
        representada: { select: { nomeFantasia: true, razaoSocial: true, cor: true } },
        pedido: { select: { id: true, numero: true } },
      },
    }),
    prisma.commission.findMany({
      where: { userId: user.id, status: { not: "CANCELADA" } },
      select: {
        competencia: true,
        valorPrevisto: true,
        valorRecebido: true,
        status: true,
        vencimento: true,
      },
    }),
    prisma.representada.findMany({
      where: { userId: user.id },
      select: { id: true, nomeFantasia: true, razaoSocial: true, cor: true },
      orderBy: { razaoSocial: "asc" },
    }),
  ]);

  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);

  const vencido = todas
    .filter((c) => c.status === "VENCIDA")
    .reduce((s, c) => s + num(c.valorPrevisto) - num(c.valorRecebido), 0);

  const proximos7 = todas
    .filter(
      (c) =>
        ["A_RECEBER", "PREVISTA", "PARCIAL"].includes(c.status) &&
        c.vencimento >= agora &&
        c.vencimento <= somaDias(agora, 7),
    )
    .reduce((s, c) => s + num(c.valorPrevisto) - num(c.valorRecebido), 0);

  const recebidoMes = todas
    .filter((c) => c.status === "RECEBIDA" || c.status === "PARCIAL")
    .filter((c) => c.vencimento >= inicioMes && c.vencimento <= fimMes)
    .reduce((s, c) => s + num(c.valorRecebido), 0);

  const abertoTotal = todas
    .filter((c) => ["PREVISTA", "A_RECEBER", "VENCIDA", "PARCIAL"].includes(c.status))
    .reduce((s, c) => s + num(c.valorPrevisto) - num(c.valorRecebido), 0);

  const fluxo = fluxoDeCaixa(
    todas.map((c) => ({
      competencia: c.competencia,
      valorPrevisto: num(c.valorPrevisto),
      valorRecebido: num(c.valorRecebido),
      status: c.status,
    })),
    6,
  );

  return (
    <div className="escala">
      <header className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[27px] sm:text-[32px] tracking-[-0.04em] text-tinta">Comissões</h1>
          <p className="text-[13.5px] text-tinta-3 mt-1">
            O que cada representada te deve e quando cai.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5">
        <Tile
          rotulo="Vencido"
          icone="alerta"
          tom={vencido > 0 ? "carimbo" : "quitado"}
          href="/comissoes?status=VENCIDA"
          valor={<Cifra valor={vencido} tamanho="grande" tom={vencido > 0 ? "carimbo" : "quitado"} />}
          detalhe={vencido > 0 ? "Hora de cobrar" : "Nada atrasado"}
        />
        <Tile
          rotulo="Cai em 7 dias"
          icone="relogio"
          tom="ambar"
          valor={<Cifra valor={proximos7} tamanho="grande" />}
          detalhe="Próximos vencimentos"
        />
        <Tile
          rotulo="Recebido no mês"
          icone="cofre"
          tom="quitado"
          href="/comissoes?status=RECEBIDA"
          valor={<Cifra valor={recebidoMes} tamanho="grande" tom="quitado" />}
          detalhe="Já na conta"
        />
        <Tile
          rotulo="Total em aberto"
          icone="comissao"
          tom="tinta"
          valor={<Cifra valor={abertoTotal} tamanho="grande" />}
          detalhe="Somando tudo"
        />
      </div>

      <Canhoto className="mb-5">
        <CanhotoTitulo
          titulo="Previsão de caixa"
          sub="Quanto entra por mês, contando o que já venceu"
          icone="grafico"
        />
        <div className="px-4 pb-4">
          <BarrasFluxo dados={fluxo} />
        </div>
      </Canhoto>

      <Secao titulo={`${comissoes.length} lançamentos`}>
        <ListaComissoes
          comissoes={plain(
            comissoes.map((c) => ({
              id: c.id,
              descricao: c.descricao,
              competencia: c.competencia,
              vencimento: c.vencimento.toISOString(),
              valorPrevisto: num(c.valorPrevisto),
              valorRecebido: num(c.valorRecebido),
              valorLiquido: num(c.valorLiquido),
              status: c.status,
              parcela: c.parcela,
              totalParcelas: c.totalParcelas,
              representada: c.representada,
              pedido: c.pedido,
            })),
          )}
          representadas={representadas.map((r) => ({
            id: r.id,
            nome: r.nomeFantasia ?? r.razaoSocial,
            cor: r.cor,
          }))}
          filtros={{
            status: params.status ?? "",
            representada: params.representada ?? "",
          }}
          abrirBaixa={params.baixa === "1"}
        />
      </Secao>
    </div>
  );
}
