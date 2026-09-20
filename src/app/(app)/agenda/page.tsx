import type { Metadata } from "next";
import Link from "next/link";

import { FormCompromisso, SugestaoSemana, TiraSemana } from "@/app/(app)/agenda/cliente";
import { ItemAgenda } from "@/components/cartoes";
import { Icone } from "@/components/icone";
import { AgendaVazia } from "@/components/ilustracoes";
import { Botao, BotaoLink, Canhoto, Etiqueta, Secao, Tile, Vazio } from "@/components/ui";
import { montarSemana } from "@/lib/analise";
import { exigirUsuario } from "@/lib/auth";
import {
  dataExtenso,
  duracao,
  fimDoDia,
  inicioDoDia,
  num,
  paraInputData,
  somaDias,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Agenda" };
export const dynamic = "force-dynamic";

export default async function PaginaAgenda({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; novo?: string; cliente?: string; sugerir?: string }>;
}) {
  const params = await searchParams;
  const user = await exigirUsuario();

  const diaSelecionado = params.data ? new Date(`${params.data}T12:00:00`) : new Date();
  const inicioSemana = somaDias(diaSelecionado, -diaSelecionado.getDay());
  const fimSemana = somaDias(inicioSemana, 6);

  const [eventosSemana, eventosDia, clientes, representadas] = await Promise.all([
    prisma.agendaEvent.findMany({
      where: {
        userId: user.id,
        inicio: { gte: inicioDoDia(inicioSemana), lte: fimDoDia(fimSemana) },
      },
      select: { id: true, inicio: true, status: true, tipo: true },
    }),

    prisma.agendaEvent.findMany({
      where: {
        userId: user.id,
        inicio: { gte: inicioDoDia(diaSelecionado), lte: fimDoDia(diaSelecionado) },
      },
      orderBy: { inicio: "asc" },
      include: {
        cliente: {
          select: {
            id: true,
            razaoSocial: true,
            nomeFantasia: true,
            curva: true,
            whatsapp: true,
            telefone: true,
            lat: true,
            lng: true,
            cidade: true,
            uf: true,
          },
        },
      },
    }),

    prisma.client.findMany({
      where: { userId: user.id, status: { notIn: ["PERDIDO", "BLOQUEADO"] } },
      orderBy: { razaoSocial: "asc" },
      include: { regiao: { select: { nome: true, cor: true } } },
    }),

    prisma.representada.findMany({
      where: { userId: user.id, status: "ATIVA" },
      select: { id: true, razaoSocial: true, nomeFantasia: true },
      orderBy: { razaoSocial: "asc" },
    }),
  ]);

  // ---- contagem por dia da semana, para a tira ----
  const porDia = new Map<string, { total: number; concluidos: number }>();
  for (const e of eventosSemana) {
    const chave = paraInputData(e.inicio);
    const atual = porDia.get(chave) ?? { total: 0, concluidos: 0 };
    atual.total++;
    if (e.status === "CONCLUIDO") atual.concluidos++;
    porDia.set(chave, atual);
  }

  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = somaDias(inicioSemana, i);
    const chave = paraInputData(d);
    return {
      data: chave,
      diaSemana: d.getDay(),
      diaMes: d.getDate(),
      ...(porDia.get(chave) ?? { total: 0, concluidos: 0 }),
    };
  });

  // ---- sugestão automática da semana ----
  const sugestao = params.sugerir
    ? montarSemana(
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
          regionId: c.regionId,
          cidade: c.cidade,
          tempoVisitaMin: c.tempoVisitaMin,
          diasAtendimento: c.diasAtendimento,
        })),
        {
          visitasPorDia: user.metaVisitasDia,
          minutosPorDia: 8 * 60,
        },
      )
    : null;

  const totalDia = eventosDia.length;
  const concluidosDia = eventosDia.filter((e) => e.status === "CONCLUIDO").length;
  const minutosDia = eventosDia.reduce(
    (s, e) => s + (e.fim.getTime() - e.inicio.getTime()) / 60_000,
    0,
  );
  const comPedido = eventosDia.filter((e) => e.resultado === "PEDIDO").length;

  return (
    <div className="escala">
      <header className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[27px] sm:text-[32px] tracking-[-0.04em] text-tinta">Agenda</h1>
          <p className="text-[13.5px] text-tinta-3 mt-1 capitalize">{dataExtenso(diaSelecionado)}</p>
        </div>
        <div className="flex items-center gap-2">
          <BotaoLink
            href={`/agenda?data=${paraInputData(diaSelecionado)}&sugerir=1`}
            variante="papel"
            icone="alvo"
            className="hidden sm:inline-flex"
          >
            Sugerir semana
          </BotaoLink>
          <BotaoLink
            href={`/agenda?data=${paraInputData(diaSelecionado)}&novo=1`}
            variante="tinta"
            icone="mais"
          >
            Novo
          </BotaoLink>
        </div>
      </header>

      <TiraSemana
        dias={dias}
        selecionado={paraInputData(diaSelecionado)}
        inicioSemana={paraInputData(inicioSemana)}
      />

      {sugestao ? (
        <SugestaoSemana
          dias={sugestao.map((d) => ({
            data: d.data.toISOString(),
            diaSemana: d.diaSemana,
            minutosOcupados: d.minutosOcupados,
            clientes: d.clientes.slice(0, 10).map((c) => ({
              id: c.id,
              nome: c.nomeFantasia ?? c.razaoSocial,
              curva: c.curva,
              cidade: c.cidade ?? null,
              motivo: c.risco.motivos[0] ?? "Dentro da frequência",
              nivel: c.risco.nivel,
              tempoVisitaMin: c.tempoVisitaMin ?? 40,
            })),
          }))}
          jornadaInicio={user.jornadaInicio}
        />
      ) : null}

      {/* resumo do dia */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 my-5">
        <Tile
          rotulo="Compromissos"
          icone="agenda"
          valor={<span className="numeral text-[24px] text-tinta">{totalDia}</span>}
          detalhe={`${concluidosDia} concluídos`}
        />
        <Tile
          rotulo="Tempo em visita"
          icone="relogio"
          valor={<span className="numeral text-[24px] text-tinta">{duracao(minutosDia)}</span>}
          detalhe="Sem contar o deslocamento"
        />
        <Tile
          rotulo="Saíram pedidos"
          icone="pedido"
          tom={comPedido > 0 ? "quitado" : "neutro"}
          valor={<span className="numeral text-[24px] text-tinta">{comPedido}</span>}
          detalhe={totalDia > 0 ? `${Math.round((comPedido / totalDia) * 100)}% de conversão` : "—"}
        />
        <Tile
          rotulo="Meta do dia"
          icone="alvo"
          tom={totalDia >= user.metaVisitasDia ? "quitado" : "ambar"}
          valor={
            <span className="numeral text-[24px] text-tinta">
              {totalDia}/{user.metaVisitasDia}
            </span>
          }
          detalhe={
            totalDia >= user.metaVisitasDia
              ? "Dia cheio"
              : `Cabem mais ${user.metaVisitasDia - totalDia}`
          }
        />
      </div>

      {/* lista do dia */}
      <Secao
        titulo="Do dia"
        acao={
          <div className="flex items-center gap-2 text-[12.5px]">
            <Link
              href={`/agenda?data=${paraInputData(somaDias(diaSelecionado, -1))}`}
              className="p-1.5 rounded-lg text-tinta-3 hover:text-tinta"
              aria-label="Dia anterior"
            >
              <Icone nome="setaEsquerda" tamanho={16} />
            </Link>
            <Link href="/agenda" className="font-semibold text-caneta">
              Hoje
            </Link>
            <Link
              href={`/agenda?data=${paraInputData(somaDias(diaSelecionado, 1))}`}
              className="p-1.5 rounded-lg text-tinta-3 hover:text-tinta"
              aria-label="Próximo dia"
            >
              <Icone nome="seta" tamanho={16} />
            </Link>
          </div>
        }
      >
        {eventosDia.length > 0 ? (
          <div className="space-y-2.5">
            {eventosDia.map((a) => (
              <ItemAgenda
                key={a.id}
                c={{
                  id: a.id,
                  titulo: a.titulo,
                  tipo: a.tipo,
                  status: a.status,
                  resultado: a.resultado,
                  inicio: a.inicio.toISOString(),
                  fim: a.fim.toISOString(),
                  local: a.local,
                  descricao: a.descricao,
                  notas: a.notas,
                  checkinEm: a.checkinEm?.toISOString() ?? null,
                  checkinDistanciaM: a.checkinDistanciaM,
                  cliente: a.cliente
                    ? {
                        id: a.cliente.id,
                        nome: a.cliente.nomeFantasia ?? a.cliente.razaoSocial,
                        curva: a.cliente.curva,
                        whatsapp: a.cliente.whatsapp,
                        telefone: a.cliente.telefone,
                        lat: a.cliente.lat,
                        lng: a.cliente.lng,
                        endereco: `${a.cliente.cidade ?? ""}`,
                      }
                    : null,
                }}
              />
            ))}
          </div>
        ) : (
          <Vazio
            ilustracao={<AgendaVazia />}
            titulo="Dia sem compromisso"
            descricao="Marque uma visita ou peça para o sistema sugerir quem está mais atrasado na carteira."
            acao={
              <div className="flex flex-wrap gap-2 justify-center">
                <BotaoLink
                  href={`/agenda?data=${paraInputData(diaSelecionado)}&novo=1`}
                  variante="tinta"
                  icone="calendarioMais"
                >
                  Marcar visita
                </BotaoLink>
                <BotaoLink
                  href={`/agenda?data=${paraInputData(diaSelecionado)}&sugerir=1`}
                  variante="papel"
                  icone="alvo"
                >
                  Sugerir semana
                </BotaoLink>
              </div>
            }
          />
        )}
      </Secao>

      {/* rota do dia atalho */}
      {eventosDia.length > 1 ? (
        <Canhoto className="p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl grid place-items-center bg-caneta-fundo text-caneta shrink-0">
            <Icone nome="rota" tamanho={19} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-tinta">Transformar em rota</p>
            <p className="text-[12.5px] text-tinta-3">
              Ordena as {eventosDia.length} paradas e calcula km e combustível.
            </p>
          </div>
          <BotaoLink
            href={`/rotas?novo=1&data=${paraInputData(diaSelecionado)}&clientes=${eventosDia
              .map((e) => e.cliente?.id)
              .filter(Boolean)
              .join(",")}`}
            variante="papel"
            className="shrink-0"
          >
            Montar
          </BotaoLink>
        </Canhoto>
      ) : null}

      {params.novo ? (
        <FormCompromisso
          data={paraInputData(diaSelecionado)}
          clientePreSelecionado={params.cliente ?? null}
          clientes={clientes.map((c) => ({
            id: c.id,
            nome: c.nomeFantasia ?? c.razaoSocial,
            cidade: c.cidade,
            uf: c.uf,
            curva: c.curva,
            regiao: c.regiao?.nome ?? null,
            tempoVisitaMin: c.tempoVisitaMin,
          }))}
          representadas={representadas.map((r) => ({
            id: r.id,
            nome: r.nomeFantasia ?? r.razaoSocial,
          }))}
        />
      ) : null}
    </div>
  );
}
