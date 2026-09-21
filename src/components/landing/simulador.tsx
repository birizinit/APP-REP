"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Icone } from "@/components/icone";
import { Contador, fmt, movimentoReduzido } from "@/components/landing/uteis";

// ==================================================================
// SIMULADOR DE ROTA — o mesmo método do app, rodando aqui:
// vizinho mais próximo + refino 2-opt, sobre distâncias reais do mapa.
// ==================================================================

const W = 640;
const H = 380;
const KM_POR_UNIDADE = 0.065; // escala do mapa de exemplo (um dia de ~200 km)
const KM_L = 11;
const PRECO_LITRO = 6.2;
const KM_H = 42; // média urbana + estrada
const MAX_PARADAS = 12;

interface Ponto {
  x: number;
  y: number;
  nome: string;
}

const BASE: Ponto = { x: 70, y: 318, nome: "Sua base" };

// Ordem "de cabeça": a que a gente anota no caderno, sem pensar no mapa.
const INICIAIS: Ponto[] = [
  { x: 560, y: 70, nome: "Mercado Sol" },
  { x: 170, y: 120, nome: "Atacado Norte" },
  { x: 520, y: 300, nome: "Casa Lima" },
  { x: 260, y: 290, nome: "Depósito Rio" },
  { x: 420, y: 110, nome: "Loja Ideal" },
  { x: 120, y: 210, nome: "Distribuidora 7" },
  { x: 350, y: 200, nome: "Empório Vale" },
  { x: 600, y: 200, nome: "Comercial Ipê" },
];

const NOMES_EXTRA = [
  "Mercadinho Bom Preço",
  "Rede Alvorada",
  "Supermercado Leste",
  "Loja do Centro",
  "Atacado Serra",
  "Armazém Novo",
  "Casa Verde",
  "Varejão Sul",
];

function dist(a: Ponto, b: Ponto) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Comprimento do percurso base → paradas (na ordem dada) → base. */
function comprimento(ordem: number[], pts: Ponto[]) {
  let total = 0;
  let atual = BASE;
  for (const i of ordem) {
    total += dist(atual, pts[i]);
    atual = pts[i];
  }
  return total + dist(atual, BASE);
}

function vizinhoMaisProximo(pts: Ponto[]) {
  const restantes = new Set(pts.map((_, i) => i));
  const ordem: number[] = [];
  let atual = BASE;
  while (restantes.size) {
    let melhor = -1;
    let dMelhor = Infinity;
    for (const i of restantes) {
      const d = dist(atual, pts[i]);
      if (d < dMelhor) {
        dMelhor = d;
        melhor = i;
      }
    }
    ordem.push(melhor);
    restantes.delete(melhor);
    atual = pts[melhor];
  }
  return ordem;
}

/** Refino 2-opt: desfaz cruzamentos invertendo trechos enquanto houver ganho. */
function doisOpt(ordem: number[], pts: Ponto[]) {
  let melhor = [...ordem];
  let melhorou = true;
  while (melhorou) {
    melhorou = false;
    for (let i = 0; i < melhor.length - 1; i++) {
      for (let k = i + 1; k < melhor.length; k++) {
        const candidata = [...melhor.slice(0, i), ...melhor.slice(i, k + 1).reverse(), ...melhor.slice(k + 1)];
        if (comprimento(candidata, pts) + 1e-9 < comprimento(melhor, pts)) {
          melhor = candidata;
          melhorou = true;
        }
      }
    }
  }
  return melhor;
}

function caminho(ordem: number[], pts: Ponto[]) {
  const seq = [BASE, ...ordem.map((i) => pts[i]), BASE];
  return seq.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
}

function metricas(unidades: number) {
  const km = unidades * KM_POR_UNIDADE;
  const litros = km / KM_L;
  return { km, litros, reais: litros * PRECO_LITRO, minutos: (km / KM_H) * 60 };
}

function horas(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
}

export function Simulador() {
  const [pts, setPts] = useState<Ponto[]>(INICIAIS);
  const [otimizada, setOtimizada] = useState(false);
  const [versao, setVersao] = useState(0); // força redesenhar o traçado
  const carro = useRef<SVGAnimateMotionElement>(null);
  // o carrinho só aparece depois de montar (e nunca com movimento reduzido)
  const [animar, setAnimar] = useState(false);
  useEffect(() => setAnimar(!movimentoReduzido()), []);

  const sua = useMemo(() => pts.map((_, i) => i), [pts]);
  const melhor = useMemo(() => doisOpt(vizinhoMaisProximo(pts), pts), [pts]);
  const ordem = otimizada ? melhor : sua;

  const mSua = metricas(comprimento(sua, pts));
  const mMelhor = metricas(comprimento(melhor, pts));
  const m = otimizada ? mMelhor : mSua;
  const economiaKm = mSua.km - mMelhor.km;
  const economiaPct = mSua.km > 0 ? (economiaKm / mSua.km) * 100 : 0;

  const d = caminho(ordem, pts);
  const tamanho = comprimento(ordem, pts);

  useEffect(() => {
    if (!animar) return;
    try {
      carro.current?.beginElement();
    } catch {
      /* navegador sem SMIL: o carro só fica parado */
    }
  }, [versao, animar]);

  function otimizar() {
    setOtimizada(true);
    setVersao((v) => v + 1);
  }
  function voltar() {
    setOtimizada(false);
    setVersao((v) => v + 1);
  }
  function embaralhar() {
    const n = 7 + Math.floor(Math.random() * 3);
    const novos: Ponto[] = [];
    const nomes = [...INICIAIS.map((p) => p.nome), ...NOMES_EXTRA];
    for (let i = 0; i < n; i++) {
      novos.push({
        x: 110 + Math.random() * (W - 160),
        y: 45 + Math.random() * (H - 90),
        nome: nomes[i % nomes.length],
      });
    }
    setPts(novos);
    setOtimizada(false);
    setVersao((v) => v + 1);
  }
  function adicionar(e: React.MouseEvent<SVGSVGElement>) {
    if (pts.length >= MAX_PARADAS) return;
    const svg = e.currentTarget;
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * H;
    const nomes = NOMES_EXTRA.filter((n) => !pts.some((p) => p.nome === n));
    setPts((atual) => [...atual, { x, y, nome: nomes[0] ?? `Cliente ${atual.length + 1}` }]);
    setVersao((v) => v + 1);
  }

  return (
    <section id="simulador" className="py-20 md:py-28 bg-papel-alto border-y border-papel-borda scroll-mt-16" aria-labelledby="lp-sim">
      <div className="lp-wrap">
        <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-10 items-center">
          <div data-rv="esq">
            <p className="carimbo text-caneta">teste agora</p>
            <h2 id="lp-sim" className="lp-titulo text-[34px] sm:text-[48px] mt-4">
              Sua rota, <span className="text-caneta">sem o zigue-zague.</span>
            </h2>
            <p className="text-[16.5px] text-tinta-2 mt-4 leading-relaxed">
              O mapa mostra os clientes na ordem em que foram anotados. Aperte{" "}
              <strong className="text-tinta">Otimizar</strong> e veja o mesmo método do app reorganizar o dia.
              Clique no mapa para pôr mais clientes.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-8">
              <Metrica rotulo="Distância" valor={m.km} formato={(v) => `${fmt.inteiro(v)} km`} />
              <Metrica rotulo="Combustível" valor={m.reais} formato={fmt.centavos} />
              <Metrica rotulo="Litros" valor={m.litros} formato={(v) => `${fmt.decimal(v)} l`} />
              <Metrica rotulo="No volante" valor={m.minutos} formato={horas} />
            </div>

            <div className="mt-6 min-h-[64px]" aria-live="polite">
              {otimizada && economiaKm > 0.5 ? (
                <div key={versao} className="flex items-center gap-3 anim-subir">
                  <span className="carimbo carimbo-batendo text-quitado !text-[13px]">
                    −{fmt.inteiro(economiaKm)} km
                  </span>
                  <p className="text-[14.5px] text-tinta-2">
                    <strong className="text-tinta">{fmt.inteiro(economiaPct)}% a menos</strong> — são{" "}
                    {fmt.centavos(mSua.reais - mMelhor.reais)} só hoje. No ano, uns{" "}
                    <strong className="text-quitado">{fmt.reais((mSua.reais - mMelhor.reais) * 250)}</strong>.
                  </p>
                </div>
              ) : otimizada ? (
                <p className="text-[14.5px] text-tinta-2 anim-surgir">Essa já era a melhor ordem. Embaralhe e tente de novo.</p>
              ) : (
                <p className="text-[14.5px] text-tinta-3">A economia aparece aqui.</p>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mt-4">
              {otimizada ? (
                <button type="button" onClick={voltar} className="botao botao-papel !h-[50px]">
                  <Icone nome="setaEsquerda" tamanho={17} />
                  Ver a ordem do caderno
                </button>
              ) : (
                <button type="button" onClick={otimizar} className="botao botao-tinta lp-cta !h-[50px] !px-6">
                  <Icone nome="raio" tamanho={17} />
                  Otimizar rota
                </button>
              )}
              <button type="button" onClick={embaralhar} className="botao botao-fantasma !h-[50px]">
                <Icone nome="atualizar" tamanho={17} />
                Outros clientes
              </button>
            </div>
          </div>

          <div data-rv="dir">
            <div className="canhoto overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-papel-borda">
                <p className="text-[13px] font-semibold text-tinta flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${otimizada ? "bg-quitado" : "bg-carimbo"}`} />
                  {otimizada ? "Rota otimizada" : "Ordem do caderno"} · {pts.length} clientes
                </p>
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-tinta-3">mapa de exemplo</span>
              </div>
              <svg
                viewBox={`0 0 ${W} ${H}`}
                className="lp-mapa block w-full h-auto cursor-crosshair touch-manipulation"
                onClick={adicionar}
                role="img"
                aria-label={`Mapa com ${pts.length} clientes; rota de ${fmt.inteiro(m.km)} quilômetros`}
              >
                {/* rio e avenida, só para parecer mapa */}
                <path d="M-10 150 C 120 170, 200 60, 330 110 S 520 60, 660 130" stroke="var(--color-via-azul)" strokeWidth="14" fill="none" opacity="0.35" />
                <path d="M0 250 L 640 230" stroke="var(--color-papel-borda)" strokeWidth="8" fill="none" />
                <path d="M300 0 L 330 380" stroke="var(--color-papel-borda)" strokeWidth="8" fill="none" />

                <path
                  key={`t-${versao}`}
                  d={d}
                  className="lp-trajeto lp-trajeto-desenha"
                  stroke={otimizada ? "var(--color-quitado)" : "var(--color-carimbo)"}
                  strokeWidth={otimizada ? 4 : 3}
                  strokeDasharray={tamanho}
                  strokeDashoffset={tamanho}
                  opacity={0.9}
                />

                {pts.map((p, i) => {
                  const pos = ordem.indexOf(i) + 1;
                  return (
                    <g key={`${p.nome}-${i}-${versao}`} className="lp-parada" style={{ animationDelay: `${0.05 * i}s` }}>
                      <circle cx={p.x} cy={p.y} r={13} fill="var(--color-papel-alto)" stroke="var(--color-tinta)" strokeWidth={2} />
                      <text x={p.x} y={p.y + 4.5} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--color-tinta)" style={{ fontFamily: "var(--font-mono)" }}>
                        {pos}
                      </text>
                      <text x={p.x} y={p.y - 19} textAnchor="middle" fontSize="11" fill="var(--color-tinta-2)" style={{ fontFamily: "var(--font-sans)" }}>
                        {p.nome}
                      </text>
                    </g>
                  );
                })}

                <g>
                  <rect x={BASE.x - 15} y={BASE.y - 15} width={30} height={30} rx={8} fill="var(--color-caneta)" />
                  <path d={`M${BASE.x - 7} ${BASE.y + 2} L${BASE.x} ${BASE.y - 6} L${BASE.x + 7} ${BASE.y + 2} M${BASE.x - 5} ${BASE.y} V${BASE.y + 7} H${BASE.x + 5} V${BASE.y}`} stroke="#fff" strokeWidth={2} fill="none" strokeLinejoin="round" />
                  <text x={BASE.x} y={BASE.y + 30} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-caneta)">
                    sua base
                  </text>
                </g>

                {animar ? (
                  <circle key={`c-${versao}`} r={7} fill="var(--color-ambar)" stroke="var(--color-papel-alto)" strokeWidth={2.5}>
                    <animateMotion
                      ref={carro}
                      begin="indefinite"
                      dur="3.2s"
                      fill="freeze"
                      path={d}
                      calcMode="spline"
                      keyTimes="0;1"
                      keySplines="0.4 0 0.2 1"
                    />
                  </circle>
                ) : null}
              </svg>
              <p className="px-4 py-2.5 text-[11.5px] text-tinta-3 border-t border-papel-borda">
                Clique no mapa para adicionar um cliente (até {MAX_PARADAS}). No app, a distância vem das ruas de verdade e o custo sai do consumo do seu carro.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Metrica({ rotulo, valor, formato }: { rotulo: string; valor: number; formato: (v: number) => string }) {
  return (
    <div className="canhoto px-4 py-3.5">
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-tinta-3">{rotulo}</p>
      <p className="numeral text-[26px] leading-tight text-tinta mt-1">
        <Contador valor={valor} formato={formato} duracao={900} />
      </p>
    </div>
  );
}
