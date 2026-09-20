import type { Metadata } from "next";

import { FerramentasCarteira, FiltrosClientes } from "@/app/(app)/clientes/filtros";
import { CartaoCliente } from "@/components/cartoes";
import { BuscaVazia, TalaoVazio } from "@/components/ilustracoes";
import { BotaoLink, Secao, Tile, Vazio } from "@/components/ui";
import { avaliarRisco, filaDeVisita } from "@/lib/analise";
import { exigirUsuario } from "@/lib/auth";
import { dinheiro, dinheiroCurto, num } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Clientes" };
export const dynamic = "force-dynamic";

export default async function PaginaClientes({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    curva?: string;
    regiao?: string;
    ordem?: string;
    busca?: string;
  }>;
}) {
  const params = await searchParams;
  const user = await exigirUsuario();

  const onde: Prisma.ClientWhereInput = { userId: user.id };

  if (params.q) {
    onde.OR = [
      { razaoSocial: { contains: params.q, mode: "insensitive" } },
      { nomeFantasia: { contains: params.q, mode: "insensitive" } },
      { cidade: { contains: params.q, mode: "insensitive" } },
      { cnpj: { contains: params.q.replace(/\D/g, "") } },
      { contatoNome: { contains: params.q, mode: "insensitive" } },
    ];
  }
  if (params.status) onde.status = params.status as never;
  if (params.curva) onde.curva = params.curva as never;
  if (params.regiao) onde.regionId = params.regiao;

  const ordenacao: Prisma.ClientOrderByWithRelationInput =
    params.ordem === "valor"
      ? { totalComprado: "desc" }
      : params.ordem === "recente"
        ? { ultimoPedidoEm: "desc" }
        : params.ordem === "visita"
          ? { ultimaVisitaEm: "asc" }
          : { razaoSocial: "asc" };

  const [clientes, regioes, totais, semCoordenada] = await Promise.all([
    prisma.client.findMany({
      where: onde,
      orderBy: ordenacao,
      include: { regiao: { select: { id: true, nome: true, cor: true } } },
      take: 300,
    }),
    prisma.region.findMany({
      where: { userId: user.id },
      orderBy: { nome: "asc" },
      include: { _count: { select: { clientes: true } } },
    }),
    prisma.client.groupBy({
      by: ["status"],
      where: { userId: user.id },
      _count: true,
      _sum: { totalComprado: true },
    }),
    prisma.client.count({ where: { userId: user.id, OR: [{ lat: null }, { lng: null }] } }),
  ]);

  const paraAnalise = clientes.map((c) => ({
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
    regionId: c.regionId,
  }));

  const riscos = new Map(paraAnalise.map((c) => [c.id, avaliarRisco(c as never)]));

  const listados =
    params.ordem === "risco"
      ? filaDeVisita(paraAnalise as never)
          .map((r) => clientes.find((c) => c.id === r.id)!)
          .filter(Boolean)
      : clientes;

  const totalCarteira = totais.reduce((s, t) => s + num(t._sum.totalComprado), 0);
  const totalClientes = totais.reduce((s, t) => s + t._count, 0);
  const ativos = totais.find((t) => t.status === "ATIVO")?._count ?? 0;
  const prospects = totais.find((t) => t.status === "PROSPECT")?._count ?? 0;
  const emRisco = [...riscos.values()].filter((r) => r.nivel !== "ok").length;

  return (
    <div className="escala">
      <header className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[27px] sm:text-[32px] tracking-[-0.04em] text-tinta">Clientes</h1>
          <p className="text-[13.5px] text-tinta-3 mt-1">
            {totalClientes} na carteira · {dinheiroCurto(totalCarteira)} em histórico
          </p>
        </div>
        <BotaoLink href="/clientes/novo" variante="tinta" icone="mais">
          Novo
        </BotaoLink>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5">
        <Tile
          rotulo="Ativos"
          icone="clientes"
          tom="quitado"
          valor={<span className="numeral text-[24px] text-tinta">{ativos}</span>}
          detalhe={`${prospects} prospects`}
        />
        <Tile
          rotulo="Pedindo atenção"
          icone="fogo"
          tom={emRisco > 0 ? "carimbo" : "neutro"}
          href="/clientes?ordem=risco"
          valor={<span className="numeral text-[24px] text-tinta">{emRisco}</span>}
          detalhe="Atrasados ou sumindo"
        />
        <Tile
          rotulo="Ticket médio"
          icone="grafico"
          valor={
            <span className="cifra text-[21px] text-tinta">
              {dinheiro(
                clientes.filter((c) => c.qtdPedidos > 0).length > 0
                  ? clientes.reduce((s, c) => s + num(c.ticketMedio), 0) /
                      clientes.filter((c) => c.qtdPedidos > 0).length
                  : 0,
              )}
            </span>
          }
          detalhe="Por pedido"
        />
        <Tile
          rotulo="Sem endereço"
          icone="pino"
          tom={semCoordenada > 0 ? "ambar" : "neutro"}
          valor={<span className="numeral text-[24px] text-tinta">{semCoordenada}</span>}
          detalhe="Ficam fora da rota"
        />
      </div>

      <FiltrosClientes
        regioes={regioes.map((r) => ({
          id: r.id,
          nome: r.nome,
          cor: r.cor,
          total: r._count.clientes,
        }))}
        atual={{
          q: params.q ?? "",
          status: params.status ?? "",
          curva: params.curva ?? "",
          regiao: params.regiao ?? "",
          ordem: params.ordem ?? "",
        }}
        abrirBusca={params.busca === "1"}
      />

      <FerramentasCarteira semCoordenada={semCoordenada} />

      <Secao titulo={`${listados.length} ${listados.length === 1 ? "cliente" : "clientes"}`}>
        {listados.length > 0 ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {listados.map((c) => (
              <CartaoCliente
                key={c.id}
                mostrarRisco={params.ordem === "risco"}
                c={{
                  id: c.id,
                  razaoSocial: c.razaoSocial,
                  nomeFantasia: c.nomeFantasia,
                  cidade: c.cidade,
                  uf: c.uf,
                  curva: c.curva,
                  status: c.status,
                  totalComprado: num(c.totalComprado),
                  qtdPedidos: c.qtdPedidos,
                  ultimaVisitaEm: c.ultimaVisitaEm?.toISOString() ?? null,
                  ultimoPedidoEm: c.ultimoPedidoEm?.toISOString() ?? null,
                  whatsapp: c.whatsapp,
                  telefone: c.telefone,
                  regiao: c.regiao ? { nome: c.regiao.nome, cor: c.regiao.cor } : null,
                  risco: riscos.get(c.id)
                    ? {
                        nivel: riscos.get(c.id)!.nivel,
                        pontos: riscos.get(c.id)!.pontos,
                        motivos: riscos.get(c.id)!.motivos,
                      }
                    : null,
                }}
              />
            ))}
          </div>
        ) : totalClientes === 0 ? (
          <Vazio
            ilustracao={<TalaoVazio />}
            titulo="Carteira vazia"
            descricao="Cadastre pelo CNPJ e o sistema puxa razão social, endereço e contato da Receita. Ou jogue sua planilha antiga aqui."
            acao={
              <div className="flex flex-wrap gap-2 justify-center">
                <BotaoLink href="/clientes/novo" variante="tinta" icone="mais">
                  Cadastrar cliente
                </BotaoLink>
                <BotaoLink href="/importar" variante="papel" icone="planilha">
                  Importar planilha
                </BotaoLink>
              </div>
            }
          />
        ) : (
          <Vazio
            ilustracao={<BuscaVazia />}
            titulo="Nada com esse filtro"
            descricao="Tente outro termo ou limpe os filtros."
            acao={
              <BotaoLink href="/clientes" variante="papel">
                Limpar filtros
              </BotaoLink>
            }
          />
        )}
      </Secao>
    </div>
  );
}
