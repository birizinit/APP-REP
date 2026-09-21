"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Icone, Marca } from "@/components/icone";
import { Dores, Calculadora } from "@/components/landing/dor";
import { ComoFunciona, Duvidas, Final } from "@/components/landing/fechamento";
import { Comparativo, Flex, Recursos } from "@/components/landing/recursos";
import { Simulador } from "@/components/landing/simulador";
import { Contador, fmt, movimentoReduzido, useRevelar } from "@/components/landing/uteis";

export interface Cta {
  href: string;
  rotulo: string;
}

export function Landing({ logado }: { logado: boolean }) {
  useRevelar();
  const cta: Cta = logado
    ? { href: "/", rotulo: "Abrir meu talão" }
    : { href: "/entrar?criar=1", rotulo: "Criar minha conta" };

  return (
    <div className="lp">
      <BarraProgresso />
      <Navegacao cta={cta} logado={logado} />
      <main>
        <Hero cta={cta} />
        <Faixa />
        <Dores />
        <Calculadora cta={cta} />
        <Simulador />
        <Recursos />
        <Flex />
        <Comparativo />
        <ComoFunciona cta={cta} />
        <Duvidas />
        <Final cta={cta} />
      </main>
      <Rodape />
    </div>
  );
}

// ==================================================================

function BarraProgresso() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let quadro = 0;
    const atualizar = () => {
      const alto = document.documentElement.scrollHeight - window.innerHeight;
      const p = alto > 0 ? window.scrollY / alto : 0;
      if (ref.current) ref.current.style.transform = `scaleX(${p})`;
      quadro = 0;
    };
    const aoRolar = () => {
      if (!quadro) quadro = requestAnimationFrame(atualizar);
    };
    window.addEventListener("scroll", aoRolar, { passive: true });
    atualizar();
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);
  return <div ref={ref} className="lp-progresso" aria-hidden />;
}

function Navegacao({ cta, logado }: { cta: Cta; logado: boolean }) {
  const [rolou, setRolou] = useState(false);
  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 12);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  return (
    <header className={`lp-nav area-segura-cima ${rolou ? "lp-rolou" : ""}`}>
      <div className="lp-wrap flex items-center gap-6 h-[66px]">
        <Link href="/" className="flex items-center gap-2.5 mr-auto" aria-label="Representei, início">
          <span className="text-caneta">
            <Marca tamanho={30} />
          </span>
          <span className="font-display font-extrabold text-[19px] tracking-[-0.045em] text-tinta">
            Representei
          </span>
        </Link>

        <nav aria-label="Seções" className="hidden md:flex items-center gap-7">
          <a href="#dor" className="lp-link">A dor</a>
          <a href="#simulador" className="lp-link">Simulador</a>
          <a href="#recursos" className="lp-link">Recursos</a>
          <a href="#duvidas" className="lp-link">Dúvidas</a>
        </nav>

        {!logado ? (
          <Link href="/entrar" className="hidden sm:inline-flex lp-link">
            Entrar
          </Link>
        ) : null}
        <Link href={cta.href} className="botao botao-tinta lp-cta !h-[40px] !px-4 text-[14px]">
          {cta.rotulo}
        </Link>
      </div>
    </header>
  );
}

// ==================================================================
// HERO
// ==================================================================

function Palavras({ texto, atraso = 0 }: { texto: string; atraso?: number }) {
  return (
    <>
      {texto.split(" ").map((p, i) => (
        <span key={i} className="lp-palavra" style={{ animationDelay: `${atraso + i * 0.07}s` }}>
          {p}&nbsp;
        </span>
      ))}
    </>
  );
}

function Hero({ cta }: { cta: Cta }) {
  return (
    <section className="lp-hero pt-10 pb-20 md:pt-16 md:pb-28" aria-labelledby="lp-h1">
      <div className="lp-wrap relative grid lg:grid-cols-[1.08fr_1fr] gap-14 lg:gap-10 items-center">
        <div>
          <span className="lp-selo-vivo lp-surge" style={{ animationDelay: "0.05s" }}>
            <span className="lp-ponto" />
            Feito para representante comercial
          </span>

          <h1 id="lp-h1" className="lp-titulo text-[46px] sm:text-[64px] lg:text-[76px] mt-6">
            <Palavras texto="Você rala na estrada." atraso={0.15} />
            <br />
            <span className="lp-palavra" style={{ animationDelay: "0.45s" }}>A&nbsp;</span>
            <span className="lp-palavra" style={{ animationDelay: "0.52s" }}>comissão&nbsp;</span>
            <span className="lp-palavra lp-risco text-carimbo" style={{ animationDelay: "0.6s" }}>
              some
              <svg viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden>
                <path d="M2 12 C 25 4, 45 18, 70 8 S 96 10, 98 6" />
              </svg>
            </span>
            <span className="lp-palavra" style={{ animationDelay: "0.68s" }}>&nbsp;no&nbsp;</span>
            <span className="lp-palavra" style={{ animationDelay: "0.74s" }}>caminho.</span>
          </h1>

          <p className="text-[17px] sm:text-[19px] leading-relaxed text-tinta-2 mt-7 max-w-[34ch] lp-surge" style={{ animationDelay: "0.9s" }}>
            O Representei confere a comissão de <span className="lp-marca text-tinta font-semibold">cada representada</span>,
            monta a rota mais barata do dia e avisa antes do cliente sumir.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-9 lp-surge" style={{ animationDelay: "1.05s" }}>
            <Link href={cta.href} className="botao botao-tinta lp-cta !h-[54px] !px-7 text-[16px]">
              {cta.rotulo}
              <span className="lp-seta"><Icone nome="seta" tamanho={18} /></span>
            </Link>
            <a href="#simulador" className="botao botao-papel !h-[54px] !px-6 text-[15px]">
              <Icone nome="rota" tamanho={17} />
              Ver a rota se otimizar
            </a>
          </div>

          <ul className="flex flex-wrap gap-x-5 gap-y-2 mt-6 text-[13px] text-tinta-3 lp-surge" style={{ animationDelay: "1.2s" }}>
            {["Leva 1 minuto", "Sem cartão de crédito", "Funciona no celular"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <span className="text-quitado"><Icone nome="check" tamanho={15} /></span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <TalaoHero />
      </div>
    </section>
  );
}

const PARCELAS = [
  { rep: "Indústria Alfa", base: "líquido · NF", valor: 4280, status: "pago" },
  { rep: "Plásticos Beta", base: "progressivo", valor: 2960, status: "pago" },
  { rep: "Metalúrgica Gama", base: "no pagamento", valor: 1740, status: "vencido" },
] as const;

/** O "talão" do hero: papéis carbonados empilhados, carimbo e avisos. */
function TalaoHero() {
  const topo = useRef<HTMLDivElement>(null);

  function inclinar(e: React.PointerEvent<HTMLDivElement>) {
    if (movimentoReduzido() || e.pointerType !== "mouse" || !topo.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    topo.current.style.transform = `rotateY(${x * 9}deg) rotateX(${-y * 9}deg)`;
  }
  function soltar() {
    if (topo.current) topo.current.style.transform = "";
  }

  const total = PARCELAS.reduce((s, p) => s + p.valor, 0);

  return (
    <div
      className="lp-pilha relative mx-auto w-full max-w-[460px] lp-surge"
      style={{ animationDelay: "0.35s" }}
      onPointerMove={inclinar}
      onPointerLeave={soltar}
    >
      <div className="lp-folha lp-folha-rosa" aria-hidden />
      <div className="lp-folha lp-folha-amarela" aria-hidden />

      <div ref={topo} className="lp-folha-topo canhoto picote overflow-visible">
        <div className="pauta margem-caderno rounded-[14px] px-6 pt-5 pb-7 pl-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="rotulo !mb-1">Comissões · este mês</p>
              <p className="numeral text-[40px] leading-none text-tinta">
                <Contador valor={total} formato={fmt.reais} duracao={1600} />
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-tinta-3 border border-papel-borda rounded-full px-2 py-1">
              exemplo
            </span>
          </div>

          <ul className="mt-5 space-y-2.5">
            {PARCELAS.map((p, i) => (
              <li
                key={p.rep}
                className="flex items-center justify-between gap-3 border-b border-dashed border-papel-borda pb-2.5 lp-surge"
                style={{ animationDelay: `${0.9 + i * 0.15}s` }}
              >
                <div className="min-w-0">
                  <p className="text-[14.5px] font-semibold text-tinta truncate">{p.rep}</p>
                  <p className="text-[12px] text-tinta-3">{p.base}</p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="cifra text-[14px] text-tinta">{fmt.reais(p.valor)}</span>
                  <span
                    className={`carimbo !text-[9.5px] ${p.status === "pago" ? "text-quitado" : "text-carimbo"}`}
                  >
                    {p.status === "pago" ? "pago" : "vencido"}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-[12.5px] text-tinta-2 flex items-center gap-1.5">
            <span className="text-carimbo"><Icone nome="alerta" tamanho={14} /></span>
            A Gama venceu há 12 dias. Você foi avisado no dia.
          </p>
        </div>

        <span
          className="carimbo carimbo-grande lp-carimbo-cai absolute right-5 top-[64px] text-quitado bg-papel-alto/80"
          style={{ animationDelay: "1.9s" }}
          aria-hidden
        >
          conferido
        </span>
      </div>

      {/* avisos flutuantes */}
      <div
        className="lp-entra-toast absolute -left-4 sm:-left-12 -top-7 max-w-[260px]"
        style={{ animationDelay: "2.3s" }}
      >
        <div className="lp-flutua canhoto flex items-center gap-2.5 px-3.5 py-2.5 shadow-[var(--shadow-erguido)]" style={{ "--giro": "-2deg" } as React.CSSProperties}>
          <span className="w-8 h-8 rounded-lg grid place-items-center bg-quitado-fundo text-quitado shrink-0">
            <Icone nome="cofre" tamanho={16} />
          </span>
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold text-tinta leading-tight">Alfa pagou R$ 4.280</p>
            <p className="text-[11px] text-tinta-3">bateu com o seu cálculo</p>
          </div>
        </div>
      </div>

      <div
        className="lp-entra-toast absolute -right-2 sm:-right-10 -bottom-9 max-w-[250px]"
        style={{ animationDelay: "2.8s" }}
      >
        <div className="lp-flutua-2 canhoto flex items-center gap-2.5 px-3.5 py-2.5 shadow-[var(--shadow-erguido)]" style={{ "--giro": "2deg" } as React.CSSProperties}>
          <span className="w-8 h-8 rounded-lg grid place-items-center bg-caneta-fundo text-caneta shrink-0">
            <Icone nome="rota" tamanho={16} />
          </span>
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold text-tinta leading-tight">Rota de hoje: 142 km</p>
            <p className="text-[11px] text-tinta-3">R$ 96,30 de combustível · 7 visitas</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================================================================

const FRASES = [
  "Comissão conferida",
  "Rota mais barata",
  "Cliente sumindo? Aviso na hora",
  "Etanol ou gasolina",
  "Quanto 1% de desconto te custa",
  "Ficha pelo CNPJ",
  "Previsão de caixa",
  "Funciona sem sinal",
];

function Faixa() {
  const lista = [...FRASES, ...FRASES];
  return (
    <div className="lp-faixa py-3.5 my-4" aria-hidden>
      <div className="lp-faixa-trilho">
        {lista.map((f, i) => (
          <span key={i} className="flex items-center gap-6 pr-6 font-display font-extrabold uppercase tracking-[0.08em] text-[15px] sm:text-[17px] whitespace-nowrap">
            {f}
            <span className="text-caneta-claro">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Rodape() {
  return (
    <footer className="border-t border-papel-borda py-10">
      <div className="lp-wrap flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-tinta-3">
        <div className="flex items-center gap-2 text-tinta">
          <span className="text-caneta"><Marca tamanho={24} /></span>
          <span className="font-display font-extrabold tracking-[-0.04em]">Representei</span>
          <span className="text-tinta-3 font-normal">· o talão digital do representante</span>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/entrar" className="lp-link !text-[13px]">Entrar</Link>
          <a href="#lp-h1" className="lp-link !text-[13px]">Voltar ao topo</a>
        </div>
      </div>
    </footer>
  );
}
