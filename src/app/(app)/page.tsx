import Link from "next/link";

import { BarrasFluxo, MedidorMeta } from "@/components/graficos";
import { CartaoCliente, ItemAgenda, TrilhaParadas } from "@/components/cartoes";
import { Icone } from "@/components/icone";
import { AgendaVazia, EstradaVazia } from "@/components/ilustracoes";
import {
  BotaoLink,
  Canhoto,
  CanhotoTitulo,
  Carimbo,
  Cifra,
  Etiqueta,
  LinhaPicotada,
  Secao,
  Tile,
  Vazio,
} from "@/components/ui";
import { exigirUsuario } from "@/lib/auth";
import { avaliarRisco, filaDeVisita, fluxoDeCaixa } from "@/lib/analise";
import {
  dataExtenso,
  dinheiro,
  dinheiroCurto,
  duracao,
  fimDoDia,
  inicioDoDia,
  km,
  num,
  plain,
  primeiroNome,
  saudacao,
  somaDias,
  tempoRelativo,
} from "@/lib/format";
import { linkGoogleMaps } from "@/lib/rotas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MeuDia() {
  const user = await exigirUsuario();

  const agora = new Date();
  const comecoHoje = inicioDoDia(agora);
  const fimHoje = fimDoDia(agora);
  const comecoMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);

  const [rota, agendaHoje, comissoes, pedidosMes, clientesBrutos, representadas, rotasMes] =
    await Promise.all([
      prisma.route.findFirst({
        where: { userId: user.id, data: { gte: comecoHoje, lte: fimHoje } },
        include: {
          veiculo: true,
          paradas: {
            orderBy: { ordem: "asc" },
            include: { cliente: { select: { id: true, curva: true, cidade: true, uf: true } } },
          },
        },
      }),

      prisma.agendaEvent.findMany({
        where: { userId: user.id, inicio: { gte: comecoHoje, lte: fimHoje } },
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
              logradouro: true,
              numero: true,
              bairro: true,
              cidade: true,
              uf: true,
            },
          },
        },
      }),

      prisma.commission.findMany({
        where: { userId: user.id, status: { notIn: ["CANCELADA"] } },
        include: {
          representada: { select: { nomeFantasia: true, razaoSocial: true, cor: true } },
          pedido: { select: { id: true, numero: true } },
        },
        orderBy: { vencimento: "asc" },
      }),

      prisma.order.aggregate({
        where: {
          userId: user.id,
          data: { gte: comecoMes, lte: fimMes },
          status: { notIn: ["CANCELADO", "RASCUNHO"] },
        },
        _sum: { valorLiquido: true, comissaoValor: true },
        _count: true,
      }),

      prisma.client.findMany({
        where: { userId: user.id, status: { notIn: ["PERDIDO", "BLOQUEADO"] } },
        include: { regiao: { select: { nome: true, cor: true } } },
      }),

      prisma.representada.findMany({
        where: { userId: user.id, status: "ATIVA" },
        orderBy: { razaoSocial: "asc" },
      }),

      prisma.route.aggregate({
        where: { userId: user.id, data: { gte: comecoMes, lte: fimMes } },
        _sum: { custoTotal: true, distanciaKm: true },
      }),
    ]);

  // ---------------- dinheiro ----------------
  const vencidas = comissoes.filter((c) => c.status === "VENCIDA");
  const totalVencido = vencidas.reduce((s, c) => s + num(c.valorPrevisto) - num(c.valorRecebido), 0);

  const proximos7 = comissoes.filter(
    (c) =>
      ["A_RECEBER", "PREVISTA", "PARCIAL"].includes(c.status) &&
      c.vencimento <= somaDias(agora, 7) &&
      c.vencimento >= comecoHoje,
  );
  const totalProximos7 = proximos7.reduce((s, c) => s + num(c.valorPrevisto) - num(c.valorRecebido), 0);

  const recebidoNoMes = comissoes
    .filter((c) => c.recebidoEm && c.recebidoEm >= comecoMes && c.recebidoEm <= fimMes)
    .reduce((s, c) => s + num(c.valorRecebido), 0);

  const aReceberNoMes = comissoes
    .filter(
      (c) =>
        c.vencimento >= comecoMes &&
        c.vencimento <= fimMes &&
        !["RECEBIDA", "GLOSADA", "CANCELADA"].includes(c.status),
    )
    .reduce((s, c) => s + num(c.valorPrevisto) - num(c.valorRecebido), 0);

  const fluxo = fluxoDeCaixa(
    comissoes.map((c) => ({
      competencia: c.competencia,
      valorPrevisto: num(c.valorPrevisto),
      valorRecebido: num(c.valorRecebido),
      status: c.status,
    })),
    6,
  );

  // ---------------- carteira ----------------
  const clientes = clientesBrutos.map((c) => ({
    ...c,
    totalComprado: num(c.totalComprado),
    ticketMedio: num(c.ticketMedio),
  }));

  const fila = filaDeVisita(clientes as never);
  const emRisco = fila.filter((c) => c.risco.nivel !== "ok").slice(0, 4);

  // ---------------- metas ----------------
  const vendaPorRepresentada = await prisma.order.groupBy({
    by: ["representadaId"],
    where: {
      userId: user.id,
      data: { gte: comecoMes, lte: fimMes },
      status: { notIn: ["CANCELADO", "RASCUNHO"] },
    },
    _sum: { valorLiquido: true },
  });
  const mapaVenda = new Map(
    vendaPorRepresentada.map((v) => [v.representadaId, num(v._sum.valorLiquido)]),
  );

  const vendidoMes = num(pedidosMes._sum.valorLiquido);
  const metaMensal = num(user.metaMensal);
  const custoEstradaMes = num(rotasMes._sum.custoTotal);

  // ---------------- rota ----------------
  const paradasPendentes = rota?.paradas.filter((p) => p.status !== "VISITADO") ?? [];
  const proximaParada = paradasPendentes[0];
  const linkRotaCompleta = rota
    ? linkGoogleMaps([
        ...(rota.origemLat && rota.origemLng
          ? [{ lat: rota.origemLat, lng: rota.origemLng }]
          : []),
        ...rota.paradas.map((p) => ({ lat: p.lat, lng: p.lng })),
      ])
    : null;

  const visitasConcluidas = agendaHoje.filter((a) => a.status === "CONCLUIDO").length;

  return (
    <div className="escala">
      {/* ================= cabeçalho ================= */}
      <header className="mb-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[12.5px] uppercase tracking-[0.14em] text-tinta-3 font-bold">
              {dataExtenso(agora)}
            </p>
            <h1 className="text-[30px] sm:text-[38px] tracking-[-0.045em] text-tinta mt-1.5">
              {saudacao(agora)}, {primeiroNome(user.nome)}.
            </h1>
            <p className="text-[14px] text-tinta-2 mt-2 leading-relaxed max-w-[52ch]">
              {resumoDoDia({
                paradas: rota?.paradas.length ?? agendaHoje.length,
                concluidas: visitasConcluidas,
                vencidas: vencidas.length,
                risco: emRisco.length,
              })}
            </p>
          </div>

          <Link
            href="/avisos"
            className="hidden sm:flex items-center gap-2 text-[13px] text-tinta-3 hover:text-tinta shrink-0 pb-1"
          >
            <Icone nome="sino" tamanho={16} />
            Avisos
          </Link>
        </div>
      </header>

      {/* ================= tiles ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-7">
        <Tile
          rotulo="A receber no mês"
          icone="comissao"
          tom="tinta"
          href="/comissoes"
          valor={<Cifra valor={aReceberNoMes} tamanho="grande" />}
          detalhe={
            totalVencido > 0 ? (
              <span className="text-carimbo font-semibold">
                {dinheiro(totalVencido)} já vencido
              </span>
            ) : (
              "Nada vencido. Bom sinal."
            )
          }
        />
        <Tile
          rotulo="Recebido no mês"
          icone="cofre"
          tom="quitado"
          href="/comissoes?status=RECEBIDA"
          valor={<Cifra valor={recebidoNoMes} tamanho="grande" tom="quitado" />}
          detalhe={`${dinheiro(totalProximos7)} caem em 7 dias`}
        />
        <Tile
          rotulo="Vendido no mês"
          icone="grafico"
          tom="neutro"
          href="/pedidos"
          valor={<Cifra valor={vendidoMes} tamanho="grande" />}
          detalhe={
            metaMensal > 0
              ? `${((vendidoMes / metaMensal) * 100).toFixed(0)}% da meta de ${dinheiroCurto(metaMensal)}`
              : `${pedidosMes._count} pedidos`
          }
        />
        <Tile
          rotulo="Custo de estrada"
          icone="combustivel"
          tom="ambar"
          href="/rotas"
          valor={<Cifra valor={custoEstradaMes} tamanho="grande" />}
          detalhe={`${km(num(rotasMes._sum.distanciaKm))} rodados no mês`}
        />
      </div>

      {/* ================= rota de hoje ================= */}
      <Secao
        titulo="Rota de hoje"
        acao={
          rota ? (
            <Link href={`/rotas/${rota.id}`} className="text-[12.5px] font-semibold text-caneta">
              Ver completa
            </Link>
          ) : null
        }
      >
        {rota ? (
          <Canhoto picotado className="overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[17px] text-tinta">{rota.nome}</h3>
                    <Etiqueta
                      tom={rota.status === "EM_ANDAMENTO" ? "ambar" : "neutro"}
                      icone={rota.status === "EM_ANDAMENTO" ? "raio" : "rota"}
                    >
                      {rota.status === "EM_ANDAMENTO" ? "Em andamento" : "Planejada"}
                    </Etiqueta>
                  </div>
                  <p className="text-[12.5px] text-tinta-3 mt-1">
                    {rota.paradas.length - paradasPendentes.length} de {rota.paradas.length}{" "}
                    visitadas
                    {rota.veiculo ? ` · ${rota.veiculo.apelido}` : ""}
                  </p>
                </div>
                {num(rota.reaisEconomizados) > 0 ? (
                  <div className="text-right shrink-0">
                    <Carimbo tom="quitado">
                      −{km(rota.kmEconomizados)}
                    </Carimbo>
                    <p className="text-[10.5px] text-tinta-3 mt-1.5">
                      economizou {dinheiro(rota.reaisEconomizados)}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {[
                  { r: "Distância", v: km(rota.distanciaKm), i: "rota" as const },
                  { r: "Tempo", v: duracao(rota.duracaoMin), i: "relogio" as const },
                  { r: "Combustível", v: dinheiro(rota.custoCombustivel), i: "combustivel" as const },
                  { r: "Custo total", v: dinheiro(rota.custoTotal), i: "comissao" as const },
                ].map((m) => (
                  <div key={m.r} className="rounded-xl bg-[color-mix(in_oklab,var(--color-tinta)_4%,transparent)] px-2.5 py-2">
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.07em] text-tinta-3">
                      <Icone nome={m.i} tamanho={11} />
                      <span className="truncate">{m.r}</span>
                    </span>
                    <span className="cifra text-[13.5px] text-tinta block mt-1 truncate">{m.v}</span>
                  </div>
                ))}
              </div>

              <LinhaPicotada rotulo="paradas" />

              <TrilhaParadas
                origem={rota.origemLabel ?? undefined}
                paradas={plain(
                  rota.paradas.map((p) => ({
                    id: p.id,
                    ordem: p.ordem,
                    label: p.label,
                    status: p.status,
                    distanciaAnteriorKm: p.distanciaAnteriorKm,
                    duracaoAnteriorMin: p.duracaoAnteriorMin,
                    chegadaPrevista: p.chegadaPrevista?.toISOString() ?? null,
                    permanenciaMin: p.permanenciaMin,
                    lat: p.lat,
                    lng: p.lng,
                    cliente: p.cliente,
                  })),
                )}
              />
            </div>

            <div className="flex items-stretch border-t border-papel-borda divide-x divide-[var(--color-papel-borda)]">
              {proximaParada ? (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${proximaParada.lat},${proximaParada.lng}&travelmode=driving`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-semibold text-caneta active:bg-caneta-fundo"
                >
                  <Icone nome="bussola" tamanho={16} />
                  Ir para {proximaParada.label.split(" ")[0]}
                </a>
              ) : (
                <span className="flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-semibold text-quitado">
                  <Icone nome="check" tamanho={16} />
                  Rota concluída
                </span>
              )}
              {linkRotaCompleta ? (
                <a
                  href={linkRotaCompleta}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-semibold text-tinta-2 active:bg-[color-mix(in_oklab,var(--color-tinta)_7%,transparent)]"
                >
                  <Icone nome="externo" tamanho={15} />
                  Rota no Maps
                </a>
              ) : null}
            </div>
          </Canhoto>
        ) : (
          <Vazio
            ilustracao={<EstradaVazia />}
            titulo="Nenhuma rota montada para hoje"
            descricao="Escolha os clientes e o sistema ordena as paradas, calcula os quilômetros e diz quanto vai sair de combustível."
            acao={
              <BotaoLink href="/rotas?novo=1" variante="tinta" icone="rota">
                Montar rota de hoje
              </BotaoLink>
            }
          />
        )}
      </Secao>

      {/* ================= agenda ================= */}
      <Secao
        titulo="Compromissos de hoje"
        acao={
          <Link href="/agenda" className="text-[12.5px] font-semibold text-caneta">
            Semana toda
          </Link>
        }
      >
        {agendaHoje.length > 0 ? (
          <div className="space-y-2.5">
            {agendaHoje.map((a) => (
              <ItemAgenda
                key={a.id}
                compacto
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
            titulo="Agenda livre hoje"
            descricao="Nenhum compromisso marcado. Quer que eu sugira quem está mais atrasado na carteira?"
            acao={
              <BotaoLink href="/agenda?sugerir=1" variante="tinta" icone="alvo">
                Sugerir a semana
              </BotaoLink>
            }
          />
        )}
      </Secao>

      {/* ================= dinheiro ================= */}
      <div className="grid lg:grid-cols-2 gap-4 mb-7">
        <Canhoto>
          <CanhotoTitulo
            titulo="Previsão de caixa"
            sub="O que cai nos próximos 6 meses"
            icone="grafico"
          />
          <div className="px-4 pb-4">
            <BarrasFluxo dados={fluxo} />
          </div>
        </Canhoto>

        <Canhoto picotado={vencidas.length > 0}>
          <CanhotoTitulo
            titulo={vencidas.length > 0 ? "Atrasado na representada" : "Nada atrasado"}
            sub={
              vencidas.length > 0
                ? `${vencidas.length} comissões passaram do vencimento`
                : "Todas as comissões estão em dia"
            }
            icone={vencidas.length > 0 ? "alerta" : "check"}
            acao={
              vencidas.length > 0 ? (
                <Link href="/comissoes?status=VENCIDA" className="text-[12.5px] font-semibold text-carimbo">
                  Cobrar
                </Link>
              ) : null
            }
          />
          <div className="px-4 pb-4">
            {vencidas.length > 0 ? (
              <>
                <p className="cifra text-[30px] text-carimbo font-medium leading-none mb-4">
                  {dinheiro(totalVencido)}
                </p>
                <ul className="space-y-2.5">
                  {vencidas.slice(0, 4).map((c) => (
                    <li key={c.id} className="flex items-center gap-3">
                      <span
                        className="w-1 h-8 rounded-full shrink-0"
                        style={{ background: c.representada.cor }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-tinta truncate">
                          {c.representada.nomeFantasia ?? c.representada.razaoSocial}
                        </p>
                        <p className="text-[11.5px] text-tinta-3 truncate">
                          {c.descricao} · venceu {tempoRelativo(c.vencimento)}
                        </p>
                      </div>
                      <span className="cifra text-[13px] text-carimbo shrink-0">
                        {dinheiro(num(c.valorPrevisto) - num(c.valorRecebido))}
                      </span>
                    </li>
                  ))}
                </ul>
                {vencidas.length > 4 ? (
                  <p className="text-[12px] text-tinta-3 mt-3">
                    e mais {vencidas.length - 4} em atraso.
                  </p>
                ) : null}
              </>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <Carimbo tom="quitado" grande>
                  em dia
                </Carimbo>
                <p className="text-[13px] text-tinta-3 mt-4 max-w-[30ch] leading-relaxed">
                  Nenhuma representada está devendo. Continue lançando os pedidos para manter a
                  previsão redonda.
                </p>
              </div>
            )}
          </div>
        </Canhoto>
      </div>

      {/* ================= carteira em risco ================= */}
      {emRisco.length > 0 ? (
        <Secao
          titulo="Precisam de você"
          acao={
            <Link href="/clientes?ordem=risco" className="text-[12.5px] font-semibold text-caneta">
              Ver todos
            </Link>
          }
        >
          <div className="grid sm:grid-cols-2 gap-2.5">
            {emRisco.map((c) => {
              const original = clientesBrutos.find((x) => x.id === c.id)!;
              return (
                <CartaoCliente
                  key={c.id}
                  mostrarRisco
                  c={{
                    id: c.id,
                    razaoSocial: original.razaoSocial,
                    nomeFantasia: original.nomeFantasia,
                    cidade: original.cidade,
                    uf: original.uf,
                    curva: original.curva,
                    status: original.status,
                    totalComprado: num(original.totalComprado),
                    qtdPedidos: original.qtdPedidos,
                    ultimaVisitaEm: original.ultimaVisitaEm?.toISOString() ?? null,
                    ultimoPedidoEm: original.ultimoPedidoEm?.toISOString() ?? null,
                    whatsapp: original.whatsapp,
                    telefone: original.telefone,
                    regiao: original.regiao,
                    risco: {
                      nivel: c.risco.nivel,
                      pontos: c.risco.pontos,
                      motivos: c.risco.motivos,
                    },
                  }}
                />
              );
            })}
          </div>
        </Secao>
      ) : null}

      {/* ================= metas ================= */}
      {representadas.length > 0 ? (
        <Secao titulo="Meta do mês por representada">
          <Canhoto className="p-4">
            <div className="space-y-5">
              {metaMensal > 0 ? (
                <>
                  <MedidorMeta
                    rotulo="Sua meta pessoal"
                    valor={vendidoMes}
                    meta={metaMensal}
                    detalhe={`faltam ${dinheiroCurto(Math.max(0, metaMensal - vendidoMes))}`}
                  />
                  <LinhaPicotada />
                </>
              ) : null}

              {representadas.map((r) => (
                <MedidorMeta
                  key={r.id}
                  rotulo={r.nomeFantasia ?? r.razaoSocial}
                  valor={mapaVenda.get(r.id) ?? 0}
                  meta={num(r.metaMensal)}
                  cor={r.cor}
                />
              ))}
            </div>
          </Canhoto>
        </Secao>
      ) : null}
    </div>
  );
}

function resumoDoDia({
  paradas,
  concluidas,
  vencidas,
  risco,
}: {
  paradas: number;
  concluidas: number;
  vencidas: number;
  risco: number;
}) {
  const partes: string[] = [];

  if (paradas === 0) partes.push("Hoje está sem visitas marcadas");
  else if (concluidas === 0) partes.push(`Você tem ${paradas} paradas pela frente`);
  else if (concluidas >= paradas) partes.push(`Fechou as ${paradas} visitas do dia`);
  else partes.push(`${concluidas} de ${paradas} visitas feitas`);

  if (vencidas > 0) {
    partes.push(`${vencidas} ${vencidas === 1 ? "comissão vencida" : "comissões vencidas"} para cobrar`);
  }
  if (risco > 0) {
    partes.push(`${risco} ${risco === 1 ? "cliente pedindo atenção" : "clientes pedindo atenção"}`);
  }

  return `${partes.join(" · ")}.`;
}
