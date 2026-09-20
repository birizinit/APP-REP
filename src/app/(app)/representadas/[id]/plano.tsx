"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { excluirPlano, salvarPlano } from "@/app/actions/representadas";
import { Icone } from "@/components/icone";
import { Campo, Canhoto, CanhotoTitulo, Etiqueta, LinhaPicotada } from "@/components/ui";
import {
  calcularComissao,
  gerarParcelas,
  rotuloBase,
  rotuloGatilho,
  rotuloPeriodicidade,
  type Plano,
} from "@/lib/comissao";
import { cx, dataBR, dinheiro, num, percentual } from "@/lib/format";

export interface PlanoUI {
  id?: string;
  nome: string;
  ativo: boolean;
  padrao: boolean;
  baseCalculo: string;
  tipoFaixa: string;
  percentualPadrao: string;
  gatilho: string;
  prazoDias: string;
  periodicidade: string;
  diaPagamento: string;
  formaRecebimento: string;
  emiteNotaServico: boolean;
  impostoPercentual: string;
  descontaDevolucao: boolean;
  descontaInadimplencia: boolean;
  antecipavel: boolean;
  metaPeriodo: string;
  bonusPercentual: string;
  bonusMeta: string;
  observacoes: string;
  faixas: Array<{ rotulo: string; deValor: string; ateValor: string; percentual: string }>;
}

export const PLANO_VAZIO: PlanoUI = {
  nome: "Plano padrão",
  ativo: true,
  padrao: true,
  baseCalculo: "VALOR_LIQUIDO",
  tipoFaixa: "UNICO",
  percentualPadrao: "5",
  gatilho: "PAGAMENTO_CLIENTE",
  prazoDias: "30",
  periodicidade: "MENSAL",
  diaPagamento: "10",
  formaRecebimento: "PIX",
  emiteNotaServico: false,
  impostoPercentual: "0",
  descontaDevolucao: true,
  descontaInadimplencia: true,
  antecipavel: false,
  metaPeriodo: "",
  bonusPercentual: "",
  bonusMeta: "",
  observacoes: "",
  faixas: [
    { rotulo: "Faixa 1", deValor: "0", ateValor: "50000", percentual: "4" },
    { rotulo: "Faixa 2", deValor: "50000", ateValor: "", percentual: "5" },
  ],
};

export function EditorPlano({
  representadaId,
  inicial,
  aoFechar,
}: {
  representadaId: string;
  inicial?: PlanoUI;
  aoFechar?: () => void;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [p, setP] = useState<PlanoUI>(inicial ?? PLANO_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [valorExemplo, setValorExemplo] = useState(10000);

  function set<K extends keyof PlanoUI>(campo: K, valor: PlanoUI[K]) {
    setP((atual) => ({ ...atual, [campo]: valor }));
  }

  // ---- prévia ao vivo, com o mesmo motor que calcula os pedidos ----
  const previa = useMemo(() => {
    const plano: Plano = {
      baseCalculo: p.baseCalculo as never,
      tipoFaixa: p.tipoFaixa as never,
      percentualPadrao: num(p.percentualPadrao),
      gatilho: p.gatilho as never,
      prazoDias: Number(p.prazoDias) || 0,
      periodicidade: p.periodicidade as never,
      diaPagamento: p.diaPagamento ? Number(p.diaPagamento) : null,
      impostoPercentual: num(p.impostoPercentual),
      metaPeriodo: p.metaPeriodo ? num(p.metaPeriodo) : null,
      bonusPercentual: p.bonusPercentual ? num(p.bonusPercentual) : null,
      bonusMeta: p.bonusMeta ? num(p.bonusMeta) : null,
      faixas: p.faixas.map((f) => ({
        deValor: num(f.deValor),
        ateValor: f.ateValor ? num(f.ateValor) : null,
        percentual: num(f.percentual),
        rotulo: f.rotulo,
      })),
    };

    const pedido = {
      valorBruto: valorExemplo,
      descontoValor: 0,
      valorFrete: 0,
      valorImpostos: 0,
      valorLiquido: valorExemplo,
      data: new Date(),
      condicaoPagamento: "30/60/90",
    };

    const resultado = calcularComissao(pedido, plano, 0);
    const parcelas = gerarParcelas(pedido, plano, resultado);
    return { resultado, parcelas };
  }, [p, valorExemplo]);

  function enviar(dados: FormData) {
    setErro(null);
    dados.set("representadaId", representadaId);
    dados.set("faixas", JSON.stringify(
      p.faixas.map((f) => ({
        rotulo: f.rotulo,
        deValor: num(f.deValor),
        ateValor: f.ateValor ? num(f.ateValor) : null,
        percentual: num(f.percentual),
      })),
    ));

    iniciar(async () => {
      const r = await salvarPlano(dados);
      if (r?.erro) {
        setErro(r.erro);
        return;
      }
      aoFechar?.();
      router.refresh();
    });
  }

  return (
    <form action={enviar} className="space-y-4">
      {p.id ? <input type="hidden" name="id" value={p.id} /> : null}
      <input type="hidden" name="ativo" value={p.ativo ? "on" : "off"} />
      <input type="hidden" name="padrao" value={p.padrao ? "on" : "off"} />
      <input type="hidden" name="emiteNotaServico" value={p.emiteNotaServico ? "on" : "off"} />
      <input type="hidden" name="descontaDevolucao" value={p.descontaDevolucao ? "on" : "off"} />
      <input type="hidden" name="descontaInadimplencia" value={p.descontaInadimplencia ? "on" : "off"} />
      <input type="hidden" name="antecipavel" value={p.antecipavel ? "on" : "off"} />

      <Canhoto>
        <CanhotoTitulo
          titulo="Sobre o que incide"
          sub="A base de cálculo muda bastante o resultado"
          icone="comissao"
        />

        <div className="px-4 pb-4 space-y-3">
          <Campo rotulo="Nome do plano">
            <input
              name="nome"
              value={p.nome}
              onChange={(e) => set("nome", e.target.value)}
              className="campo"
            />
          </Campo>

          <div>
            <span className="rotulo">Base de cálculo</span>
            <div className="grid sm:grid-cols-2 gap-1.5">
              {(["VALOR_LIQUIDO", "VALOR_BRUTO", "VALOR_RECEBIDO", "MARGEM"] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => set("baseCalculo", b)}
                  className={cx(
                    "text-left px-3 py-2.5 rounded-xl border text-[12.5px] transition-colors",
                    p.baseCalculo === b
                      ? "border-caneta bg-caneta-fundo text-caneta font-semibold"
                      : "border-papel-borda text-tinta-2",
                  )}
                >
                  {rotuloBase[b]}
                </button>
              ))}
            </div>
            <input type="hidden" name="baseCalculo" value={p.baseCalculo} />
          </div>

          <div>
            <span className="rotulo">Como o percentual funciona</span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { valor: "UNICO", rotulo: "Fixo", dica: "Um percentual só" },
                { valor: "PROGRESSIVO", rotulo: "Por faixa", dica: "Sobe com o volume" },
                { valor: "POR_LINHA", rotulo: "Por produto", dica: "Cada linha, um %" },
              ].map((t) => (
                <button
                  key={t.valor}
                  type="button"
                  onClick={() => set("tipoFaixa", t.valor)}
                  className={cx(
                    "px-2 py-2.5 rounded-xl border transition-colors",
                    p.tipoFaixa === t.valor
                      ? "border-caneta bg-caneta-fundo"
                      : "border-papel-borda",
                  )}
                >
                  <span
                    className={cx(
                      "block text-[12.5px] font-semibold",
                      p.tipoFaixa === t.valor ? "text-caneta" : "text-tinta",
                    )}
                  >
                    {t.rotulo}
                  </span>
                  <span className="block text-[10.5px] text-tinta-3 mt-0.5 leading-tight">
                    {t.dica}
                  </span>
                </button>
              ))}
            </div>
            <input type="hidden" name="tipoFaixa" value={p.tipoFaixa} />
          </div>

          <Campo
            rotulo={p.tipoFaixa === "UNICO" ? "Percentual" : "Percentual padrão"}
            dica={
              p.tipoFaixa === "POR_LINHA"
                ? "Usado quando o produto não tem percentual próprio."
                : undefined
            }
          >
            <div className="relative">
              <input
                name="percentualPadrao"
                value={p.percentualPadrao}
                onChange={(e) => set("percentualPadrao", e.target.value)}
                inputMode="decimal"
                className="campo cifra pr-8"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-tinta-3 text-[14px]">
                %
              </span>
            </div>
          </Campo>

          {p.tipoFaixa === "PROGRESSIVO" ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="rotulo mb-0">Faixas por acumulado no mês</span>
                <button
                  type="button"
                  onClick={() =>
                    set("faixas", [
                      ...p.faixas,
                      {
                        rotulo: `Faixa ${p.faixas.length + 1}`,
                        deValor: p.faixas[p.faixas.length - 1]?.ateValor || "0",
                        ateValor: "",
                        percentual: "",
                      },
                    ])
                  }
                  className="text-[12px] font-semibold text-caneta flex items-center gap-1"
                >
                  <Icone nome="mais" tamanho={13} />
                  Faixa
                </button>
              </div>

              <div className="space-y-1.5">
                {p.faixas.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <input
                      value={f.deValor}
                      onChange={(e) => {
                        const copia = [...p.faixas];
                        copia[i] = { ...f, deValor: e.target.value };
                        set("faixas", copia);
                      }}
                      inputMode="decimal"
                      placeholder="de"
                      className="campo cifra text-[13px] flex-1"
                    />
                    <span className="text-tinta-3 text-[12px] shrink-0">até</span>
                    <input
                      value={f.ateValor}
                      onChange={(e) => {
                        const copia = [...p.faixas];
                        copia[i] = { ...f, ateValor: e.target.value };
                        set("faixas", copia);
                      }}
                      inputMode="decimal"
                      placeholder="sem teto"
                      className="campo cifra text-[13px] flex-1"
                    />
                    <div className="relative w-[84px] shrink-0">
                      <input
                        value={f.percentual}
                        onChange={(e) => {
                          const copia = [...p.faixas];
                          copia[i] = { ...f, percentual: e.target.value };
                          set("faixas", copia);
                        }}
                        inputMode="decimal"
                        placeholder="%"
                        className="campo cifra text-[13px] pr-6"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tinta-3 text-[12px]">
                        %
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => set("faixas", p.faixas.filter((_, x) => x !== i))}
                      className="p-2 text-tinta-3 hover:text-carimbo shrink-0"
                      aria-label="Remover faixa"
                    >
                      <Icone nome="fechar" tamanho={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Canhoto>

      <Canhoto>
        <CanhotoTitulo
          titulo="Quando você recebe"
          sub="O gatilho define a data de cada parcela"
          icone="relogio"
        />

        <div className="px-4 pb-4 space-y-3">
          <div>
            <span className="rotulo">A comissão nasce</span>
            <div className="space-y-1.5">
              {(
                ["PAGAMENTO_CLIENTE", "EMISSAO_NF", "EMISSAO_PEDIDO", "ENTREGA", "DATA_FIXA"] as const
              ).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => set("gatilho", g)}
                  className={cx(
                    "w-full text-left px-3 py-2.5 rounded-xl border text-[13px] transition-colors flex items-center gap-2.5",
                    p.gatilho === g
                      ? "border-caneta bg-caneta-fundo text-caneta font-semibold"
                      : "border-papel-borda text-tinta-2",
                  )}
                >
                  <span
                    className={cx(
                      "w-[15px] h-[15px] rounded-full border-2 shrink-0 grid place-items-center",
                      p.gatilho === g ? "border-caneta" : "border-papel-borda",
                    )}
                  >
                    {p.gatilho === g ? <span className="w-2 h-2 rounded-full bg-caneta" /> : null}
                  </span>
                  {rotuloGatilho[g]}
                </button>
              ))}
            </div>
            <input type="hidden" name="gatilho" value={p.gatilho} />
            {p.gatilho === "PAGAMENTO_CLIENTE" ? (
              <p className="text-[11.5px] text-tinta-3 mt-2 leading-snug">
                Um pedido 30/60/90 vira três comissões, cada uma vencendo junto com a parcela do
                cliente.
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Campo rotulo="Prazo depois" dica="dias">
              <input
                name="prazoDias"
                value={p.prazoDias}
                onChange={(e) => set("prazoDias", e.target.value)}
                inputMode="numeric"
                className="campo cifra"
              />
            </Campo>
            <Campo rotulo="Periodicidade">
              <select
                name="periodicidade"
                value={p.periodicidade}
                onChange={(e) => set("periodicidade", e.target.value)}
                className="campo"
              >
                {(["POR_PEDIDO", "SEMANAL", "QUINZENAL", "MENSAL", "BIMESTRAL"] as const).map((x) => (
                  <option key={x} value={x}>
                    {rotuloPeriodicidade[x]}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Paga no dia" dica="do mês">
              <input
                name="diaPagamento"
                value={p.diaPagamento}
                onChange={(e) => set("diaPagamento", e.target.value)}
                inputMode="numeric"
                placeholder="10"
                className="campo cifra"
              />
            </Campo>
            <Campo rotulo="Forma">
              <select
                name="formaRecebimento"
                value={p.formaRecebimento}
                onChange={(e) => set("formaRecebimento", e.target.value)}
                className="campo"
              >
                <option value="PIX">PIX</option>
                <option value="TED">TED</option>
                <option value="BOLETO">Boleto</option>
                <option value="DEPOSITO">Depósito</option>
                <option value="NOTA_SERVICO">Nota de serviço</option>
                <option value="DINHEIRO">Dinheiro</option>
              </select>
            </Campo>
          </div>

          <div className="space-y-2">
            {[
              {
                campo: "emiteNotaServico" as const,
                titulo: "Preciso emitir nota de serviço",
                dica: "Marque se a representada só paga contra NFS-e.",
              },
              {
                campo: "descontaInadimplencia" as const,
                titulo: "Perco a comissão se o cliente não pagar",
                dica: "O padrão na maioria dos contratos.",
              },
              {
                campo: "descontaDevolucao" as const,
                titulo: "Devolução estorna a comissão",
                dica: "",
              },
              {
                campo: "antecipavel" as const,
                titulo: "Dá para antecipar",
                dica: "Algumas fábricas adiantam mediante desconto.",
              },
            ].map((o) => (
              <label key={o.campo} className="flex items-start gap-2.5 text-[13px] text-tinta-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={p[o.campo]}
                  onChange={(e) => set(o.campo, e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-[var(--color-caneta)]"
                />
                <span>
                  {o.titulo}
                  {o.dica ? (
                    <span className="block text-[11.5px] text-tinta-3">{o.dica}</span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>

          <Campo
            rotulo="Imposto retido (%)"
            dica="ISS/IRRF que a fábrica retém antes de te pagar."
          >
            <div className="relative">
              <input
                name="impostoPercentual"
                value={p.impostoPercentual}
                onChange={(e) => set("impostoPercentual", e.target.value)}
                inputMode="decimal"
                className="campo cifra pr-8"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-tinta-3 text-[14px]">
                %
              </span>
            </div>
          </Campo>
        </div>
      </Canhoto>

      <Canhoto>
        <CanhotoTitulo titulo="Bônus por meta" sub="Opcional" icone="alvo" />
        <div className="px-4 pb-4 grid grid-cols-3 gap-3">
          <Campo rotulo="Meta do mês">
            <input
              name="metaPeriodo"
              value={p.metaPeriodo}
              onChange={(e) => set("metaPeriodo", e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
              className="campo cifra"
            />
          </Campo>
          <Campo rotulo="Bônus (%)">
            <input
              name="bonusPercentual"
              value={p.bonusPercentual}
              onChange={(e) => set("bonusPercentual", e.target.value)}
              inputMode="decimal"
              className="campo cifra"
            />
          </Campo>
          <Campo rotulo="Bônus fixo">
            <input
              name="bonusMeta"
              value={p.bonusMeta}
              onChange={(e) => set("bonusMeta", e.target.value)}
              inputMode="decimal"
              className="campo cifra"
            />
          </Campo>
        </div>
      </Canhoto>

      {/* ---------------- prévia ---------------- */}
      <Canhoto picotado className="p-4 bg-[color-mix(in_oklab,var(--color-caneta)_4%,transparent)]">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="rotulo mb-0">Simulação</p>
          <div className="flex gap-1">
            {[5000, 10000, 30000, 80000].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setValorExemplo(v)}
                className={cx(
                  "etiqueta transition-colors",
                  valorExemplo === v
                    ? "bg-caneta text-white border-caneta"
                    : "border-papel-borda text-tinta-3",
                )}
              >
                {v / 1000}k
              </button>
            ))}
          </div>
        </div>

        <p className="text-[13px] text-tinta-2 leading-relaxed">
          Num pedido de <span className="cifra text-tinta">{dinheiro(valorExemplo)}</span> em 30/60/90,
          você ganha{" "}
          <span className="cifra text-quitado font-medium">
            {dinheiro(previa.resultado.valorBruto)}
          </span>{" "}
          ({percentual(previa.resultado.percentual)})
          {num(p.impostoPercentual) > 0 ? (
            <>
              , e depois do imposto sobram{" "}
              <span className="cifra text-tinta font-medium">
                {dinheiro(previa.resultado.valorLiquido)}
              </span>
            </>
          ) : null}
          .
        </p>

        <LinhaPicotada rotulo="quando cai" />

        <ul className="space-y-1.5">
          {previa.parcelas.map((parcela) => (
            <li key={parcela.parcela} className="flex items-baseline gap-2 text-[12.5px]">
              <span className="text-tinta-2">
                {previa.parcelas.length > 1 ? `Parcela ${parcela.parcela}` : "Parcela única"}
              </span>
              <span className="flex-1 border-b border-dotted border-papel-borda translate-y-[-3px]" />
              <span className="text-tinta-3">{dataBR(parcela.vencimento)}</span>
              <span className="cifra text-tinta w-[86px] text-right">
                {dinheiro(parcela.valorLiquido)}
              </span>
            </li>
          ))}
        </ul>
      </Canhoto>

      <Canhoto className="p-4">
        <Campo rotulo="Observações do acerto">
          <textarea
            name="observacoes"
            value={p.observacoes}
            onChange={(e) => set("observacoes", e.target.value)}
            rows={2}
            className="campo resize-none"
            placeholder="O que ficou combinado por fora do contrato."
          />
        </Campo>

        <label className="flex items-center gap-2.5 text-[13px] text-tinta-2 cursor-pointer mt-3">
          <input
            type="checkbox"
            checked={p.padrao}
            onChange={(e) => set("padrao", e.target.checked)}
            className="w-4 h-4 accent-[var(--color-caneta)]"
          />
          Usar este plano por padrão nos novos pedidos
        </label>
      </Canhoto>

      {erro ? (
        <p className="flex items-center gap-2 text-[13px] text-carimbo bg-carimbo-fundo rounded-xl px-3 py-2.5">
          <Icone nome="alerta" tamanho={15} />
          {erro}
        </p>
      ) : null}

      <div className="flex gap-2">
        {aoFechar ? (
          <button type="button" onClick={aoFechar} className="botao botao-papel flex-1">
            Cancelar
          </button>
        ) : null}
        <button type="submit" disabled={pendente} className="botao botao-tinta flex-[2]">
          {pendente ? "Salvando..." : p.id ? "Salvar plano" : "Criar plano"}
        </button>
      </div>

      {p.id ? (
        <button
          type="button"
          onClick={() =>
            iniciar(async () => {
              const r = await excluirPlano(p.id!);
              if (r?.erro) {
                setErro(r.erro);
                return;
              }
              aoFechar?.();
              router.refresh();
            })
          }
          className="botao botao-fantasma w-full text-[12.5px] text-carimbo"
        >
          <Icone nome="lixeira" tamanho={14} />
          Excluir plano
        </button>
      ) : null}
    </form>
  );
}
