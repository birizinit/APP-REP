import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AcoesCliente } from "@/app/(app)/clientes/[id]/acoes";
import { Sparkline } from "@/components/graficos";
import { Icone } from "@/components/icone";
import { TalaoVazio } from "@/components/ilustracoes";
import {
  Avatar,
  BotaoLink,
  Canhoto,
  CanhotoTitulo,
  Carimbo,
  Cifra,
  Etiqueta,
  LinhaPicotada,
  SeloCurva,
  Secao,
  Tile,
} from "@/components/ui";
import { avaliarRisco, roiDoCliente } from "@/lib/analise";
import { exigirUsuario } from "@/lib/auth";
import {
  dataBR,
  dinheiro,
  endereco,
  formatarCnpj,
  formatarTelefone,
  km,
  linkWhatsapp,
  mesAno,
  num,
  rotulo,
  tempoRelativo,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { haversine } from "@/lib/rotas";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const c = await prisma.client.findUnique({
    where: { id },
    select: { razaoSocial: true, nomeFantasia: true },
  });
  return { title: c?.nomeFantasia ?? c?.razaoSocial ?? "Cliente" };
}

export default async function PaginaCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await exigirUsuario();

  const cliente = await prisma.client.findFirst({
    where: { id, userId: user.id },
    include: {
      regiao: true,
      representadas: { include: { representada: true } },
      pedidos: {
        orderBy: { data: "desc" },
        take: 30,
        include: { representada: { select: { nomeFantasia: true, razaoSocial: true, cor: true } } },
      },
      agenda: { orderBy: { inicio: "desc" }, take: 6 },
      atividades: { orderBy: { createdAt: "desc" }, take: 12 },
    },
  });

  if (!cliente) notFound();

  const [comissoes, veiculo] = await Promise.all([
    prisma.commission.findMany({
      where: { userId: user.id, pedido: { clientId: id } },
      include: { representada: { select: { nomeFantasia: true, razaoSocial: true, cor: true } } },
      orderBy: { vencimento: "desc" },
      take: 20,
    }),
    prisma.vehicle.findFirst({ where: { userId: user.id, ativo: true }, orderBy: { padrao: "desc" } }),
  ]);

  // ---------------- análise ----------------
  const risco = avaliarRisco({
    id: cliente.id,
    razaoSocial: cliente.razaoSocial,
    nomeFantasia: cliente.nomeFantasia,
    totalComprado: num(cliente.totalComprado),
    qtdPedidos: cliente.qtdPedidos,
    ticketMedio: num(cliente.ticketMedio),
    ultimoPedidoEm: cliente.ultimoPedidoEm,
    ultimaVisitaEm: cliente.ultimaVisitaEm,
    frequenciaVisitaDias: cliente.frequenciaVisitaDias,
    curva: cliente.curva,
    status: cliente.status,
  });

  // histórico mensal para o sparkline
  const historico = new Map<string, number>();
  const hoje = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    historico.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
  }
  for (const p of cliente.pedidos) {
    const chave = `${p.data.getFullYear()}-${String(p.data.getMonth() + 1).padStart(2, "0")}`;
    if (historico.has(chave)) historico.set(chave, (historico.get(chave) ?? 0) + num(p.valorLiquido));
  }

  // ROI: comissão recebida x custo de ir até lá
  const comissaoRecebida = comissoes
    .filter((c) => c.status === "RECEBIDA" || c.status === "PARCIAL")
    .reduce((s, c) => s + num(c.valorRecebido), 0);

  const distanciaBase =
    user.baseLat && user.baseLng && cliente.lat && cliente.lng
      ? haversine({ lat: user.baseLat, lng: user.baseLng }, { lat: cliente.lat, lng: cliente.lng }) * 1.32
      : 0;

  const custoPorKm = veiculo
    ? num(veiculo.precoGasolina) / Math.max(1, veiculo.consumoCidade) + num(veiculo.custoManutencaoKm)
    : 0.95;

  const visitasFeitas = cliente.agenda.filter((a) => a.status === "CONCLUIDO").length || 1;

  const roi = roiDoCliente({
    comissaoRecebida,
    visitasNoPeriodo: visitasFeitas,
    kmPorVisita: distanciaBase,
    custoPorKm,
    tempoVisitaMin: cliente.tempoVisitaMin,
  });

  const wa = linkWhatsapp(
    cliente.whatsapp ?? cliente.telefone,
    `Olá${cliente.contatoNome ? `, ${cliente.contatoNome.split(" ")[0]}` : ""}! Tudo bem?`,
  );

  const proximoCompromisso = cliente.agenda.find(
    (a) => a.inicio > new Date() && a.status !== "CANCELADO",
  );

  return (
    <div className="escala">
      <header className="mb-5">
        <Link href="/clientes" className="text-[12.5px] text-tinta-3 flex items-center gap-1 mb-2">
          <Icone nome="setaEsquerda" tamanho={13} />
          Clientes
        </Link>

        <div className="flex items-start gap-3">
          <Avatar
            nome={cliente.nomeFantasia ?? cliente.razaoSocial}
            cor={cliente.regiao?.cor}
            tamanho={52}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <h1 className="text-[24px] sm:text-[29px] tracking-[-0.04em] text-tinta leading-tight">
                {cliente.nomeFantasia ?? cliente.razaoSocial}
              </h1>
              <span className="mt-1.5">
                <SeloCurva curva={cliente.curva} tamanho={24} />
              </span>
            </div>
            {cliente.nomeFantasia ? (
              <p className="text-[12.5px] text-tinta-3 mt-0.5">{cliente.razaoSocial}</p>
            ) : null}

            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <Etiqueta
                tom={
                  cliente.status === "ATIVO"
                    ? "quitado"
                    : cliente.status === "EM_RISCO"
                      ? "carimbo"
                      : cliente.status === "PROSPECT"
                        ? "azul"
                        : "neutro"
                }
              >
                {rotulo(cliente.status)}
              </Etiqueta>
              {cliente.regiao ? (
                <Etiqueta tom="neutro" icone="pino">
                  {cliente.regiao.nome}
                </Etiqueta>
              ) : null}
              {cliente.tags.map((t) => (
                <Etiqueta key={t} tom="neutro">
                  {t}
                </Etiqueta>
              ))}
            </div>
          </div>
        </div>
      </header>

      <AcoesCliente
        id={cliente.id}
        nome={cliente.nomeFantasia ?? cliente.razaoSocial}
        wa={wa}
        telefone={cliente.telefone}
        lat={cliente.lat}
        lng={cliente.lng}
        status={cliente.status}
      />

      {/* ---------------- risco ---------------- */}
      {risco.nivel !== "ok" ? (
        <Canhoto
          className={`p-4 mt-4 border-l-[3px] ${
            risco.nivel === "critico" ? "border-l-[var(--color-carimbo)]" : "border-l-[var(--color-ambar)]"
          }`}
        >
          <div className="flex items-start gap-3">
            <span className={risco.nivel === "critico" ? "text-carimbo" : "text-ambar"}>
              <Icone nome="fogo" tamanho={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] font-semibold text-tinta">
                {risco.nivel === "critico" ? "Esse cliente está escapando" : "Merece uma olhada"}
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {risco.motivos.map((m) => (
                  <li key={m} className="text-[12.5px] text-tinta-2 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-tinta-3" />
                    {m}
                  </li>
                ))}
              </ul>
            </div>
            <div className="shrink-0 text-right">
              <p className="numeral text-[24px] text-tinta leading-none">{risco.pontos}</p>
              <p className="text-[10px] uppercase tracking-[0.1em] text-tinta-3 mt-1">risco</p>
            </div>
          </div>
        </Canhoto>
      ) : null}

      {/* ---------------- números ---------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 my-4">
        <Tile
          rotulo="Comprou"
          icone="grafico"
          valor={<Cifra valor={cliente.totalComprado} tamanho="grande" />}
          detalhe={`${cliente.qtdPedidos} pedidos`}
        />
        <Tile
          rotulo="Ticket médio"
          icone="pedido"
          valor={<Cifra valor={cliente.ticketMedio} tamanho="grande" />}
          detalhe={cliente.condicaoPagamento ? `Cond. ${cliente.condicaoPagamento}` : "—"}
        />
        <Tile
          rotulo="Última visita"
          icone="relogio"
          tom={risco.atrasoVisitaDias > 0 ? "carimbo" : "neutro"}
          valor={
            <span className="text-[16px] font-semibold text-tinta">
              {tempoRelativo(cliente.ultimaVisitaEm)}
            </span>
          }
          detalhe={`A cada ${cliente.frequenciaVisitaDias} dias`}
        />
        <Tile
          rotulo="Próxima visita"
          icone="agenda"
          tom={proximoCompromisso ? "tinta" : "ambar"}
          valor={
            <span className="text-[16px] font-semibold text-tinta">
              {proximoCompromisso ? dataBR(proximoCompromisso.inicio) : "Sem data"}
            </span>
          }
          detalhe={proximoCompromisso ? proximoCompromisso.titulo.slice(0, 28) : "Marque uma"}
        />
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">
        <div className="space-y-4">
          {/* histórico */}
          {cliente.qtdPedidos > 0 ? (
            <Canhoto>
              <CanhotoTitulo
                titulo="Como compra"
                sub="Faturamento dos últimos 12 meses"
                icone="grafico"
              />
              <div className="px-4 pb-4">
                <Sparkline
                  valores={[...historico.values()]}
                  rotulos={[...historico.keys()].map(mesAno)}
                  altura={56}
                />
              </div>
            </Canhoto>
          ) : null}

          {/* pedidos */}
          <Secao
            titulo="Pedidos"
            acao={
              <Link
                href={`/pedidos/novo?cliente=${cliente.id}`}
                className="text-[12.5px] font-semibold text-caneta"
              >
                Lançar novo
              </Link>
            }
          >
            {cliente.pedidos.length > 0 ? (
              <div className="space-y-2">
                {cliente.pedidos.slice(0, 8).map((p) => (
                  <Link key={p.id} href={`/pedidos/${p.id}`} className="block">
                    <Canhoto className="p-3 flex items-center gap-3 transition-transform active:scale-[0.99]">
                      <span
                        className="w-1 self-stretch rounded-full shrink-0"
                        style={{ background: p.representada.cor }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-semibold text-tinta">
                          {p.numero}
                          <span className="text-tinta-3 font-normal">
                            {" "}
                            · {p.representada.nomeFantasia ?? p.representada.razaoSocial}
                          </span>
                        </p>
                        <p className="text-[11.5px] text-tinta-3 mt-0.5">
                          {dataBR(p.data)} · {rotulo(p.status)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="cifra text-[14px] text-tinta">{dinheiro(p.valorLiquido)}</p>
                        <p className="text-[11px] text-quitado cifra">
                          +{dinheiro(p.comissaoValor)}
                        </p>
                      </div>
                    </Canhoto>
                  </Link>
                ))}
                {cliente.pedidos.length > 8 ? (
                  <Link
                    href={`/pedidos?cliente=${cliente.id}`}
                    className="botao botao-papel w-full text-[13px]"
                  >
                    Ver todos os {cliente.qtdPedidos} pedidos
                  </Link>
                ) : null}
              </div>
            ) : (
              <Canhoto className="p-6 text-center">
                <span className="inline-block text-tinta-3 mb-3">
                  <TalaoVazio tamanho={92} />
                </span>
                <p className="text-[14px] text-tinta">Nenhum pedido ainda</p>
                <p className="text-[12.5px] text-tinta-3 mt-1 mb-4">
                  Quando sair o primeiro, a comissão entra sozinha na previsão.
                </p>
                <BotaoLink
                  href={`/pedidos/novo?cliente=${cliente.id}`}
                  variante="tinta"
                  icone="pedido"
                >
                  Lançar pedido
                </BotaoLink>
              </Canhoto>
            )}
          </Secao>

          {/* timeline */}
          <Secao titulo="Histórico">
            <Canhoto className="p-4">
              {cliente.atividades.length > 0 ? (
                <ol className="relative">
                  {cliente.atividades.map((a, i) => (
                    <li key={a.id} className="relative flex gap-3 pb-4 last:pb-0">
                      {i < cliente.atividades.length - 1 ? (
                        <span className="absolute left-[11px] top-[24px] bottom-0 w-px bg-papel-borda" />
                      ) : null}
                      <span className="relative z-10 w-[23px] h-[23px] rounded-full grid place-items-center shrink-0 bg-papel border border-papel-borda text-tinta-3">
                        <Icone
                          nome={
                            a.tipo === "pedido"
                              ? "pedido"
                              : a.tipo === "visita"
                                ? "clientes"
                                : a.tipo === "whatsapp"
                                  ? "whatsapp"
                                  : a.tipo === "ligacao"
                                    ? "telefone"
                                    : a.tipo === "comissao"
                                      ? "comissao"
                                      : "historico"
                          }
                          tamanho={12}
                        />
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-[13.5px] font-medium text-tinta leading-snug">{a.titulo}</p>
                        {a.descricao ? (
                          <p className="text-[12.5px] text-tinta-2 mt-0.5 leading-snug">
                            {a.descricao}
                          </p>
                        ) : null}
                        <p className="text-[11px] text-tinta-3 mt-1">
                          {dataBR(a.createdAt)} · {tempoRelativo(a.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-[13px] text-tinta-3 text-center py-4">
                  Nada registrado ainda. Check-ins, pedidos e cobranças aparecem aqui.
                </p>
              )}
            </Canhoto>
          </Secao>
        </div>

        {/* ---------------- coluna lateral ---------------- */}
        <div className="space-y-4">
          {/* ROI */}
          {comissaoRecebida > 0 || distanciaBase > 0 ? (
            <Canhoto picotado className="p-4">
              <p className="rotulo mb-1">Quanto sobra deste cliente</p>
              <p
                className={`cifra text-[26px] font-medium leading-none ${
                  roi.saudavel ? "text-quitado" : "text-carimbo"
                }`}
              >
                {dinheiro(roi.resultado)}
              </p>
              <p className="text-[11.5px] text-tinta-3 mt-1.5 leading-snug">
                {roi.retornoPorReal === Infinity
                  ? "Ainda não custou nada para atender."
                  : `R$ ${roi.retornoPorReal.toFixed(2)} de comissão para cada R$ 1 de estrada.`}
              </p>

              <LinhaPicotada />

              <div className="space-y-1.5 text-[12.5px]">
                <div className="flex items-baseline gap-2">
                  <span className="text-tinta-2">Comissão recebida</span>
                  <span className="flex-1 border-b border-dotted border-papel-borda translate-y-[-3px]" />
                  <span className="cifra text-quitado">{dinheiro(roi.comissaoGerada)}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-tinta-2">Custo de atender</span>
                  <span className="flex-1 border-b border-dotted border-papel-borda translate-y-[-3px]" />
                  <span className="cifra text-carimbo">−{dinheiro(roi.custoAtendimento)}</span>
                </div>
              </div>

              {distanciaBase > 0 ? (
                <p className="text-[11px] text-tinta-3 mt-3 flex items-start gap-1.5">
                  <Icone nome="veiculo" tamanho={12} />
                  {km(distanciaBase)} da sua base · ida e volta em {visitasFeitas} visita(s)
                </p>
              ) : null}
            </Canhoto>
          ) : null}

          {/* comissões */}
          {comissoes.length > 0 ? (
            <Canhoto>
              <CanhotoTitulo titulo="Comissões geradas" icone="comissao" />
              <div className="px-4 pb-4 space-y-2">
                {comissoes.slice(0, 6).map((c) => (
                  <div key={c.id} className="flex items-center gap-2.5">
                    <span
                      className="w-1 h-7 rounded-full shrink-0"
                      style={{ background: c.representada.cor }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] text-tinta truncate">{c.descricao}</p>
                      <p className="text-[11px] text-tinta-3">{dataBR(c.vencimento)}</p>
                    </div>
                    <span
                      className={`cifra text-[12.5px] shrink-0 ${
                        c.status === "RECEBIDA"
                          ? "text-quitado"
                          : c.status === "VENCIDA"
                            ? "text-carimbo"
                            : "text-tinta-2"
                      }`}
                    >
                      {dinheiro(c.valorPrevisto)}
                    </span>
                  </div>
                ))}
              </div>
            </Canhoto>
          ) : null}

          {/* ficha */}
          <Canhoto>
            <CanhotoTitulo titulo="Ficha" icone="nota" />
            <div className="px-4 pb-4 space-y-2.5 text-[12.5px]">
              {[
                { r: "CNPJ", v: cliente.cnpj ? formatarCnpj(cliente.cnpj) : null, mono: true },
                { r: "Inscrição estadual", v: cliente.inscricaoEstadual, mono: true },
                { r: "Atividade", v: cliente.cnaeDescricao },
                { r: "Porte", v: cliente.porte },
                { r: "Contato", v: cliente.contatoNome },
                { r: "Cargo", v: cliente.contatoCargo },
                {
                  r: "Telefone",
                  v: cliente.telefone ? formatarTelefone(cliente.telefone) : null,
                  mono: true,
                },
                { r: "E-mail", v: cliente.email },
                { r: "Endereço", v: endereco(cliente) },
                { r: "Referência", v: cliente.pontoReferencia },
                { r: "Horário", v: `${cliente.horaAbre ?? "—"} às ${cliente.horaFecha ?? "—"}` },
                { r: "Origem", v: cliente.origem },
              ]
                .filter((l) => l.v)
                .map((l) => (
                  <div key={l.r}>
                    <p className="text-tinta-3 text-[11px] uppercase tracking-[0.06em]">{l.r}</p>
                    <p className={`text-tinta ${l.mono ? "cifra" : ""}`}>{l.v}</p>
                  </div>
                ))}

              {!cliente.lat || !cliente.lng ? (
                <p className="flex items-start gap-1.5 text-[12px] text-ambar bg-ambar-fundo rounded-lg px-2.5 py-2">
                  <Icone nome="alerta" tamanho={13} />
                  Sem coordenada — esse cliente não entra no roteirizador.
                </p>
              ) : null}
            </div>
          </Canhoto>

          {/* representadas */}
          {cliente.representadas.length > 0 ? (
            <Canhoto>
              <CanhotoTitulo titulo="Compra de" icone="representada" />
              <div className="px-4 pb-4 flex flex-wrap gap-1.5">
                {cliente.representadas.map((cr) => (
                  <Link key={cr.id} href={`/representadas/${cr.representadaId}`}>
                    <Etiqueta tom="neutro">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: cr.representada.cor }}
                      />
                      {cr.representada.nomeFantasia ?? cr.representada.razaoSocial}
                    </Etiqueta>
                  </Link>
                ))}
              </div>
            </Canhoto>
          ) : null}

          {cliente.observacoes ? (
            <Canhoto className="p-4 pauta">
              <p className="rotulo mb-2">Anotações</p>
              <p className="text-[13px] text-tinta-2 leading-[28px] whitespace-pre-wrap">
                {cliente.observacoes}
              </p>
            </Canhoto>
          ) : null}
        </div>
      </div>
    </div>
  );
}
