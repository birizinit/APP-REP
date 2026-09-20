import type { Metadata } from "next";
import Link from "next/link";

import { MedidorMeta } from "@/components/graficos";
import { Icone } from "@/components/icone";
import { FabricaVazia } from "@/components/ilustracoes";
import {
  BotaoLink,
  Canhoto,
  Etiqueta,
  LinhaPicotada,
  Secao,
  Tile,
  Vazio,
} from "@/components/ui";
import { rotuloGatilho, rotuloPeriodicidade } from "@/lib/comissao";
import { exigirUsuario } from "@/lib/auth";
import { dinheiro, dinheiroCurto, formatarCnpj, num, percentual, rotulo } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Representadas" };
export const dynamic = "force-dynamic";

export default async function PaginaRepresentadas() {
  const user = await exigirUsuario();

  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const fimMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

  const [representadas, vendaMes, comissaoAberta] = await Promise.all([
    prisma.representada.findMany({
      where: { userId: user.id },
      orderBy: [{ status: "asc" }, { razaoSocial: "asc" }],
      include: {
        planos: { where: { ativo: true }, orderBy: { padrao: "desc" }, take: 1 },
        _count: { select: { clientes: true, pedidos: true, produtos: true } },
      },
    }),
    prisma.order.groupBy({
      by: ["representadaId"],
      where: {
        userId: user.id,
        data: { gte: inicioMes, lte: fimMes },
        status: { notIn: ["CANCELADO", "RASCUNHO"] },
      },
      _sum: { valorLiquido: true, comissaoValor: true },
    }),
    prisma.commission.groupBy({
      by: ["representadaId"],
      where: {
        userId: user.id,
        status: { in: ["PREVISTA", "A_RECEBER", "VENCIDA", "PARCIAL"] },
      },
      _sum: { valorPrevisto: true, valorRecebido: true },
    }),
  ]);

  const mapaVenda = new Map(vendaMes.map((v) => [v.representadaId, v]));
  const mapaAberto = new Map(comissaoAberta.map((c) => [c.representadaId, c]));

  const totalVendido = vendaMes.reduce((s, v) => s + num(v._sum.valorLiquido), 0);
  const totalComissao = vendaMes.reduce((s, v) => s + num(v._sum.comissaoValor), 0);
  const totalAberto = comissaoAberta.reduce(
    (s, c) => s + num(c._sum.valorPrevisto) - num(c._sum.valorRecebido),
    0,
  );
  const ativas = representadas.filter((r) => r.status === "ATIVA").length;

  return (
    <div className="escala">
      <header className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[27px] sm:text-[32px] tracking-[-0.04em] text-tinta">Representadas</h1>
          <p className="text-[13.5px] text-tinta-3 mt-1">
            As indústrias que você representa e o acerto de cada uma.
          </p>
        </div>
        <BotaoLink href="/representadas/nova" variante="tinta" icone="mais">
          Nova
        </BotaoLink>
      </header>

      {representadas.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-6">
          <Tile
            rotulo="Ativas"
            icone="representada"
            valor={<span className="numeral text-[24px] text-tinta">{ativas}</span>}
            detalhe={`de ${representadas.length} cadastradas`}
          />
          <Tile
            rotulo="Vendido no mês"
            icone="grafico"
            valor={<span className="cifra text-[21px] text-tinta">{dinheiroCurto(totalVendido)}</span>}
            detalhe="Somando todas"
          />
          <Tile
            rotulo="Comissão gerada"
            icone="comissao"
            tom="tinta"
            valor={<span className="cifra text-[21px] text-tinta">{dinheiroCurto(totalComissao)}</span>}
            detalhe={
              totalVendido > 0
                ? `média de ${percentual((totalComissao / totalVendido) * 100)}`
                : "—"
            }
          />
          <Tile
            rotulo="Em aberto"
            icone="cofre"
            tom={totalAberto > 0 ? "ambar" : "quitado"}
            href="/comissoes"
            valor={<span className="cifra text-[21px] text-tinta">{dinheiroCurto(totalAberto)}</span>}
            detalhe="Ainda para receber"
          />
        </div>
      ) : null}

      <Secao titulo="Carteira de representadas">
        {representadas.length > 0 ? (
          <div className="grid lg:grid-cols-2 gap-3">
            {representadas.map((r) => {
              const plano = r.planos[0];
              const venda = mapaVenda.get(r.id);
              const aberto = mapaAberto.get(r.id);
              const vendido = num(venda?._sum.valorLiquido);
              const emAberto = num(aberto?._sum.valorPrevisto) - num(aberto?._sum.valorRecebido);

              return (
                <Link key={r.id} href={`/representadas/${r.id}`} className="block">
                  <Canhoto className="overflow-hidden transition-transform active:scale-[0.99]">
                    <div className="h-1" style={{ background: r.cor }} />

                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <span
                          className="w-11 h-11 rounded-xl grid place-items-center shrink-0"
                          style={{
                            background: `color-mix(in oklab, ${r.cor} 14%, transparent)`,
                            color: r.cor,
                          }}
                        >
                          <Icone nome="representada" tamanho={21} />
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="text-[15.5px] font-semibold text-tinta leading-snug truncate">
                            {r.nomeFantasia ?? r.razaoSocial}
                          </p>
                          <p className="text-[11.5px] text-tinta-3 mt-0.5 truncate">
                            {r.segmento ?? (r.cnpj ? formatarCnpj(r.cnpj) : "Sem segmento")}
                          </p>

                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <Etiqueta
                              tom={
                                r.status === "ATIVA"
                                  ? "quitado"
                                  : r.status === "PROSPECCAO"
                                    ? "azul"
                                    : "neutro"
                              }
                            >
                              {rotulo(r.status)}
                            </Etiqueta>
                            {r.exclusividade ? (
                              <Etiqueta tom="tinta" icone="estrela">
                                exclusiva
                              </Etiqueta>
                            ) : null}
                            <span className="text-[11.5px] text-tinta-3">
                              {r._count.clientes} clientes · {r._count.pedidos} pedidos
                            </span>
                          </div>
                        </div>
                      </div>

                      {plano ? (
                        <>
                          <LinhaPicotada rotulo="acerto" />
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-tinta-3">
                                Comissão
                              </p>
                              <p className="cifra text-[15px] text-tinta mt-0.5">
                                {percentual(plano.percentualPadrao)}
                                {plano.tipoFaixa === "PROGRESSIVO" ? "+" : ""}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-tinta-3">
                                Recebe
                              </p>
                              <p className="text-[12px] text-tinta mt-1 leading-tight">
                                {rotuloPeriodicidade[plano.periodicidade]}
                                {plano.diaPagamento ? ` · dia ${plano.diaPagamento}` : ""}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-tinta-3">
                                Gatilho
                              </p>
                              <p className="text-[12px] text-tinta mt-1 leading-tight">
                                {rotuloGatilho[plano.gatilho].replace("No ", "").replace("Na ", "")}
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="mt-3 text-[12.5px] text-ambar bg-ambar-fundo rounded-lg px-3 py-2 flex items-center gap-2">
                          <Icone nome="alerta" tamanho={14} />
                          Sem plano de comissão — os pedidos não vão calcular.
                        </p>
                      )}

                      {num(r.metaMensal) > 0 ? (
                        <div className="mt-4">
                          <MedidorMeta
                            rotulo="Meta do mês"
                            valor={vendido}
                            meta={num(r.metaMensal)}
                            cor={r.cor}
                          />
                        </div>
                      ) : null}

                      {emAberto > 0 ? (
                        <p className="mt-3 text-[12px] text-tinta-3">
                          <span className="cifra text-tinta">{dinheiro(emAberto)}</span> ainda para
                          receber dessa representada.
                        </p>
                      ) : null}
                    </div>
                  </Canhoto>
                </Link>
              );
            })}
          </div>
        ) : (
          <Vazio
            ilustracao={<FabricaVazia />}
            titulo="Nenhuma representada cadastrada"
            descricao="Cadastre as indústrias que você representa e o acerto de comissão de cada uma. É o que faz o pedido calcular sozinho quanto você ganha e quando recebe."
            acao={
              <BotaoLink href="/representadas/nova" variante="tinta" icone="representada">
                Cadastrar a primeira
              </BotaoLink>
            }
          />
        )}
      </Secao>
    </div>
  );
}
