"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { calcularPrevia, salvarRota, type PreviaRota } from "@/app/actions/rotas";
import { Icone } from "@/components/icone";
import { MapaRota } from "@/components/mapa";
import { Campo, Canhoto, Carimbo, Etiqueta, SeloCurva } from "@/components/ui";
import { cx, dinheiro, duracao, hora, km, litros, tempoRelativo } from "@/lib/format";

type Modo = "RAPIDO" | "ECONOMICO" | "EQUILIBRADO";

interface ClienteOpcao {
  id: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  curva: "A" | "B" | "C" | "D";
  status: string;
  lat: number | null;
  lng: number | null;
  regiao: string | null;
  regiaoCor: string | null;
  tempoVisitaMin: number;
  ultimaVisitaEm: string | null;
  frequenciaVisitaDias: number;
}

const MODOS: Array<{ valor: Modo; rotulo: string; icone: "raio" | "folha" | "balanca"; frase: string }> = [
  { valor: "RAPIDO", rotulo: "Mais rápido", icone: "raio", frase: "Chega antes, gasta mais" },
  { valor: "ECONOMICO", rotulo: "Mais barato", icone: "folha", frase: "Menos km, leva mais tempo" },
  { valor: "EQUILIBRADO", rotulo: "Equilibrado", icone: "balanca", frase: "Melhor custo por hora" },
];

export function MontadorRota({
  dataInicial,
  preSelecionados,
  semBase,
  base,
  jornada,
  veiculos,
  clientes,
}: {
  dataInicial: string;
  preSelecionados: string[];
  semBase: boolean;
  base: { label: string; lat: number | null; lng: number | null };
  jornada: { inicio: string; fim: string };
  veiculos: Array<{
    id: string;
    apelido: string;
    combustivel: string;
    flex: boolean;
    consumoCidade: number;
    padrao: boolean;
  }>;
  clientes: ClienteOpcao[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  const [data, setData] = useState(dataInicial);
  const [vehicleId, setVehicleId] = useState(veiculos.find((v) => v.padrao)?.id ?? veiculos[0]?.id ?? "");
  const [escolhidos, setEscolhidos] = useState<string[]>(preSelecionados);
  const [busca, setBusca] = useState("");
  const [regiaoFiltro, setRegiaoFiltro] = useState("");
  const [retornaBase, setRetornaBase] = useState(true);
  const [criarAgenda, setCriarAgenda] = useState(true);

  const [comparativo, setComparativo] = useState<Partial<Record<Modo, PreviaRota>> | null>(null);
  const [modoEscolhido, setModoEscolhido] = useState<Modo>("EQUILIBRADO");
  const [erro, setErro] = useState<string | null>(null);
  const [nome, setNome] = useState("");

  const regioes = useMemo(
    () => [...new Set(clientes.map((c) => c.regiao).filter(Boolean))] as string[],
    [clientes],
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return clientes.filter((c) => {
      if (regiaoFiltro && c.regiao !== regiaoFiltro) return false;
      if (!termo) return true;
      return (
        c.nome.toLowerCase().includes(termo) ||
        (c.cidade ?? "").toLowerCase().includes(termo)
      );
    });
  }, [busca, clientes, regiaoFiltro]);

  const selecionados = useMemo(
    () => escolhidos.map((id) => clientes.find((c) => c.id === id)).filter(Boolean) as ClienteOpcao[],
    [escolhidos, clientes],
  );

  const semCoordenada = selecionados.filter((c) => !c.lat || !c.lng).length;
  const previa = comparativo?.[modoEscolhido]?.previa;

  function alternar(id: string) {
    setComparativo(null);
    setEscolhidos((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    );
  }

  /** Preenche com quem está mais atrasado na região filtrada. */
  function sugerir() {
    const candidatos = clientes
      .filter((c) => c.lat && c.lng)
      .filter((c) => !regiaoFiltro || c.regiao === regiaoFiltro)
      .map((c) => {
        const dias = c.ultimaVisitaEm
          ? Math.floor((Date.now() - new Date(c.ultimaVisitaEm).getTime()) / 86_400_000)
          : 999;
        const atraso = dias - c.frequenciaVisitaDias;
        const peso = { A: 3, B: 2, C: 1.2, D: 0.8 }[c.curva];
        return { id: c.id, prioridade: atraso * peso };
      })
      .sort((a, b) => b.prioridade - a.prioridade)
      .slice(0, 8)
      .map((c) => c.id);

    setComparativo(null);
    setEscolhidos(candidatos);
  }

  function calcular() {
    setErro(null);
    iniciar(async () => {
      const modos: Modo[] = ["RAPIDO", "ECONOMICO", "EQUILIBRADO"];
      const resultados = await Promise.all(
        modos.map((modo) =>
          calcularPrevia({
            clienteIds: escolhidos,
            data,
            modo,
            vehicleId,
            retornaBase,
          }),
        ),
      );

      const mapa: Partial<Record<Modo, PreviaRota>> = {};
      modos.forEach((modo, i) => {
        mapa[modo] = resultados[i];
      });

      const primeiro = resultados.find((r) => !r.ok);
      if (primeiro && !resultados.some((r) => r.ok)) {
        setErro(primeiro.erro ?? "Não consegui calcular a rota.");
        return;
      }

      setComparativo(mapa);

      // escolhe sozinho o de menor custo total
      const melhor = modos
        .filter((m) => mapa[m]?.previa)
        .sort((a, b) => (mapa[a]!.previa!.custoTotal ?? 0) - (mapa[b]!.previa!.custoTotal ?? 0))[0];
      if (melhor) setModoEscolhido(melhor);
    });
  }

  function salvar() {
    if (!previa) return;
    iniciar(async () => {
      const r = await salvarRota({
        nome: nome || undefined,
        data,
        modo: modoEscolhido,
        vehicleId,
        retornaBase,
        criarAgenda,
        previa,
      });
      if (r.ok) {
        router.push(`/rotas/${r.id}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="escala">
      <header className="flex items-start justify-between gap-4 mb-5">
        <div>
          <Link href="/rotas" className="text-[12.5px] text-tinta-3 flex items-center gap-1 mb-1.5">
            <Icone nome="setaEsquerda" tamanho={13} />
            Rotas
          </Link>
          <h1 className="text-[27px] sm:text-[32px] tracking-[-0.04em] text-tinta">Montar rota</h1>
        </div>
      </header>

      {semBase ? (
        <Canhoto className="p-4 mb-4 flex items-start gap-3 border-l-[3px] border-l-[var(--color-carimbo)]">
          <span className="text-carimbo shrink-0 mt-0.5">
            <Icone nome="alerta" tamanho={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-tinta">Cadastre sua base primeiro</p>
            <p className="text-[12.5px] text-tinta-3 mt-0.5">
              Sem o ponto de partida não dá para calcular quilometragem nem custo.
            </p>
          </div>
          <Link href="/ajustes#base" className="botao botao-papel shrink-0 text-[13px]">
            Ir para Ajustes
          </Link>
        </Canhoto>
      ) : null}

      <div className="grid lg:grid-cols-[1fr_400px] gap-4 items-start">
        {/* ============ coluna esquerda: seleção ============ */}
        <div className="space-y-4">
          <Canhoto className="p-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <Campo rotulo="Dia da rota">
                <input
                  type="date"
                  value={data}
                  onChange={(e) => {
                    setData(e.target.value);
                    setComparativo(null);
                  }}
                  className="campo"
                />
              </Campo>
              <Campo rotulo="Veículo">
                <select
                  value={vehicleId}
                  onChange={(e) => {
                    setVehicleId(e.target.value);
                    setComparativo(null);
                  }}
                  className="campo"
                >
                  {veiculos.length === 0 ? <option value="">Nenhum cadastrado</option> : null}
                  {veiculos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.apelido} · {v.consumoCidade} km/l
                    </option>
                  ))}
                </select>
              </Campo>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-3">
              <label className="flex items-center gap-2 text-[13px] text-tinta-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={retornaBase}
                  onChange={(e) => {
                    setRetornaBase(e.target.checked);
                    setComparativo(null);
                  }}
                  className="w-4 h-4 accent-[var(--color-caneta)]"
                />
                Volto para a base no fim
              </label>
              <label className="flex items-center gap-2 text-[13px] text-tinta-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={criarAgenda}
                  onChange={(e) => setCriarAgenda(e.target.checked)}
                  className="w-4 h-4 accent-[var(--color-caneta)]"
                />
                Criar os compromissos na agenda
              </label>
            </div>

            <p className="text-[11.5px] text-tinta-3 mt-3 flex items-center gap-1.5">
              <Icone nome="dia" tamanho={12} />
              Saindo de {base.label} às {jornada.inicio}
            </p>
          </Canhoto>

          {/* seleção de clientes */}
          <Canhoto className="overflow-hidden">
            <div className="p-3.5 pb-2.5 border-b border-papel-borda">
              <div className="flex items-center gap-2 mb-2.5">
                <h2 className="text-[15px] flex-1">
                  Paradas
                  {escolhidos.length > 0 ? (
                    <span className="text-tinta-3 font-normal"> · {escolhidos.length} escolhidas</span>
                  ) : null}
                </h2>
                <button
                  type="button"
                  onClick={sugerir}
                  className="botao botao-papel text-[12.5px] px-2.5 py-1.5"
                >
                  <Icone nome="alvo" tamanho={14} />
                  Sugerir
                </button>
                {escolhidos.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEscolhidos([]);
                      setComparativo(null);
                    }}
                    className="botao botao-fantasma text-[12.5px] px-2 py-1.5"
                  >
                    Limpar
                  </button>
                ) : null}
              </div>

              <div className="relative mb-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tinta-3">
                  <Icone nome="busca" tamanho={16} />
                </span>
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar cliente ou cidade"
                  className="campo pl-9"
                />
              </div>

              {regioes.length > 0 ? (
                <div className="flex gap-1.5 overflow-x-auto sem-barra -mx-1 px-1 pb-0.5">
                  <button
                    type="button"
                    onClick={() => setRegiaoFiltro("")}
                    className={cx(
                      "etiqueta shrink-0 transition-colors",
                      regiaoFiltro === ""
                        ? "bg-caneta text-white border-caneta"
                        : "border-papel-borda text-tinta-3",
                    )}
                  >
                    Todas
                  </button>
                  {regioes.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRegiaoFiltro(r === regiaoFiltro ? "" : r)}
                      className={cx(
                        "etiqueta shrink-0 transition-colors",
                        regiaoFiltro === r
                          ? "bg-caneta text-white border-caneta"
                          : "border-papel-borda text-tinta-3",
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="max-h-[44vh] overflow-y-auto sem-barra divide-y divide-[var(--color-papel-borda)]">
              {filtrados.map((c) => {
                const on = escolhidos.includes(c.id);
                const posicao = escolhidos.indexOf(c.id) + 1;
                const semGeo = !c.lat || !c.lng;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => alternar(c.id)}
                    disabled={semGeo}
                    className={cx(
                      "w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors",
                      on ? "bg-caneta-fundo" : "active:bg-[color-mix(in_oklab,var(--color-tinta)_5%,transparent)]",
                      semGeo && "opacity-45 cursor-not-allowed",
                    )}
                  >
                    <span
                      className={cx(
                        "w-[22px] h-[22px] rounded-lg border-2 grid place-items-center shrink-0 text-[11px] font-bold",
                        on ? "bg-caneta border-caneta text-white" : "border-papel-borda",
                      )}
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {on ? posicao : ""}
                    </span>

                    <SeloCurva curva={c.curva} tamanho={20} />

                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-medium text-tinta truncate">
                        {c.nome}
                      </span>
                      <span className="block text-[11.5px] text-tinta-3 truncate">
                        {semGeo
                          ? "Sem endereço no mapa — não entra na rota"
                          : `${c.cidade ?? "—"}${c.uf ? `/${c.uf}` : ""} · visita ${tempoRelativo(c.ultimaVisitaEm)}`}
                      </span>
                    </span>

                    {c.regiaoCor ? (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: c.regiaoCor }}
                        title={c.regiao ?? ""}
                      />
                    ) : null}
                  </button>
                );
              })}

              {filtrados.length === 0 ? (
                <p className="px-4 py-8 text-center text-[13px] text-tinta-3">
                  Nenhum cliente encontrado com esse filtro.
                </p>
              ) : null}
            </div>

            {semCoordenada > 0 ? (
              <p className="px-3.5 py-2.5 text-[12px] text-ambar bg-ambar-fundo border-t border-papel-borda">
                {semCoordenada} cliente(s) selecionados não têm coordenada e ficarão de fora.
              </p>
            ) : null}
          </Canhoto>
        </div>

        {/* ============ coluna direita: cálculo ============ */}
        <div className="space-y-4 lg:sticky lg:top-6">
          {!comparativo ? (
            <Canhoto className="p-5 text-center">
              <span className="inline-flex w-12 h-12 rounded-2xl bg-caneta-fundo text-caneta items-center justify-center mb-3">
                <Icone nome="bussola" tamanho={24} />
              </span>
              <p className="text-[15px] text-tinta mb-1">
                {escolhidos.length === 0
                  ? "Escolha as paradas"
                  : `${escolhidos.length} paradas prontas`}
              </p>
              <p className="text-[12.5px] text-tinta-3 leading-relaxed mb-4">
                Vou calcular os três modos de uma vez e mostrar a diferença em quilômetro, tempo e
                reais.
              </p>
              <button
                type="button"
                onClick={calcular}
                disabled={pendente || escolhidos.length === 0 || semBase}
                className="botao botao-tinta w-full"
              >
                {pendente ? (
                  <>
                    <span className="anim-rodar">
                      <Icone nome="atualizar" tamanho={16} />
                    </span>
                    Calculando...
                  </>
                ) : (
                  <>
                    <Icone nome="rota" tamanho={16} />
                    Calcular rota
                  </>
                )}
              </button>
              {erro ? (
                <p className="mt-3 text-[12.5px] text-carimbo bg-carimbo-fundo rounded-xl px-3 py-2.5 text-left">
                  {erro}
                </p>
              ) : null}
            </Canhoto>
          ) : (
            <>
              {/* comparativo dos 3 modos */}
              <Canhoto className="overflow-hidden">
                <div className="px-4 pt-3.5 pb-2">
                  <h2 className="text-[15px]">Qual prefere?</h2>
                  <p className="text-[12px] text-tinta-3 mt-0.5">
                    Mesmas paradas, ordens diferentes.
                  </p>
                </div>

                <div className="p-2 space-y-1.5">
                  {MODOS.map((m) => {
                    const dados = comparativo[m.valor]?.previa;
                    if (!dados) return null;
                    const on = modoEscolhido === m.valor;
                    const melhorCusto = Math.min(
                      ...MODOS.map((x) => comparativo[x.valor]?.previa?.custoTotal ?? Infinity),
                    );
                    const melhorTempo = Math.min(
                      ...MODOS.map((x) => comparativo[x.valor]?.previa?.duracaoMin ?? Infinity),
                    );

                    return (
                      <button
                        key={m.valor}
                        type="button"
                        onClick={() => setModoEscolhido(m.valor)}
                        className={cx(
                          "w-full text-left px-3 py-2.5 rounded-xl border transition-colors",
                          on ? "border-caneta bg-caneta-fundo" : "border-papel-borda",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className={on ? "text-caneta" : "text-tinta-3"}>
                            <Icone nome={m.icone} tamanho={16} />
                          </span>
                          <span className="text-[13.5px] font-semibold text-tinta flex-1">
                            {m.rotulo}
                          </span>
                          {dados.custoTotal === melhorCusto ? (
                            <Etiqueta tom="quitado">mais barato</Etiqueta>
                          ) : null}
                          {dados.duracaoMin === melhorTempo && dados.custoTotal !== melhorCusto ? (
                            <Etiqueta tom="ambar">mais rápido</Etiqueta>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 pl-6 text-[12px] text-tinta-2">
                          <span className="cifra">{km(dados.distanciaKm)}</span>
                          <span className="cifra">{duracao(dados.duracaoMin)}</span>
                          <span className="cifra font-medium text-tinta">
                            {dinheiro(dados.custoTotal)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Canhoto>

              {previa ? (
                <>
                  {/* mapa */}
                  <Canhoto className="p-2.5">
                    <MapaRota
                      altura={240}
                      polyline={previa.polyline}
                      pontos={[
                        ...(base.lat && base.lng
                          ? [{ lat: base.lat, lng: base.lng, label: base.label, tipo: "base" as const }]
                          : []),
                        ...previa.paradas.map((p) => ({
                          lat: p.lat,
                          lng: p.lng,
                          label: p.label,
                          ordem: p.ordem,
                          tipo: "parada" as const,
                        })),
                      ]}
                    />
                  </Canhoto>

                  {/* custo detalhado */}
                  <Canhoto picotado className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="rotulo mb-1">Custo do dia</p>
                        <p className="cifra text-[30px] text-tinta font-medium leading-none">
                          {dinheiro(previa.custoTotal)}
                        </p>
                      </div>
                      {previa.reaisEconomizados > 0 ? (
                        <div className="text-right shrink-0">
                          <Carimbo tom="quitado">
                            −{dinheiro(previa.reaisEconomizados)}
                          </Carimbo>
                          <p className="text-[10.5px] text-tinta-3 mt-1.5">
                            {km(previa.kmEconomizados)} a menos
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-1.5 text-[12.5px]">
                      {[
                        {
                          r: `Combustível (${litros(previa.litros)} de ${previa.combustivel.toLowerCase()})`,
                          v: previa.custoCombustivel,
                        },
                        { r: "Manutenção e desgaste", v: previa.custoManutencao },
                        ...(previa.custoPedagio > 0 ? [{ r: "Pedágio", v: previa.custoPedagio }] : []),
                      ].map((l) => (
                        <div key={l.r} className="flex items-baseline gap-2">
                          <span className="text-tinta-2">{l.r}</span>
                          <span className="flex-1 border-b border-dotted border-papel-borda translate-y-[-3px]" />
                          <span className="cifra text-tinta">{dinheiro(l.v)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="linha-picotada my-3" />

                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { r: "Distância", v: km(previa.distanciaKm) },
                        { r: "Tempo", v: duracao(previa.duracaoMin) },
                        { r: "Por km", v: dinheiro(previa.custoPorKm) },
                      ].map((m) => (
                        <div key={m.r}>
                          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-tinta-3">
                            {m.r}
                          </p>
                          <p className="cifra text-[14px] text-tinta mt-0.5">{m.v}</p>
                        </div>
                      ))}
                    </div>

                    {previa.dicaCombustivel ? (
                      <p className="mt-3 flex items-start gap-2 text-[12px] text-ambar bg-ambar-fundo rounded-xl px-3 py-2.5">
                        <span className="shrink-0 mt-px">
                          <Icone nome="combustivel" tamanho={14} />
                        </span>
                        {previa.dicaCombustivel}
                      </p>
                    ) : null}

                    {previa.estouraJornada ? (
                      <p className="mt-2 flex items-start gap-2 text-[12px] text-carimbo bg-carimbo-fundo rounded-xl px-3 py-2.5">
                        <span className="shrink-0 mt-px">
                          <Icone nome="relogio" tamanho={14} />
                        </span>
                        A última parada termina às {hora(previa.horaFim)} — passa do seu horário de
                        trabalho. Considere tirar uma visita.
                      </p>
                    ) : null}

                    {previa.provider === "haversine" ? (
                      <p className="mt-2 text-[11.5px] text-tinta-3 flex items-start gap-1.5">
                        <Icone nome="alerta" tamanho={12} />
                        Sem resposta do serviço de mapas: distâncias estimadas em linha reta com
                        ajuste de malha urbana.
                      </p>
                    ) : null}
                  </Canhoto>

                  {/* ordem final */}
                  <Canhoto className="p-4">
                    <p className="rotulo mb-2.5">Ordem das paradas</p>
                    <ol className="space-y-2">
                      {previa.paradas.map((p) => (
                        <li key={`${p.clientId}-${p.ordem}`} className="flex items-center gap-2.5">
                          <span
                            className="w-[22px] h-[22px] rounded-full bg-caneta text-white grid place-items-center text-[11px] font-bold shrink-0"
                            style={{ fontFamily: "var(--font-display)" }}
                          >
                            {p.ordem}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-medium text-tinta truncate">
                              {p.label}
                            </span>
                            <span className="block text-[11px] text-tinta-3">
                              chega {hora(p.chegadaPrevista)} · {km(p.distanciaAnteriorKm)}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  </Canhoto>

                  <Canhoto className="p-4">
                    <Campo rotulo="Nome da rota" dica="Deixe vazio para usar a data.">
                      <input
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder={`Rota de ${new Date(`${data}T12:00`).toLocaleDateString("pt-BR")}`}
                        className="campo"
                      />
                    </Campo>

                    <div className="flex gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => setComparativo(null)}
                        className="botao botao-papel flex-1"
                      >
                        Refazer
                      </button>
                      <button
                        type="button"
                        onClick={salvar}
                        disabled={pendente}
                        className="botao botao-tinta flex-1"
                      >
                        {pendente ? "Salvando..." : "Salvar rota"}
                      </button>
                    </div>
                  </Canhoto>
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
