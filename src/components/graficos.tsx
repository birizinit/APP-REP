"use client";

import { useId, useState } from "react";

import { Icone } from "@/components/icone";
import { cx, dinheiro, dinheiroCurto, mesAno, numeroBR } from "@/lib/format";

/**
 * Graficos em SVG inline. Paleta validada para contraste e daltonismo
 * nos dois temas; como o par azul/vermelho fica no piso em tritanopia,
 * toda serie carrega legenda + rotulo direto, nunca so a cor.
 */

const CORES = {
  recebido: "var(--color-graf-recebido)",
  receber: "var(--color-graf-receber)",
  vencido: "var(--color-graf-vencido)",
} as const;

// ==================================================================
// Fluxo de caixa — barras empilhadas por competência
// ==================================================================

export interface PontoFluxo {
  competencia: string;
  previsto: number;
  recebido: number;
  vencido: number;
}

export function BarrasFluxo({
  dados,
  altura = 168,
}: {
  dados: PontoFluxo[];
  altura?: number;
}) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const [tabela, setTabela] = useState(false);

  if (dados.length === 0) return null;

  const series = dados.map((d) => {
    const recebido = Math.max(0, d.recebido);
    const vencido = Math.max(0, d.vencido);
    const aReceber = Math.max(0, d.previsto - recebido - vencido);
    return { ...d, aReceber, recebido, vencido, total: recebido + vencido + aReceber };
  });

  const teto = Math.max(...series.map((s) => s.total), 1);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <Legenda
          itens={[
            { rotulo: "Recebido", cor: CORES.recebido },
            { rotulo: "A receber", cor: CORES.receber },
            { rotulo: "Vencido", cor: CORES.vencido },
          ]}
        />
        <button
          type="button"
          onClick={() => setTabela((v) => !v)}
          className="text-[11px] font-semibold text-tinta-3 hover:text-tinta flex items-center gap-1 shrink-0"
          aria-pressed={tabela}
        >
          <Icone nome={tabela ? "grafico" : "planilha"} tamanho={13} />
          {tabela ? "Gráfico" : "Tabela"}
        </button>
      </div>

      {tabela ? (
        <TabelaFluxo series={series} />
      ) : (
        <div>
          {/* Barras em HTML: SVG com preserveAspectRatio="none" distorce
              o raio dos cantos e as barras viram cápsulas. */}
          <div className="relative" style={{ height: altura }}>
            {[0.25, 0.5, 0.75, 1].map((f) => (
              <div
                key={f}
                className="absolute inset-x-0 border-t"
                style={{
                  bottom: `${f * 100}%`,
                  borderColor: "var(--color-graf-grade)",
                }}
              />
            ))}

            <div className="absolute inset-0 flex items-end">
              {series.map((s, i) => {
                const segmentos = [
                  { chave: "vencido", valor: s.vencido, cor: CORES.vencido },
                  { chave: "receber", valor: s.aReceber, cor: CORES.receber },
                  { chave: "recebido", valor: s.recebido, cor: CORES.recebido },
                ].filter((seg) => seg.valor > 0);

                return (
                  <button
                    key={s.competencia}
                    type="button"
                    onMouseEnter={() => setAtivo(i)}
                    onMouseLeave={() => setAtivo(null)}
                    onFocus={() => setAtivo(i)}
                    onBlur={() => setAtivo(null)}
                    onClick={() => setAtivo(ativo === i ? null : i)}
                    aria-label={`${mesAno(s.competencia)}: ${dinheiro(s.total)}`}
                    className="flex-1 h-full flex flex-col justify-end items-center px-1 outline-none group"
                  >
                    <div
                      className="w-full max-w-[26px] flex flex-col justify-end gap-[2px] transition-opacity"
                      style={{
                        height: `${(s.total / teto) * 100}%`,
                        opacity: ativo === null || ativo === i ? 1 : 0.35,
                      }}
                    >
                      {segmentos.map((seg, k) => (
                        <div
                          key={seg.chave}
                          style={{
                            height: `${(seg.valor / Math.max(s.total, 1)) * 100}%`,
                            minHeight: 3,
                            background: seg.cor,
                            borderRadius:
                              segmentos.length === 1
                                ? "4px"
                                : k === 0
                                  ? "4px 4px 2px 2px"
                                  : k === segmentos.length - 1
                                    ? "2px 2px 4px 4px"
                                    : "2px",
                          }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex mt-1.5">
            {series.map((s, i) => (
              <div key={s.competencia} className="flex-1 text-center">
                <span
                  className={cx(
                    "text-[10px] font-semibold tracking-tight transition-colors",
                    ativo === i ? "text-tinta" : "text-tinta-3",
                  )}
                >
                  {mesAno(s.competencia)}
                </span>
              </div>
            ))}
          </div>

          {/* valor direto do mês em foco */}
          <div className="mt-2.5 min-h-[34px]">
            {ativo !== null ? (
              <div className="anim-surgir">
                <p className="text-[11px] text-tinta-3 mb-0.5">{mesAno(series[ativo].competencia)}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px]">
                  {series[ativo].recebido > 0 ? (
                    <Valor cor={CORES.recebido} rotulo="Recebido" valor={series[ativo].recebido} />
                  ) : null}
                  {series[ativo].aReceber > 0 ? (
                    <Valor cor={CORES.receber} rotulo="A receber" valor={series[ativo].aReceber} />
                  ) : null}
                  {series[ativo].vencido > 0 ? (
                    <Valor cor={CORES.vencido} rotulo="Vencido" valor={series[ativo].vencido} />
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-[11.5px] text-tinta-3">
                Total previsto de {dinheiro(series.reduce((s, d) => s + d.total, 0))} nos próximos{" "}
                {series.length} meses.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Valor({ cor, rotulo, valor }: { cor: string; rotulo: string; valor: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-tinta-2">
      <span className="w-2 h-2 rounded-[2px] shrink-0" style={{ background: cor }} />
      {rotulo}
      <span className="cifra text-tinta font-medium">{dinheiro(valor)}</span>
    </span>
  );
}

function Legenda({ itens }: { itens: Array<{ rotulo: string; cor: string }> }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {itens.map((i) => (
        <span key={i.rotulo} className="inline-flex items-center gap-1.5 text-[11px] text-tinta-3">
          <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: i.cor }} />
          {i.rotulo}
        </span>
      ))}
    </div>
  );
}

function TabelaFluxo({ series }: { series: Array<PontoFluxo & { aReceber: number; total: number }> }) {
  return (
    <div className="overflow-x-auto sem-barra -mx-1">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-tinta-3 text-left">
            <th className="font-semibold py-1.5 px-1">Mês</th>
            <th className="font-semibold py-1.5 px-1 text-right">Recebido</th>
            <th className="font-semibold py-1.5 px-1 text-right">A receber</th>
            <th className="font-semibold py-1.5 px-1 text-right">Vencido</th>
          </tr>
        </thead>
        <tbody>
          {series.map((s) => (
            <tr key={s.competencia} className="border-t border-papel-borda">
              <td className="py-1.5 px-1 text-tinta-2">{mesAno(s.competencia)}</td>
              <td className="py-1.5 px-1 text-right cifra">{dinheiroCurto(s.recebido)}</td>
              <td className="py-1.5 px-1 text-right cifra">{dinheiroCurto(s.aReceber)}</td>
              <td className="py-1.5 px-1 text-right cifra text-carimbo">
                {s.vencido > 0 ? dinheiroCurto(s.vencido) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ==================================================================
// Sparkline — histórico de compra de um cliente
// ==================================================================

export function Sparkline({
  valores,
  rotulos,
  altura = 42,
  cor = "var(--color-caneta)",
}: {
  valores: number[];
  rotulos?: string[];
  altura?: number;
  cor?: string;
}) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const id = useId();

  if (valores.length < 2) return null;

  const teto = Math.max(...valores, 1);
  const passo = 100 / (valores.length - 1);
  const y = (v: number) => altura - 4 - (v / teto) * (altura - 10);

  const pontos = valores.map((v, i) => [i * passo, y(v)] as const);
  const caminho = pontos.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const area = `${caminho} L100,${altura} L0,${altura} Z`;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 100 ${altura}`}
        preserveAspectRatio="none"
        className="w-full block"
        style={{ height: altura }}
        role="img"
        aria-label="Histórico de compras"
        onMouseLeave={() => setAtivo(null)}
      >
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cor} stopOpacity="0.22" />
            <stop offset="100%" stopColor={cor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#g${id})`} />
        <path
          d={caminho}
          fill="none"
          stroke={cor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {pontos.map((p, i) => (
          <g key={i}>
            <rect
              x={i * passo - passo / 2}
              y={0}
              width={passo}
              height={altura}
              fill="transparent"
              onMouseEnter={() => setAtivo(i)}
            />
            {ativo === i ? (
              <circle
                cx={p[0]}
                cy={p[1]}
                r="3"
                fill={cor}
                stroke="var(--color-papel-alto)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </g>
        ))}
        <circle
          cx={pontos[pontos.length - 1][0]}
          cy={pontos[pontos.length - 1][1]}
          r="2.5"
          fill={cor}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {ativo !== null ? (
        <p className="text-[11px] text-tinta-2 mt-1 anim-surgir">
          {rotulos?.[ativo] ? <span className="text-tinta-3">{rotulos[ativo]} · </span> : null}
          <span className="cifra">{dinheiro(valores[ativo])}</span>
        </p>
      ) : null}
    </div>
  );
}

// ==================================================================
// Medidor de meta
// ==================================================================

export function MedidorMeta({
  rotulo,
  valor,
  meta,
  cor,
  detalhe,
}: {
  rotulo: string;
  valor: number;
  meta: number;
  cor?: string;
  detalhe?: string;
}) {
  const pct = meta > 0 ? (valor / meta) * 100 : 0;
  const bateu = pct >= 100;
  const tom = cor ?? (bateu ? "var(--color-graf-recebido)" : "var(--color-caneta)");

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className="text-[13px] font-semibold text-tinta truncate">{rotulo}</span>
        <span className="text-[11.5px] text-tinta-3 shrink-0 cifra">
          {numeroBR(Math.min(999, pct), 0)}%
        </span>
      </div>
      <div className="relative h-[9px] rounded-full overflow-hidden bg-[color-mix(in_oklab,var(--color-tinta)_9%,transparent)]">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{
            width: `${Math.min(100, Math.max(0, pct))}%`,
            background: tom,
            transitionTimingFunction: "var(--ease-talao)",
          }}
        />
      </div>
      <div className="flex items-baseline justify-between gap-2 mt-1.5">
        <span className="text-[11.5px] text-tinta-2 cifra">{dinheiro(valor)}</span>
        <span className="text-[11px] text-tinta-3">
          {detalhe ?? `meta ${dinheiroCurto(meta)}`}
        </span>
      </div>
    </div>
  );
}
