import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AcoesPedido } from "@/app/(app)/pedidos/[id]/acoes";
import { Icone } from "@/components/icone";
import {
  Canhoto,
  CanhotoTitulo,
  Carimbo,
  Etiqueta,
  LinhaPicotada,
  SeloCurva,
  type Tom,
} from "@/components/ui";
import { rotuloBase, rotuloGatilho } from "@/lib/comissao";
import { exigirUsuario } from "@/lib/auth";
import {
  dataBR,
  dinheiro,
  num,
  numeroBR,
  paraInputData,
  percentual,
  rotulo,
  tempoRelativo,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = await prisma.order.findUnique({ where: { id }, select: { numero: true } });
  return { title: p?.numero ?? "Pedido" };
}

export default async function PaginaPedido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await exigirUsuario();

  const pedido = await prisma.order.findFirst({
    where: { id, userId: user.id },
    include: {
      cliente: true,
      representada: true,
      plano: { include: { faixas: true } },
      itens: { orderBy: { ordem: "asc" } },
      comissoes: { orderBy: { parcela: "asc" } },
    },
  });

  if (!pedido) notFound();

  const recebido = pedido.comissoes.reduce((s, c) => s + num(c.valorRecebido), 0);
  const totalComissao = pedido.comissoes.reduce((s, c) => s + num(c.valorPrevisto), 0);
  const quitado = totalComissao > 0 && recebido >= totalComissao - 0.01;

  return (
    <div className="escala">
      <header className="mb-5">
        <Link href="/pedidos" className="text-[12.5px] text-tinta-3 flex items-center gap-1 mb-2">
          <Icone nome="setaEsquerda" tamanho={13} />
          Pedidos
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-[26px] sm:text-[31px] tracking-[-0.04em] text-tinta">
                {pedido.numero}
              </h1>
              {pedido.numeroFornecedor ? (
                <span className="cifra text-[13px] text-tinta-3">
                  fábrica {pedido.numeroFornecedor}
                </span>
              ) : null}
            </div>
            <p className="text-[13.5px] text-tinta-2 mt-1">
              {dataBR(pedido.data)} · {tempoRelativo(pedido.data)}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <Etiqueta tom={tomStatus[pedido.status] ?? "neutro"}>{rotulo(pedido.status)}</Etiqueta>
              {pedido.origem !== "MANUAL" ? (
                <Etiqueta tom="neutro" icone={pedido.origem === "PDF" ? "pdf" : "planilha"}>
                  importado
                </Etiqueta>
              ) : null}
              {pedido.comissaoManual ? (
                <Etiqueta tom="ambar" icone="editar">
                  comissão manual
                </Etiqueta>
              ) : null}
            </div>
          </div>

          {quitado ? (
            <span className="shrink-0">
              <Carimbo tom="quitado" grande>
                pago
              </Carimbo>
            </span>
          ) : null}
        </div>
      </header>

      <div className="grid lg:grid-cols-[1fr_350px] gap-4 items-start">
        <div className="space-y-4">
          {/* partes */}
          <div className="grid sm:grid-cols-2 gap-3">
            <Link href={`/clientes/${pedido.cliente.id}`}>
              <Canhoto className="p-3.5 h-full transition-transform active:scale-[0.99]">
                <p className="rotulo mb-1.5">Cliente</p>
                <div className="flex items-center gap-2.5">
                  <SeloCurva curva={pedido.cliente.curva} tamanho={22} />
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-tinta truncate">
                      {pedido.cliente.nomeFantasia ?? pedido.cliente.razaoSocial}
                    </p>
                    <p className="text-[11.5px] text-tinta-3 truncate">
                      {pedido.cliente.cidade ? `${pedido.cliente.cidade}/${pedido.cliente.uf}` : "—"}
                    </p>
                  </div>
                </div>
              </Canhoto>
            </Link>

            <Link href={`/representadas/${pedido.representada.id}`}>
              <Canhoto className="p-3.5 h-full transition-transform active:scale-[0.99]">
                <p className="rotulo mb-1.5">Representada</p>
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-[22px] h-[22px] rounded-md grid place-items-center shrink-0"
                    style={{
                      background: `color-mix(in oklab, ${pedido.representada.cor} 16%, transparent)`,
                      color: pedido.representada.cor,
                    }}
                  >
                    <Icone nome="representada" tamanho={13} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-tinta truncate">
                      {pedido.representada.nomeFantasia ?? pedido.representada.razaoSocial}
                    </p>
                    <p className="text-[11.5px] text-tinta-3 truncate">
                      {pedido.plano?.nome ?? "Sem plano"}
                    </p>
                  </div>
                </div>
              </Canhoto>
            </Link>
          </div>

          {/* itens */}
          <Canhoto>
            <CanhotoTitulo titulo="Itens" sub={`${pedido.itens.length} linhas`} icone="planilha" />
            <div className="overflow-x-auto sem-barra">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="text-tinta-3 text-left border-y border-papel-borda">
                    <th className="font-semibold py-2 px-4">Item</th>
                    <th className="font-semibold py-2 px-2 text-right">Qtd</th>
                    <th className="font-semibold py-2 px-2 text-right">Preço</th>
                    <th className="font-semibold py-2 px-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {pedido.itens.map((i) => (
                    <tr key={i.id} className="border-b border-papel-borda last:border-0">
                      <td className="py-2.5 px-4">
                        <p className="text-tinta leading-snug">{i.descricao}</p>
                        {i.codigo ? (
                          <p className="cifra text-[11px] text-tinta-3">{i.codigo}</p>
                        ) : null}
                      </td>
                      <td className="py-2.5 px-2 text-right cifra text-tinta-2 whitespace-nowrap">
                        {numeroBR(i.quantidade, 0)} {i.unidade}
                      </td>
                      <td className="py-2.5 px-2 text-right cifra text-tinta-2 whitespace-nowrap">
                        {dinheiro(i.precoUnitario)}
                        {num(i.descontoPercentual) > 0 ? (
                          <span className="block text-[10.5px] text-carimbo">
                            −{percentual(i.descontoPercentual)}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2.5 px-4 text-right cifra text-tinta whitespace-nowrap">
                        {dinheiro(i.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-papel-borda">
              <div className="space-y-1.5 text-[13px] max-w-[320px] ml-auto">
                <div className="flex items-baseline gap-2">
                  <span className="text-tinta-2">Subtotal</span>
                  <span className="flex-1 border-b border-dotted border-papel-borda translate-y-[-3px]" />
                  <span className="cifra text-tinta">{dinheiro(pedido.valorBruto)}</span>
                </div>
                {num(pedido.descontoValor) > 0 ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-tinta-2">
                      Desconto {percentual(pedido.descontoPercentual)}
                    </span>
                    <span className="flex-1 border-b border-dotted border-papel-borda translate-y-[-3px]" />
                    <span className="cifra text-carimbo">−{dinheiro(pedido.descontoValor)}</span>
                  </div>
                ) : null}
                {num(pedido.valorFrete) > 0 ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-tinta-2">Frete ({pedido.tipoFrete})</span>
                    <span className="flex-1 border-b border-dotted border-papel-borda translate-y-[-3px]" />
                    <span className="cifra text-tinta">{dinheiro(pedido.valorFrete)}</span>
                  </div>
                ) : null}

                <LinhaPicotada />

                <div className="flex items-baseline gap-2">
                  <span className="text-tinta font-semibold">Total</span>
                  <span className="flex-1 border-b border-dotted border-papel-borda translate-y-[-3px]" />
                  <span className="cifra text-[19px] text-tinta font-medium">
                    {dinheiro(pedido.valorLiquido)}
                  </span>
                </div>
              </div>
            </div>
          </Canhoto>

          {pedido.observacoes ? (
            <Canhoto className="p-4 pauta">
              <p className="rotulo mb-2">Observações</p>
              <p className="text-[13px] text-tinta-2 leading-[28px] whitespace-pre-wrap">
                {pedido.observacoes}
              </p>
            </Canhoto>
          ) : null}
        </div>

        {/* ---------------- lateral ---------------- */}
        <div className="space-y-4">
          <AcoesPedido
            id={pedido.id}
            status={pedido.status}
            notaFiscal={{
              numero: pedido.notaFiscalNumero ?? "",
              serie: pedido.notaFiscalSerie ?? "",
              data: pedido.notaFiscalData ? paraInputData(pedido.notaFiscalData) : "",
              chave: pedido.notaFiscalChave ?? "",
              valor: pedido.notaFiscalValor ? String(num(pedido.notaFiscalValor)) : "",
            }}
          />

          <Canhoto picotado className="p-4">
            <p className="rotulo mb-1">Sua comissão</p>
            <p className="cifra text-[28px] text-quitado font-medium leading-none">
              {dinheiro(pedido.comissaoValor)}
            </p>
            <p className="text-[11.5px] text-tinta-3 mt-1.5">
              {percentual(pedido.comissaoPercentual)} sobre {dinheiro(pedido.comissaoBase)}
              {pedido.plano ? ` · ${rotuloBase[pedido.plano.baseCalculo].toLowerCase()}` : ""}
            </p>

            {pedido.plano ? (
              <p className="text-[11.5px] text-tinta-3 mt-1">
                {rotuloGatilho[pedido.plano.gatilho]}
                {pedido.plano.prazoDias ? ` + ${pedido.plano.prazoDias} dias` : ""}
              </p>
            ) : null}

            {pedido.comissoes.length > 0 ? (
              <>
                <LinhaPicotada rotulo="parcelas" />
                <ul className="space-y-2">
                  {pedido.comissoes.map((c) => {
                    const pago = c.status === "RECEBIDA";
                    const vencida = c.status === "VENCIDA";
                    return (
                      <li key={c.id} className="flex items-baseline gap-2 text-[12.5px]">
                        <span
                          className={
                            pago
                              ? "text-quitado"
                              : vencida
                                ? "text-carimbo font-semibold"
                                : "text-tinta-2"
                          }
                        >
                          {c.totalParcelas > 1 ? `${c.parcela}/${c.totalParcelas}` : "Única"}
                        </span>
                        <span className="flex-1 border-b border-dotted border-papel-borda translate-y-[-3px]" />
                        <span className="text-tinta-3">{dataBR(c.vencimento)}</span>
                        <span
                          className={`cifra w-[80px] text-right ${
                            pago ? "text-quitado" : vencida ? "text-carimbo" : "text-tinta"
                          }`}
                        >
                          {dinheiro(c.valorPrevisto)}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[12px] text-tinta-3">
                    {dinheiro(recebido)} de {dinheiro(totalComissao)} recebido
                  </span>
                  <Link
                    href={`/comissoes?pedido=${pedido.id}`}
                    className="text-[12.5px] font-semibold text-caneta"
                  >
                    Ver
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-[12.5px] text-tinta-3 mt-3">
                Sem parcelas geradas — confira se a representada tem plano ativo.
              </p>
            )}
          </Canhoto>

          {pedido.notaFiscalNumero ? (
            <Canhoto>
              <CanhotoTitulo titulo="Nota fiscal" icone="nota" />
              <div className="px-4 pb-4 space-y-2 text-[12.5px]">
                {[
                  { r: "Número", v: `${pedido.notaFiscalNumero}${pedido.notaFiscalSerie ? ` / ${pedido.notaFiscalSerie}` : ""}` },
                  { r: "Emissão", v: pedido.notaFiscalData ? dataBR(pedido.notaFiscalData) : null },
                  { r: "Valor", v: pedido.notaFiscalValor ? dinheiro(pedido.notaFiscalValor) : null },
                  { r: "Chave", v: pedido.notaFiscalChave },
                ]
                  .filter((l) => l.v)
                  .map((l) => (
                    <div key={l.r}>
                      <p className="text-tinta-3 text-[11px] uppercase tracking-[0.06em]">{l.r}</p>
                      <p className="text-tinta cifra break-all">{l.v}</p>
                    </div>
                  ))}
              </div>
            </Canhoto>
          ) : null}
        </div>
      </div>
    </div>
  );
}
