"use client";

import { useEffect, useRef, useState } from "react";

const reais = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const reaisCentavos = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const inteiro = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const fmt = {
  reais: (v: number) => reais.format(v),
  centavos: (v: number) => reaisCentavos.format(v),
  inteiro: (v: number) => inteiro.format(v),
  decimal: (v: number) => decimal.format(v),
};

export function movimentoReduzido() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Revela tudo que tem [data-rv] quando entra na tela. Um observador só para a
 * página inteira. Também marca o pai com .lp-visto para animar filhos (barras).
 */
export function useRevelar() {
  useEffect(() => {
    const alvos = Array.from(document.querySelectorAll<HTMLElement>("[data-rv], [data-rv-grupo]"));
    if (movimentoReduzido() || !("IntersectionObserver" in window)) {
      alvos.forEach((el) => el.classList.add("lp-visto"));
      return;
    }
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) {
            e.target.classList.add("lp-visto");
            obs.unobserve(e.target);
          }
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -6% 0px" },
    );
    alvos.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

/** true a partir da primeira vez que o elemento aparece na tela. */
export function useNaTela<T extends HTMLElement>(limiar = 0.3) {
  const ref = useRef<T>(null);
  const [visto, setVisto] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setVisto(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisto(true);
          obs.disconnect();
        }
      },
      { threshold: limiar },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [limiar]);
  return { ref, visto };
}

/**
 * Número que corre até o valor. Na primeira vez espera aparecer na tela;
 * depois, cada mudança anima a partir do valor anterior.
 */
export function Contador({
  valor,
  formato = fmt.inteiro,
  duracao = 1100,
  className,
}: {
  valor: number;
  formato?: (v: number) => string;
  duracao?: number;
  className?: string;
}) {
  const { ref, visto } = useNaTela<HTMLSpanElement>(0.2);
  const [mostrado, setMostrado] = useState(0);
  const atual = useRef(0);
  const [pulso, setPulso] = useState(0);

  useEffect(() => {
    if (!visto) return;
    const de = atual.current;
    const para = valor;
    if (movimentoReduzido() || de === para) {
      atual.current = para;
      setMostrado(para);
      return;
    }
    let quadro = 0;
    const inicio = performance.now();
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracao);
      const suave = 1 - Math.pow(1 - t, 4);
      const v = de + (para - de) * suave;
      atual.current = v;
      setMostrado(v);
      if (t < 1) quadro = requestAnimationFrame(passo);
      else setPulso((p) => p + 1);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [valor, visto, duracao]);

  return (
    <span ref={ref} key={pulso} className={`inline-block ${pulso ? "lp-pulsa" : ""} ${className ?? ""}`}>
      {formato(mostrado)}
    </span>
  );
}

/** Luz que segue o mouse dentro de um cartão (.lp-bento usa --mx/--my). */
export function seguirMouse(e: React.PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

/** Posição do preenchimento do slider (0-100%), para pintar a trilha. */
export function preenchido(v: number, min: number, max: number) {
  return { "--preenchido": `${((v - min) / (max - min)) * 100}%` } as React.CSSProperties;
}
