import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PainelPlanos, PainelProdutos } from "@/app/(app)/representadas/[id]/painel";
import { MedidorMeta } from "@/components/graficos";
import { Icone } from "@/components/icone";
import {
  BotaoLink,
  Canhoto,
  CanhotoTitulo,
  Cifra,
  Etiqueta,
  Secao,
  Tile,
} from "@/components/ui";
import { exigirUsuario } from "@/lib/auth";
import {
  dataBR,
  dinheiro,
  formatarCnpj,
  formatarTelefone,
  linkWhatsapp,
  num,
  percentual,
  rotulo,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const r = await prisma.representada.findUnique({
    where: { id },
    select: { razaoSocial: true, nomeFantasia: true },
  });
  return { title: r?.nomeFantasia ?? r?.razaoSocial ?? "Representada" };
}

export default async function PaginaRepresentada({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await exigirUsuario();

  const representada = await prisma.representada.findFirst({
    where: { id, userId: user.id },
    include: {
      planos: { orderBy: [{ padrao: "desc" }, { createdAt: "desc" }], include: { faixas: { orderBy: { ordem: "asc" } } } },
      produtos: { orderBy: { codigo: "asc" } },
      clientes: { include: { cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true, curva: true } } } },
      _count: { select: { pedidos: true } },
    },
  });

  if (!representada) notFound();

  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const fimMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

  const [vendaMes, vendaTotal, comissoes, ultimosPedidos] = await Promise.all([
    prisma.order.aggregate({
      where: {
        userId: user.id,
        representadaId: id,
        data: { gte: inicioMes, lte: fimMes },
        status: { notIn: ["CANCELADO", "RASCUNHO"] },
      },
      _sum: { valorLiquido: true, comissaoValor: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: { userId: user.id, representadaId: id, status: { notIn: ["CANCELADO", "RASCUNHO"] } },
      _sum: { valorLiquido: true, comissaoValor: true },
    }),
    prisma.commission.groupBy({
      by: ["status"],
      where: { userId: user.id, representadaId: id },
      _sum: { valorPrevisto: true, valorRecebido: true },
      _count: true,
    }),
    prisma.order.findMany({
      where: { userId: user.id, representadaId: id },
      orderBy: { data: "desc" },
      take: 6,
      include: { cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true } } },
    }),
  ]);

  const recebido = comissoes
    .filter((c) => c.status === "RECEBIDA" || c.status === "PARCIAL")
    .reduce((s, c) => s + num(c._sum.valorRecebido), 0);

  const aberto = comissoes
    .filter((c) => ["PREVISTA", "A_RECEBER", "VENCIDA", "PARCIAL"].includes(c.status))
    .reduce((s, c) => s + num(c._sum.valorPrevisto) - num(c._sum.valorRecebido), 0);

  const vencido = comissoes
    .filter((c) => c.status === "VENCIDA")
    .reduce((s, c) => s + num(c._sum.valorPrevisto) - num(c._sum.valorRecebido), 0);

  const wa = linkWhatsapp(
    representada.whatsapp ?? representada.telefone,
    `Olá${representada.contatoNome ? `, ${representada.contatoNome.split(" ")[0]}` : ""}! Aqui é o representante.`,
  );

  return (
    <div className="escala">
      <header className="mb-5">
        <Link href="/representadas" className="text-[12.5px] text-tinta-3 flex items-center gap-1 mb-2">
          <Icone nome="setaEsquerda" tamanho={13} />
          Representadas
        </Link>

        <div className="flex items-start gap-3">
          <span
            className="w-14 h-14 rounded-2xl grid place-items-center shrink-0"
            style={{
              background: `color-mix(in oklab, ${representada.cor} 14%, transparent)`,
              color: representada.cor,
            }}
          >
            <Icone nome="representada" tamanho={26} />
          </span>

          <div className="min-w-0 flex-1">
            <h1 className="text-[24px] sm:text-[29px] tracking-[-0.04em] text-tinta leading-tight">
              {representada.nomeFantasia ?? representada.razaoSocial}
            </h1>
            {representada.nomeFantasia ? (
              <p className="text-[12.5px] text-tinta-3 mt-0.5">{representada.razaoSocial}</p>
            ) : null}

            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <Etiqueta
                tom={
                  representada.status === "ATIVA"
                    ? "quitado"
                    : representada.status === "PROSPECCAO"
                      ? "azul"
                      : "neutro"
                }
              >
                {rotulo(representada.status)}
              </Etiqueta>
              {representada.exclusividade ? (
                <Etiqueta tom="tinta" icone="estrela">
                  exclusiva
                </Etiqueta>
              ) : null}
              {representada.segmento ? (
                <span className="text-[12px] text-tinta-3">{representada.segmento}</span>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto sem-barra mb-4">
        {wa ? (
          <a href={wa} target="_blank" rel="noreferrer" className="botao botao-tinta shrink-0">
            <Icone nome="whatsapp" tamanho={16} />
            WhatsApp
          </a>
        ) : null}
        <BotaoLink
          href={`/pedidos/novo?representada=${representada.id}`}
          variante="papel"
          icone="pedido"
          className="shrink-0"
        >
          Lançar pedido
        </BotaoLink>
        <BotaoLink
          href={`/comissoes?representada=${representada.id}`}
          variante="papel"
          icone="comissao"
          className="shrink-0"
        >
          Comissões
        </BotaoLink>
        <BotaoLink
          href={`/representadas/${representada.id}/editar`}
          variante="papel"
          icone="editar"
          className="shrink-0"
        >
          Editar
        </BotaoLink>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5">
        <Tile
          rotulo="Vendido no mês"
          icone="grafico"
          valor={<Cifra valor={vendaMes._sum.valorLiquido} tamanho="grande" />}
          detalhe={`${vendaMes._count} pedidos`}
        />
        <Tile
          rotulo="Comissão do mês"
          icone="comissao"
          tom="tinta"
          valor={<Cifra valor={vendaMes._sum.comissaoValor} tamanho="grande" />}
          detalhe={
            num(vendaMes._sum.valorLiquido) > 0
              ? `${percentual((num(vendaMes._sum.comissaoValor) / num(vendaMes._sum.valorLiquido)) * 100)} efetivo`
              : "—"
          }
        />
        <Tile
          rotulo="Já recebi"
          icone="cofre"
          tom="quitado"
          valor={<Cifra valor={recebido} tamanho="grande" tom="quitado" />}
          detalhe="Desde o início"
        />
        <Tile
          rotulo="Me deve"
          icone="alerta"
          tom={vencido > 0 ? "carimbo" : aberto > 0 ? "ambar" : "quitado"}
          href={`/comissoes?representada=${representada.id}`}
          valor={<Cifra valor={aberto} tamanho="grande" tom={vencido > 0 ? "carimbo" : "tinta"} />}
          detalhe={vencido > 0 ? `${dinheiro(vencido)} vencido` : "Tudo em dia"}
        />
      </div>

      {num(representada.metaMensal) > 0 ? (
        <Canhoto className="p-4 mb-4">
          <MedidorMeta
            rotulo="Meta do mês"
            valor={num(vendaMes._sum.valorLiquido)}
            meta={num(representada.metaMensal)}
            cor={representada.cor}
          />
        </Canhoto>
      ) : null}

      <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">
        <div className="space-y-5">
          <Secao titulo="Plano de comissão">
            <PainelPlanos
              representadaId={representada.id}
              planos={representada.planos.map((p) => ({
                id: p.id,
                nome: p.nome,
                ativo: p.ativo,
                padrao: p.padrao,
                baseCalculo: p.baseCalculo,
                tipoFaixa: p.tipoFaixa,
                percentualPadrao: String(num(p.percentualPadrao)),
                gatilho: p.gatilho,
                prazoDias: String(p.prazoDias),
                periodicidade: p.periodicidade,
                diaPagamento: p.diaPagamento ? String(p.diaPagamento) : "",
                formaRecebimento: p.formaRecebimento,
                emiteNotaServico: p.emiteNotaServico,
                impostoPercentual: String(num(p.impostoPercentual)),
                descontaDevolucao: p.descontaDevolucao,
                descontaInadimplencia: p.descontaInadimplencia,
                antecipavel: p.antecipavel,
                metaPeriodo: p.metaPeriodo ? String(num(p.metaPeriodo)) : "",
                bonusPercentual: p.bonusPercentual ? String(num(p.bonusPercentual)) : "",
                bonusMeta: p.bonusMeta ? String(num(p.bonusMeta)) : "",
                observacoes: p.observacoes ?? "",
                faixas: p.faixas.map((f) => ({
                  rotulo: f.rotulo ?? "",
                  deValor: String(num(f.deValor)),
                  ateValor: f.ateValor === null ? "" : String(num(f.ateValor)),
                  percentual: String(num(f.percentual)),
                })),
              }))}
            />
          </Secao>

          <Secao titulo="Catálogo">
            <PainelProdutos
              representadaId={representada.id}
              produtos={representada.produtos.map((p) => ({
                id: p.id,
                codigo: p.codigo,
                descricao: p.descricao,
                unidade: p.unidade,
                precoTabela: num(p.precoTabela),
                linha: p.linha,
                comissaoPercentual: p.comissaoPercentual === null ? null : num(p.comissaoPercentual),
              }))}
            />
          </Secao>

          {ultimosPedidos.length > 0 ? (
            <Secao
              titulo="Últimos pedidos"
              acao={
                <Link
                  href={`/pedidos?representada=${representada.id}`}
                  className="text-[12.5px] font-semibold text-caneta"
                >
                  Ver todos
                </Link>
              }
            >
              <div className="space-y-2">
                {ultimosPedidos.map((p) => (
                  <Link key={p.id} href={`/pedidos/${p.id}`} className="block">
                    <Canhoto className="p-3 flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-semibold text-tinta">
                          {p.numero}
                          <span className="text-tinta-3 font-normal">
                            {" "}
                            · {p.cliente.nomeFantasia ?? p.cliente.razaoSocial}
                          </span>
                        </p>
                        <p className="text-[11.5px] text-tinta-3 mt-0.5">
                          {dataBR(p.data)} · {rotulo(p.status)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="cifra text-[13.5px] text-tinta">{dinheiro(p.valorLiquido)}</p>
                        <p className="text-[11px] text-quitado cifra">
                          +{dinheiro(p.comissaoValor)}
                        </p>
                      </div>
                    </Canhoto>
                  </Link>
                ))}
              </div>
            </Secao>
          ) : null}
        </div>

        <div className="space-y-4">
          <Canhoto>
            <CanhotoTitulo titulo="Contato" icone="telefone" />
            <div className="px-4 pb-4 space-y-2.5 text-[12.5px]">
              {[
                { r: "CNPJ", v: representada.cnpj ? formatarCnpj(representada.cnpj) : null, mono: true },
                { r: "Quem te atende", v: representada.contatoNome },
                { r: "Cargo", v: representada.contatoCargo },
                {
                  r: "Telefone",
                  v: representada.telefone ? formatarTelefone(representada.telefone) : null,
                  mono: true,
                },
                { r: "E-mail", v: representada.email },
                { r: "Site", v: representada.site },
                {
                  r: "Endereço",
                  v:
                    [representada.cidade, representada.uf].filter(Boolean).join("/") || null,
                },
                { r: "Território", v: representada.territorio },
                {
                  r: "Contrato",
                  v: representada.contratoInicio ? `desde ${dataBR(representada.contratoInicio)}` : null,
                },
                {
                  r: "Entrega",
                  v: representada.prazoEntregaDias ? `${representada.prazoEntregaDias} dias` : null,
                },
                {
                  r: "Pedido mínimo",
                  v: representada.pedidoMinimo ? dinheiro(representada.pedidoMinimo) : null,
                },
              ]
                .filter((l) => l.v)
                .map((l) => (
                  <div key={l.r}>
                    <p className="text-tinta-3 text-[11px] uppercase tracking-[0.06em]">{l.r}</p>
                    <p className={`text-tinta ${l.mono ? "cifra" : ""}`}>{l.v}</p>
                  </div>
                ))}
            </div>
          </Canhoto>

          {representada.clientes.length > 0 ? (
            <Canhoto>
              <CanhotoTitulo
                titulo="Clientes que compram"
                sub={`${representada.clientes.length} vinculados`}
                icone="clientes"
              />
              <div className="px-4 pb-4 flex flex-wrap gap-1.5">
                {representada.clientes.slice(0, 18).map((cr) => (
                  <Link key={cr.id} href={`/clientes/${cr.clientId}`}>
                    <Etiqueta tom="neutro">
                      {cr.cliente.nomeFantasia ?? cr.cliente.razaoSocial}
                    </Etiqueta>
                  </Link>
                ))}
              </div>
            </Canhoto>
          ) : null}

          {representada.observacoes ? (
            <Canhoto className="p-4 pauta">
              <p className="rotulo mb-2">Anotações</p>
              <p className="text-[13px] text-tinta-2 leading-[28px] whitespace-pre-wrap">
                {representada.observacoes}
              </p>
            </Canhoto>
          ) : null}
        </div>
      </div>
    </div>
  );
}
