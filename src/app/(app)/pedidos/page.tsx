import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";

import { Icone } from "@/components/icone";
import { TalaoVazio } from "@/components/ilustracoes";
import {
  BotaoLink,
  Canhoto,
  Carimbo,
  Etiqueta,
  Secao,
  Tile,
  Vazio,
  type Tom,
} from "@/components/ui";
import { exigirUsuario } from "@/lib/auth";
import { dataBR, dinheiro, dinheiroCurto, num, percentual, rotulo } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Pedidos" };
export const dynamic = "force-dynamic";

const tomStatus: Record<string, Tom> = {
  RASCUNHO: "neutro",
  ENVIADO: "azul",
  APROVADO: "tinta",
  FATURADO: "amarela",
  ENTREGUE: "quitado",
  CANCELADO: "neutro",
  DEVOLVIDO: "carimbo",
};

export default async function PaginaPedidos({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; representada?: string; cliente?: string }>;
}) {
  const params = await searchParams;
  const user = await exigirUsuario();

  const onde: Prisma.OrderWhereInput = { userId: user.id };
  if (params.status) onde.status = params.status as never;
  if (params.representada) onde.representadaId = params.representada;
  if (params.cliente) onde.clientId = params.cliente;

  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const fimMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

  const [pedidos, representadas, resumoMes, total] = await Promise.all([
    prisma.order.findMany({
      where: onde,
      orderBy: { data: "desc" },
      take: 80,
      include: {
        cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true, curva: true } },
        representada: { select: { id: true, nomeFantasia: true, razaoSocial: true, cor: true } },
        _count: { select: { itens: true } },
      },
    }),
    prisma.representada.findMany({
      where: { userId: user.id },
      select: { id: true, nomeFantasia: true, razaoSocial: true, cor: true },
      orderBy: { razaoSocial: "asc" },
    }),
    prisma.order.aggregate({
      where: {
        userId: user.id,
        data: { gte: inicioMes, lte: fimMes },
        status: { notIn: ["CANCELADO", "RASCUNHO"] },
      },
      _sum: { valorLiquido: true, comissaoValor: true },
      _count: true,
    }),
    prisma.order.count({ where: { userId: user.id } }),
  ]);

  const vendido = num(resumoMes._sum.valorLiquido);
  const comissao = num(resumoMes._sum.comissaoValor);

  return (
    <div className="escala">
      <header className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[27px] sm:text-[32px] tracking-[-0.04em] text-tinta">Pedidos</h1>
          <p className="text-[13.5px] text-tinta-3 mt-1">
            Lançamento manual, por planilha ou lendo o PDF da fábrica.
          </p>
        </div>
        <BotaoLink href="/pedidos/novo" variante="tinta" icone="mais">
          Lançar
        </BotaoLink>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5">
        <Tile
          rotulo="Vendido no mês"
          icone="grafico"
          valor={<span className="cifra text-[21px] text-tinta">{dinheiroCurto(vendido)}</span>}
          detalhe={`${resumoMes._count} pedidos`}
        />
        <Tile
          rotulo="Comissão gerada"
          icone="comissao"
          tom="tinta"
          valor={<span className="cifra text-[21px] text-tinta">{dinheiroCurto(comissao)}</span>}
          detalhe={vendido > 0 ? `${percentual((comissao / vendido) * 100)} médio` : "—"}
        />
        <Tile
          rotulo="Ticket médio"
          icone="pedido"
          valor={
            <span className="cifra text-[21px] text-tinta">
              {dinheiroCurto(resumoMes._count > 0 ? vendido / resumoMes._count : 0)}
            </span>
          }
          detalhe="No mês"
        />
        <Tile
          rotulo="Histórico"
          icone="historico"
          valor={<span className="numeral text-[24px] text-tinta">{total}</span>}
          detalhe="Pedidos lançados"
        />
      </div>

      {/* filtros */}
      <div className="flex gap-1.5 overflow-x-auto sem-barra mb-4 pb-0.5">
        <Link
          href="/pedidos"
          className={`etiqueta shrink-0 ${
            !params.status && !params.representada
              ? "bg-caneta text-white border-caneta"
              : "border-papel-borda text-tinta-3"
          }`}
        >
          Todos
        </Link>
        {["ENVIADO", "APROVADO", "FATURADO", "ENTREGUE"].map((s) => (
          <Link
            key={s}
            href={`/pedidos?status=${s}`}
            className={`etiqueta shrink-0 ${
              params.status === s ? "bg-caneta text-white border-caneta" : "border-papel-borda text-tinta-3"
            }`}
          >
            {rotulo(s)}
          </Link>
        ))}
        {representadas.map((r) => (
          <Link
            key={r.id}
            href={`/pedidos?representada=${r.id}`}
            className={`etiqueta shrink-0 ${
              params.representada === r.id ? "text-white border-transparent" : "border-papel-borda text-tinta-3"
            }`}
            style={params.representada === r.id ? { background: r.cor } : undefined}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: params.representada === r.id ? "#fff" : r.cor }}
            />
            {r.nomeFantasia ?? r.razaoSocial}
          </Link>
        ))}
      </div>

      <Secao titulo={`${pedidos.length} ${pedidos.length === 1 ? "pedido" : "pedidos"}`}>
        {pedidos.length > 0 ? (
          <div className="space-y-2.5">
            {pedidos.map((p) => (
              <Link key={p.id} href={`/pedidos/${p.id}`} className="block">
                <Canhoto className="relative overflow-hidden transition-transform active:scale-[0.99]">
                  {p.status === "CANCELADO" ? (
                    <span className="absolute right-3 top-7 pointer-events-none">
                      <Carimbo tom="neutro">cancelado</Carimbo>
                    </span>
                  ) : null}

                  <div className="flex">
                    <span className="w-1 shrink-0" style={{ background: p.representada.cor }} />

                    <div className="flex-1 min-w-0 p-3.5">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="cifra text-[13px] font-medium text-caneta">
                              {p.numero}
                            </span>
                            <span className="text-[11.5px] text-tinta-3">{dataBR(p.data)}</span>
                          </div>
                          <p className="text-[14.5px] font-semibold text-tinta leading-snug truncate mt-0.5">
                            {p.cliente.nomeFantasia ?? p.cliente.razaoSocial}
                          </p>
                          <p className="text-[11.5px] text-tinta-3 truncate">
                            {p.representada.nomeFantasia ?? p.representada.razaoSocial} ·{" "}
                            {p._count.itens} itens
                            {p.condicaoPagamento ? ` · ${p.condicaoPagamento}` : ""}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="cifra text-[16px] text-tinta font-medium">
                            {dinheiro(p.valorLiquido)}
                          </p>
                          <p className="cifra text-[12px] text-quitado">
                            +{dinheiro(p.comissaoValor)}
                          </p>
                          <p className="text-[10.5px] text-tinta-3">
                            {percentual(p.comissaoPercentual)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        <Etiqueta tom={tomStatus[p.status] ?? "neutro"}>{rotulo(p.status)}</Etiqueta>
                        {p.notaFiscalNumero ? (
                          <Etiqueta tom="neutro" icone="nota">
                            NF {p.notaFiscalNumero}
                          </Etiqueta>
                        ) : null}
                        {p.origem !== "MANUAL" ? (
                          <Etiqueta
                            tom="neutro"
                            icone={p.origem === "PDF" ? "pdf" : "planilha"}
                          >
                            {p.origem === "PDF" ? "do PDF" : "da planilha"}
                          </Etiqueta>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Canhoto>
              </Link>
            ))}
          </div>
        ) : total === 0 ? (
          <Vazio
            ilustracao={<TalaoVazio />}
            titulo="Nenhum pedido lançado"
            descricao="Lance o primeiro e o sistema já calcula a comissão, quebra em parcelas e avisa quando cada uma vencer."
            acao={
              <div className="flex flex-wrap gap-2 justify-center">
                <BotaoLink href="/pedidos/novo" variante="tinta" icone="pedido">
                  Lançar pedido
                </BotaoLink>
                <BotaoLink href="/importar" variante="papel" icone="pdf">
                  Ler PDF da fábrica
                </BotaoLink>
              </div>
            }
          />
        ) : (
          <Vazio
            titulo="Nada com esse filtro"
            acao={
              <BotaoLink href="/pedidos" variante="papel">
                Ver todos
              </BotaoLink>
            }
          />
        )}
      </Secao>
    </div>
  );
}
