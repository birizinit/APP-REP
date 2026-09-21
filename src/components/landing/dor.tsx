"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Icone, type NomeIcone } from "@/components/icone";
import type { Cta } from "@/components/landing/landing";
import { Contador, fmt, preenchido } from "@/components/landing/uteis";

// ==================================================================
// A DOR — o visitante marca o que é a semana dele
// ==================================================================

const DORES: { icone: NomeIcone; dor: string; custo: string }[] = [
  {
    icone: "comissao",
    dor: "A comissão que a indústria diz que pagou nunca bate com a sua conta.",
    custo: "E você não tem como provar a diferença.",
  },
  {
    icone: "clientes",
    dor: "Você descobre que o cliente parou de comprar quando ele já fechou com o concorrente.",
    custo: "O aviso chegou três meses tarde.",
  },
  {
    icone: "rota",
    dor: "A rota do dia vira zigue-zague e o combustível sai do seu bolso.",
    custo: "Quilômetro rodado à toa não volta.",
  },
  {
    icone: "pedido",
    dor: "Pedido no caderno, no WhatsApp e na planilha — e nenhum dos três bate.",
    custo: "Na hora de cobrar, vale a palavra da fábrica.",
  },
  {
    icone: "cofre",
    dor: "Você não faz ideia de quanto cai na conta no mês que vem.",
    custo: "Planejar a vida vira chute.",
  },
  {
    icone: "representada",
    dor: "Cada representada paga de um jeito: bruto, líquido, na nota, no pagamento…",
    custo: "Conferir tudo à mão toma o seu fim de semana.",
  },
];

const VEREDITO = [
  "Marque o que acontece com você.",
  "Uma já dói. Vamos resolver essa.",
  "Duas. Isso já está custando dinheiro.",
  "Três. Você está trabalhando de graça uma parte do mês.",
  "Quatro. O caderno está perdendo para a estrada.",
  "Cinco. Você precisa disso ontem.",
  "Todas. Bem-vindo ao clube — foi para você que isso foi feito.",
];

export function Dores() {
  const [marcadas, setMarcadas] = useState<Set<number>>(new Set());
  const n = marcadas.size;

  function alternar(i: number) {
    setMarcadas((atual) => {
      const nova = new Set(atual);
      if (nova.has(i)) nova.delete(i);
      else nova.add(i);
      return nova;
    });
  }

  return (
    <section id="dor" className="py-20 md:py-28 scroll-mt-16" aria-labelledby="lp-dor">
      <div className="lp-wrap">
        <div className="max-w-[720px]" data-rv>
          <p className="carimbo text-carimbo">seja sincero</p>
          <h2 id="lp-dor" className="lp-titulo text-[36px] sm:text-[52px] mt-4">
            Quanto disso é a <span className="text-caneta">sua semana?</span>
          </h2>
          <p className="text-[16.5px] text-tinta-2 mt-4 leading-relaxed">
            Toque em cada coisa que acontece com você. Ninguém está vendo.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
          {DORES.map((d, i) => {
            const ativa = marcadas.has(i);
            return (
              <button
                key={d.dor}
                type="button"
                aria-pressed={ativa}
                onClick={() => alternar(i)}
                className="lp-dor canhoto text-left p-5 pr-16"
                data-rv
                style={{ "--rv-atraso": `${(i % 3) * 0.08}s` } as React.CSSProperties}
              >
                <span
                  className={`w-10 h-10 rounded-xl grid place-items-center transition-colors ${
                    ativa ? "bg-carimbo text-papel-alto" : "bg-caneta-fundo text-caneta"
                  }`}
                >
                  <Icone nome={d.icone} tamanho={19} />
                </span>
                <p className="text-[16px] font-semibold leading-snug text-tinta mt-4">{d.dor}</p>
                <p className="text-[13.5px] text-tinta-3 mt-2">{d.custo}</p>
                {ativa ? (
                  <span className="lp-dor-selo carimbo carimbo-batendo !text-[10px]">sou eu</span>
                ) : (
                  <span className="lp-dor-selo text-tinta-3 opacity-60">
                    <Icone nome="mais" tamanho={18} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="canhoto mt-8 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8" data-rv>
          <div className="sm:w-[180px] shrink-0">
            <p className="rotulo !mb-1">Dor-ômetro</p>
            <p className="numeral text-[34px] leading-none text-tinta">
              {n}
              <span className="text-tinta-3 text-[20px]"> / {DORES.length}</span>
            </p>
          </div>
          <div className="flex-1 min-w-0">
            <div className="lp-medidor" role="meter" aria-valuemin={0} aria-valuemax={DORES.length} aria-valuenow={n} aria-label="Quantas dores você marcou">
              <span className="lp-medidor-barra" style={{ width: `${(n / DORES.length) * 100}%` }} />
            </div>
            <p key={n} className="text-[15px] font-semibold text-tinta mt-3 anim-surgir" aria-live="polite">
              {VEREDITO[n]}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ==================================================================
// CALCULADORA — quanto está ficando na mesa, com os números dele
// ==================================================================

const DIAS_UTEIS_ANO = 250;

function Deslizador({
  rotulo,
  valor,
  min,
  max,
  passo,
  mostrar,
  aoMudar,
  dica,
}: {
  rotulo: string;
  valor: number;
  min: number;
  max: number;
  passo: number;
  mostrar: string;
  aoMudar: (v: number) => void;
  dica?: string;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-[13.5px] font-semibold text-tinta-2">{rotulo}</span>
        <span className="cifra text-[15px] font-medium text-tinta">{mostrar}</span>
      </span>
      <input
        type="range"
        className="lp-slider mt-3"
        min={min}
        max={max}
        step={passo}
        value={valor}
        style={preenchido(valor, min, max)}
        onChange={(e) => aoMudar(Number(e.target.value))}
        aria-valuetext={mostrar}
      />
      {dica ? <span className="block text-[12px] text-tinta-3 mt-1.5">{dica}</span> : null}
    </label>
  );
}

export function Calculadora({ cta }: { cta: Cta }) {
  const [venda, setVenda] = useState(250_000);
  const [taxa, setTaxa] = useState(4);
  const [escapa, setEscapa] = useState(3);
  const [kmExtra, setKmExtra] = useState(25);
  const [consumo, setConsumo] = useState(11);
  const [litro, setLitro] = useState(6.2);

  const r = useMemo(() => {
    const comissaoAno = venda * (taxa / 100) * 12;
    const comissaoPerdida = comissaoAno * (escapa / 100);
    const combustivelPerdido = ((kmExtra * DIAS_UTEIS_ANO) / consumo) * litro;
    return {
      comissaoAno,
      comissaoPerdida,
      combustivelPerdido,
      total: comissaoPerdida + combustivelPerdido,
      kmAno: kmExtra * DIAS_UTEIS_ANO,
    };
  }, [venda, taxa, escapa, kmExtra, consumo, litro]);

  return (
    <section className="pb-20 md:pb-28" aria-labelledby="lp-calc">
      <div className="lp-wrap">
        <div className="grid lg:grid-cols-[1fr_1.05fr] gap-8 items-stretch">
          <div className="canhoto p-6 sm:p-8" data-rv="esq">
            <p className="rotulo">Com os seus números</p>
            <h2 id="lp-calc" className="lp-titulo text-[30px] sm:text-[40px] mt-1">
              Quanto está ficando na mesa?
            </h2>

            <div className="space-y-6 mt-8">
              <Deslizador
                rotulo="Quanto você vende por mês"
                valor={venda}
                min={20_000}
                max={2_000_000}
                passo={10_000}
                mostrar={fmt.reais(venda)}
                aoMudar={setVenda}
              />
              <Deslizador
                rotulo="Comissão média"
                valor={taxa}
                min={1}
                max={10}
                passo={0.5}
                mostrar={`${fmt.decimal(taxa)}%`}
                aoMudar={setTaxa}
              />
              <Deslizador
                rotulo="Comissão que escapa sem você ver"
                valor={escapa}
                min={0}
                max={15}
                passo={0.5}
                mostrar={`${fmt.decimal(escapa)}%`}
                aoMudar={setEscapa}
                dica="Glosa sem motivo, parcela esquecida, base de cálculo errada."
              />
              <Deslizador
                rotulo="Quilômetros a mais por dia (rota fora de ordem)"
                valor={kmExtra}
                min={0}
                max={100}
                passo={5}
                mostrar={`${kmExtra} km`}
                aoMudar={setKmExtra}
              />
              <div className="grid grid-cols-2 gap-5">
                <Deslizador
                  rotulo="Consumo"
                  valor={consumo}
                  min={6}
                  max={18}
                  passo={0.5}
                  mostrar={`${fmt.decimal(consumo)} km/l`}
                  aoMudar={setConsumo}
                />
                <Deslizador
                  rotulo="Litro"
                  valor={litro}
                  min={3.5}
                  max={8}
                  passo={0.05}
                  mostrar={fmt.centavos(litro)}
                  aoMudar={setLitro}
                />
              </div>
            </div>
          </div>

          <div
            className="relative rounded-[14px] p-6 sm:p-8 flex flex-col overflow-hidden bg-tinta text-papel"
            data-rv="dir"
          >
            <div
              className="absolute -right-24 -top-24 w-[340px] h-[340px] rounded-full opacity-40 pointer-events-none"
              style={{ background: "radial-gradient(circle, var(--color-carimbo), transparent 65%)" }}
              aria-hidden
            />
            <p className="relative text-[12px] font-bold uppercase tracking-[0.16em] opacity-70">
              Por ano, você está deixando
            </p>
            <p className="relative numeral text-[52px] sm:text-[72px] leading-[0.95] mt-3 text-[color:var(--color-via-rosa)]">
              <Contador valor={r.total} formato={fmt.reais} duracao={700} />
            </p>
            <p className="relative text-[15px] opacity-80 mt-3 max-w-[38ch]">
              Isso é estimativa com os números que você colocou ao lado — mexa neles.
            </p>

            <div className="relative grid sm:grid-cols-2 gap-3 mt-8">
              <div className="rounded-xl p-4 bg-[color-mix(in_oklab,var(--color-papel)_9%,transparent)]">
                <p className="text-[12px] opacity-70">Comissão que escapa</p>
                <p className="numeral text-[26px] mt-1">
                  <Contador valor={r.comissaoPerdida} formato={fmt.reais} duracao={600} />
                </p>
                <p className="text-[12px] opacity-60 mt-1">
                  de {fmt.reais(r.comissaoAno)} de comissão no ano
                </p>
              </div>
              <div className="rounded-xl p-4 bg-[color-mix(in_oklab,var(--color-papel)_9%,transparent)]">
                <p className="text-[12px] opacity-70">Combustível à toa</p>
                <p className="numeral text-[26px] mt-1">
                  <Contador valor={r.combustivelPerdido} formato={fmt.reais} duracao={600} />
                </p>
                <p className="text-[12px] opacity-60 mt-1">
                  {fmt.inteiro(r.kmAno)} km rodados sem precisar
                </p>
              </div>
            </div>

            <div className="relative mt-auto pt-8">
              <p className="text-[14px] opacity-80 mb-4">
                O Representei confere cada parcela contra o plano da representada e ordena a rota
                pelo custo real do seu carro.
              </p>
              <Link href={cta.href} className="botao lp-cta !h-[52px] !px-6 bg-papel-alto text-tinta hover:!bg-papel">
                Parar de perder isso
                <span className="lp-seta"><Icone nome="seta" tamanho={18} /></span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
