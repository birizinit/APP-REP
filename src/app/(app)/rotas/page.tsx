import type { Metadata } from "next";
import Link from "next/link";

import { MontadorRota } from "@/app/(app)/rotas/montador";
import { Icone } from "@/components/icone";
import { EstradaVazia } from "@/components/ilustracoes";
import { BotaoLink, Canhoto, Carimbo, Etiqueta, Secao, Tile, Vazio } from "@/components/ui";
import { exigirUsuario } from "@/lib/auth";
import {
  dataBR,
  dinheiro,
  duracao,
  km,
  litros,
  num,
  paraInputData,
  rotulo,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Rotas" };
export const dynamic = "force-dynamic";

export default async function PaginaRotas({
  searchParams,
}: {
  searchParams: Promise<{ novo?: string; data?: string; clientes?: string }>;
}) {
  const params = await searchParams;
  const user = await exigirUsuario();

  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [rotas, clientes, veiculos, resumoMes] = await Promise.all([
    prisma.route.findMany({
      where: { userId: user.id },
      orderBy: { data: "desc" },
      take: 25,
      include: {
        veiculo: { select: { apelido: true } },
        _count: { select: { paradas: true } },
        paradas: { select: { status: true } },
      },
    }),

    prisma.client.findMany({
      where: { userId: user.id, status: { notIn: ["PERDIDO", "BLOQUEADO"] } },
      orderBy: [{ curva: "asc" }, { razaoSocial: "asc" }],
      include: { regiao: { select: { nome: true, cor: true } } },
    }),

    prisma.vehicle.findMany({
      where: { userId: user.id, ativo: true },
      orderBy: { padrao: "desc" },
    }),

    prisma.route.aggregate({
      where: { userId: user.id, data: { gte: inicioMes } },
      _sum: { distanciaKm: true, custoTotal: true, consumoLitros: true, reaisEconomizados: true },
      _count: true,
    }),
  ]);

  const semBase = !user.baseLat || !user.baseLng;
  const preSelecionados = params.clientes?.split(",").filter(Boolean) ?? [];

  if (params.novo) {
    return (
      <MontadorRota
        dataInicial={params.data ?? paraInputData(new Date())}
        preSelecionados={preSelecionados}
        semBase={semBase}
        base={{
          label: user.baseLabel ?? "Minha base",
          lat: user.baseLat,
          lng: user.baseLng,
        }}
        jornada={{ inicio: user.jornadaInicio, fim: user.jornadaFim }}
        veiculos={veiculos.map((v) => ({
          id: v.id,
          apelido: v.apelido,
          combustivel: v.combustivel,
          flex: v.flex,
          consumoCidade: v.consumoCidade,
          padrao: v.padrao,
        }))}
        clientes={clientes.map((c) => ({
          id: c.id,
          nome: c.nomeFantasia ?? c.razaoSocial,
          cidade: c.cidade,
          uf: c.uf,
          curva: c.curva,
          status: c.status,
          lat: c.lat,
          lng: c.lng,
          regiao: c.regiao?.nome ?? null,
          regiaoCor: c.regiao?.cor ?? null,
          tempoVisitaMin: c.tempoVisitaMin,
          ultimaVisitaEm: c.ultimaVisitaEm?.toISOString() ?? null,
          frequenciaVisitaDias: c.frequenciaVisitaDias,
        }))}
      />
    );
  }

  return (
    <div className="escala">
      <header className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[27px] sm:text-[32px] tracking-[-0.04em] text-tinta">Rotas</h1>
          <p className="text-[13.5px] text-tinta-3 mt-1">
            Cada roteiro com quilometragem, litro e o quanto custou de verdade.
          </p>
        </div>
        <BotaoLink href="/rotas?novo=1" variante="tinta" icone="mais">
          Montar
        </BotaoLink>
      </header>

      {semBase ? (
        <Canhoto className="p-4 mb-5 flex items-start gap-3 border-l-[3px] border-l-[var(--color-ambar)]">
          <span className="text-ambar shrink-0 mt-0.5">
            <Icone nome="alerta" tamanho={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-tinta">Falta cadastrar sua base</p>
            <p className="text-[12.5px] text-tinta-3 mt-0.5 leading-snug">
              A rota precisa saber de onde você sai para calcular os quilômetros.
            </p>
          </div>
          <BotaoLink href="/ajustes#base" variante="papel" className="shrink-0 text-[13px]">
            Cadastrar
          </BotaoLink>
        </Canhoto>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-6">
        <Tile
          rotulo="Rodado no mês"
          icone="rota"
          valor={<span className="numeral text-[24px] text-tinta">{km(num(resumoMes._sum.distanciaKm))}</span>}
          detalhe={`${resumoMes._count} ${resumoMes._count === 1 ? "rota" : "rotas"}`}
        />
        <Tile
          rotulo="Custo do mês"
          icone="combustivel"
          tom="ambar"
          valor={<span className="cifra text-[21px] text-tinta">{dinheiro(resumoMes._sum.custoTotal)}</span>}
          detalhe={`${litros(num(resumoMes._sum.consumoLitros))} de combustível`}
        />
        <Tile
          rotulo="Economizado"
          icone="folha"
          tom="quitado"
          valor={
            <span className="cifra text-[21px] text-quitado">
              {dinheiro(resumoMes._sum.reaisEconomizados)}
            </span>
          }
          detalhe="Pela otimização das paradas"
        />
        <Tile
          rotulo="Custo médio"
          icone="balanca"
          valor={
            <span className="cifra text-[21px] text-tinta">
              {dinheiro(
                num(resumoMes._sum.distanciaKm) > 0
                  ? num(resumoMes._sum.custoTotal) / num(resumoMes._sum.distanciaKm)
                  : 0,
              )}
            </span>
          }
          detalhe="por quilômetro rodado"
        />
      </div>

      <Secao titulo="Histórico">
        {rotas.length > 0 ? (
          <div className="space-y-2.5">
            {rotas.map((r) => {
              const visitadas = r.paradas.filter((p) => p.status === "VISITADO").length;
              const completa = visitadas === r._count.paradas && r._count.paradas > 0;

              return (
                <Link key={r.id} href={`/rotas/${r.id}`} className="block">
                  <Canhoto className="p-3.5 relative overflow-hidden transition-transform active:scale-[0.99]">
                    {completa && r.status === "CONCLUIDA" ? (
                      <span className="absolute -right-2 top-3 pointer-events-none">
                        <Carimbo tom="quitado">feita</Carimbo>
                      </span>
                    ) : null}

                    <div className="flex items-start gap-3">
                      <span
                        className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${
                          r.status === "EM_ANDAMENTO"
                            ? "bg-ambar-fundo text-ambar"
                            : "bg-caneta-fundo text-caneta"
                        }`}
                      >
                        <Icone nome="rota" tamanho={19} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="text-[14.5px] font-semibold text-tinta truncate pr-14">
                          {r.nome}
                        </p>
                        <p className="text-[12px] text-tinta-3 mt-0.5">
                          {dataBR(r.data)} · {visitadas}/{r._count.paradas} paradas
                          {r.veiculo ? ` · ${r.veiculo.apelido}` : ""}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[12px] text-tinta-2">
                          <span className="flex items-center gap-1">
                            <Icone nome="veiculo" tamanho={12} />
                            <span className="cifra">{km(r.distanciaKm)}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Icone nome="relogio" tamanho={12} />
                            <span className="cifra">{duracao(r.duracaoMin)}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Icone nome="combustivel" tamanho={12} />
                            <span className="cifra">{dinheiro(r.custoTotal)}</span>
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <Etiqueta
                            tom={
                              r.status === "EM_ANDAMENTO"
                                ? "ambar"
                                : r.status === "CONCLUIDA"
                                  ? "quitado"
                                  : "neutro"
                            }
                          >
                            {rotulo(r.status)}
                          </Etiqueta>
                          <Etiqueta
                            tom="tinta"
                            icone={
                              r.modo === "RAPIDO" ? "raio" : r.modo === "ECONOMICO" ? "folha" : "balanca"
                            }
                          >
                            {rotulo(r.modo)}
                          </Etiqueta>
                          {num(r.reaisEconomizados) > 0 ? (
                            <span className="text-[11.5px] text-quitado font-semibold">
                              −{km(r.kmEconomizados)} otimizando
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <span className="text-tinta-3 shrink-0 self-center">
                        <Icone nome="seta" tamanho={17} />
                      </span>
                    </div>
                  </Canhoto>
                </Link>
              );
            })}
          </div>
        ) : (
          <Vazio
            ilustracao={<EstradaVazia />}
            titulo="Nenhuma rota ainda"
            descricao="Escolha os clientes do dia e o sistema ordena as paradas, soma os quilômetros e calcula quanto vai custar de combustível com o consumo do seu carro."
            acao={
              <BotaoLink href="/rotas?novo=1" variante="tinta" icone="rota">
                Montar a primeira rota
              </BotaoLink>
            }
          />
        )}
      </Secao>
    </div>
  );
}
