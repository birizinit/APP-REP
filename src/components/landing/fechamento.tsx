"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Icone } from "@/components/icone";
import type { Cta } from "@/components/landing/landing";
import { movimentoReduzido, useNaTela } from "@/components/landing/uteis";

// ==================================================================
// COMO FUNCIONA
// ==================================================================

const PASSOS = [
  {
    n: "01",
    titulo: "Crie a conta",
    texto: "Nome, e-mail e senha. Depois diga de onde você sai todo dia e qual carro usa.",
    tempo: "1 minuto",
  },
  {
    n: "02",
    titulo: "Traga sua carteira",
    texto: "Importe a planilha de clientes e cadastre o acordo de comissão de cada representada.",
    tempo: "uma tarde",
  },
  {
    n: "03",
    titulo: "Saia para a rua",
    texto: "Abra o app de manhã: a rota está pronta, as visitas em ordem e o que venceu já foi avisado.",
    tempo: "todo dia",
  },
];

export function ComoFunciona({ cta }: { cta: Cta }) {
  return (
    <section className="py-20 md:py-28 bg-papel-alto border-y border-papel-borda" aria-labelledby="lp-como">
      <div className="lp-wrap">
        <div className="text-center max-w-[640px] mx-auto" data-rv>
          <p className="carimbo text-caneta">sem complicação</p>
          <h2 id="lp-como" className="lp-titulo text-[36px] sm:text-[52px] mt-4">
            Três passos. <span className="text-caneta">Nenhum treinamento.</span>
          </h2>
        </div>

        <ol className="grid md:grid-cols-3 gap-5 mt-14 relative">
          <div
            className="hidden md:block absolute top-[46px] left-[16%] right-[16%] linha-picotada"
            aria-hidden
          />
          {PASSOS.map((p, i) => (
            <li
              key={p.n}
              className="relative canhoto p-6 pt-5"
              data-rv
              style={{ "--rv-atraso": `${i * 0.12}s` } as React.CSSProperties}
            >
              <span className="relative z-10 numeral text-[54px] leading-none text-caneta block">{p.n}</span>
              <h3 className="font-display font-bold text-[21px] tracking-[-0.03em] text-tinta mt-4">{p.titulo}</h3>
              <p className="text-[14.5px] text-tinta-2 mt-2 leading-relaxed">{p.texto}</p>
              <span className="etiqueta mt-5 bg-caneta-fundo text-caneta border-transparent">
                <Icone nome="relogio" tamanho={12} />
                {p.tempo}
              </span>
            </li>
          ))}
        </ol>

        <div className="flex justify-center mt-12" data-rv>
          <Link href={cta.href} className="botao botao-tinta lp-cta !h-[54px] !px-7 text-[16px]">
            {cta.rotulo}
            <span className="lp-seta"><Icone nome="seta" tamanho={18} /></span>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ==================================================================
// DÚVIDAS
// ==================================================================

const PERGUNTAS = [
  {
    p: "É para quem?",
    r: "Para o representante comercial que atende várias indústrias e vive na estrada: quem precisa saber o que vendeu, o que tem a receber de cada representada e por onde passar amanhã.",
  },
  {
    p: "Preciso instalar alguma coisa?",
    r: "Não. Funciona no navegador do celular ou do computador. Se quiser, adicione à tela inicial e ele vira um app, com ícone e notificações.",
  },
  {
    p: "Funciona no iPhone?",
    r: "Sim. Para receber notificações no iPhone é preciso primeiro adicionar o Representei à tela de início pelo Safari.",
  },
  {
    p: "E quando o sinal cai na estrada?",
    r: "O app continua abrindo o que você já viu, e mostra uma página de aviso quando precisa da internet para buscar dado novo.",
  },
  {
    p: "Minhas representadas veem meus dados?",
    r: "Não. Cada conta enxerga só a própria carteira, pedidos e comissões. Nada é compartilhado com as indústrias.",
  },
  {
    p: "Já tenho tudo em planilha. Perco isso?",
    r: "Não. Importe a planilha de clientes ou de pedidos (.xlsx ou .csv): o app reconhece as colunas e mostra uma prévia para você conferir antes de gravar. PDF de pedido da fábrica também entra.",
  },
];

export function Duvidas() {
  return (
    <section id="duvidas" className="py-20 md:py-28 scroll-mt-16" aria-labelledby="lp-faq">
      <div className="lp-wrap grid lg:grid-cols-[0.8fr_1.2fr] gap-10">
        <div data-rv="esq">
          <p className="carimbo text-ambar">dúvidas</p>
          <h2 id="lp-faq" className="lp-titulo text-[36px] sm:text-[48px] mt-4">
            O que todo representante pergunta.
          </h2>
        </div>
        <div className="space-y-3">
          {PERGUNTAS.map((q, i) => (
            <details
              key={q.p}
              className="lp-faq canhoto group"
              data-rv
              style={{ "--rv-atraso": `${i * 0.05}s` } as React.CSSProperties}
            >
              <summary className="flex items-center justify-between gap-4 px-5 py-4">
                <span className="font-display font-semibold text-[17px] tracking-[-0.02em] text-tinta">{q.p}</span>
                <span className="lp-mais w-8 h-8 rounded-full grid place-items-center bg-caneta-fundo text-caneta shrink-0">
                  <Icone nome="mais" tamanho={16} />
                </span>
              </summary>
              <div className="lp-faq-corpo">
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 text-[15px] text-tinta-2 leading-relaxed">{q.r}</p>
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ==================================================================
// CTA FINAL — com papel picado quando aparece
// ==================================================================

const CORES = [
  "var(--color-via-rosa)",
  "var(--color-via-amarela)",
  "var(--color-via-azul)",
  "var(--color-via-verde)",
  "var(--color-caneta-claro)",
];

interface Papel {
  id: number;
  left: number;
  cor: string;
  dx: number;
  giro: number;
  dur: number;
  atraso: number;
}

function gerarPapeis(qtd: number, base = 0): Papel[] {
  return Array.from({ length: qtd }, (_, i) => ({
    id: base + i,
    left: Math.random() * 100,
    cor: CORES[i % CORES.length],
    dx: (Math.random() - 0.5) * 220,
    giro: 360 + Math.random() * 540,
    dur: 1.8 + Math.random() * 1.6,
    atraso: Math.random() * 0.5,
  }));
}

export function Final({ cta }: { cta: Cta }) {
  const { ref, visto } = useNaTela<HTMLElement>(0.45);
  const [papeis, setPapeis] = useState<Papel[]>([]);

  useEffect(() => {
    if (!visto || movimentoReduzido()) return;
    setPapeis(gerarPapeis(46));
  }, [visto]);

  function comemorar() {
    if (movimentoReduzido()) return;
    setPapeis((atual) => [...atual.slice(-40), ...gerarPapeis(30, Date.now())]);
  }

  return (
    <section ref={ref} className="lp-final py-24 md:py-32" aria-labelledby="lp-final">
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {papeis.map((p) => (
          <span
            key={p.id}
            className="lp-confete"
            style={
              {
                left: `${p.left}%`,
                background: p.cor,
                "--dx": `${p.dx}px`,
                "--giro": `${p.giro}deg`,
                "--dur": `${p.dur}s`,
                "--atraso": `${p.atraso}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="lp-wrap relative text-center">
        <div data-rv="zoom">
          <span className="carimbo carimbo-grande text-[color:var(--color-via-verde)] inline-flex">
            próxima comissão: conferida
          </span>
        </div>
        <h2 id="lp-final" className="lp-titulo text-[40px] sm:text-[64px] mt-8 !text-papel max-w-[16ch] mx-auto" data-rv>
          Você já fez a venda. Garanta que o dinheiro chega.
        </h2>
        <p className="text-[17px] opacity-80 mt-6 max-w-[48ch] mx-auto" data-rv>
          Crie a conta agora, cadastre uma representada e veja a primeira comissão conferida hoje mesmo.
        </p>
        <div className="flex flex-col items-center gap-4 mt-10" data-rv>
          <Link
            href={cta.href}
            onPointerEnter={comemorar}
            onFocus={comemorar}
            className="botao lp-cta !h-[60px] !px-9 text-[17px] bg-papel-alto text-tinta hover:!bg-papel"
          >
            {cta.rotulo}
            <span className="lp-seta"><Icone nome="seta" tamanho={19} /></span>
          </Link>
          <p className="text-[13px] opacity-70">Leva 1 minuto · sem cartão de crédito</p>
        </div>
      </div>
    </section>
  );
}
