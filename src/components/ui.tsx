import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { Icone, type NomeIcone } from "@/components/icone";
import { cx, dinheiro, iniciais, num } from "@/lib/format";

// ==================================================================
// Canhoto — o cartao do sistema
// ==================================================================

export function Canhoto({
  className,
  picotado,
  children,
  ...props
}: ComponentProps<"div"> & { picotado?: boolean }) {
  return (
    <div className={cx("canhoto", picotado && "picote", className)} {...props}>
      {children}
    </div>
  );
}

export function CanhotoTitulo({
  titulo,
  sub,
  icone,
  acao,
}: {
  titulo: string;
  sub?: string;
  icone?: NomeIcone | string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
      <div className="flex items-start gap-2.5 min-w-0">
        {icone ? (
          <span className="mt-0.5 shrink-0 text-caneta">
            <Icone nome={icone} tamanho={19} />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-[15px] leading-tight text-tinta truncate">{titulo}</h2>
          {sub ? <p className="text-[12.5px] text-tinta-3 mt-0.5 leading-snug">{sub}</p> : null}
        </div>
      </div>
      {acao ? <div className="shrink-0">{acao}</div> : null}
    </div>
  );
}

// ==================================================================
// Etiqueta
// ==================================================================

export type Tom =
  | "neutro"
  | "tinta"
  | "carimbo"
  | "quitado"
  | "ambar"
  | "rosa"
  | "amarela"
  | "azul"
  | "verde";

const tons: Record<Tom, string> = {
  neutro: "bg-[color-mix(in_oklab,var(--color-tinta)_8%,transparent)] text-tinta-2 border-[color-mix(in_oklab,var(--color-tinta)_12%,transparent)]",
  tinta: "bg-caneta-fundo text-caneta border-[color-mix(in_oklab,var(--color-caneta)_25%,transparent)]",
  carimbo: "bg-carimbo-fundo text-carimbo border-[color-mix(in_oklab,var(--color-carimbo)_30%,transparent)]",
  quitado: "bg-quitado-fundo text-quitado border-[color-mix(in_oklab,var(--color-quitado)_30%,transparent)]",
  ambar: "bg-ambar-fundo text-ambar border-[color-mix(in_oklab,var(--color-ambar)_32%,transparent)]",
  rosa: "bg-[color-mix(in_oklab,var(--color-via-rosa)_22%,transparent)] text-tinta-2 border-[color-mix(in_oklab,var(--color-via-rosa)_45%,transparent)]",
  amarela: "bg-[color-mix(in_oklab,var(--color-via-amarela)_25%,transparent)] text-tinta-2 border-[color-mix(in_oklab,var(--color-via-amarela)_50%,transparent)]",
  azul: "bg-[color-mix(in_oklab,var(--color-via-azul)_22%,transparent)] text-tinta-2 border-[color-mix(in_oklab,var(--color-via-azul)_45%,transparent)]",
  verde: "bg-[color-mix(in_oklab,var(--color-via-verde)_22%,transparent)] text-tinta-2 border-[color-mix(in_oklab,var(--color-via-verde)_45%,transparent)]",
};

export function Etiqueta({
  tom = "neutro",
  icone,
  children,
  className,
}: {
  tom?: Tom;
  icone?: NomeIcone | string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cx("etiqueta", tons[tom], className)}>
      {icone ? <Icone nome={icone} tamanho={12} /> : null}
      {children}
    </span>
  );
}

// ==================================================================
// Carimbo
// ==================================================================

export function Carimbo({
  children,
  tom = "carimbo",
  grande,
  batendo,
  className,
}: {
  children: ReactNode;
  tom?: "carimbo" | "quitado" | "tinta" | "neutro";
  grande?: boolean;
  batendo?: boolean;
  className?: string;
}) {
  const cores = {
    carimbo: "text-carimbo",
    quitado: "text-quitado",
    tinta: "text-caneta",
    neutro: "text-tinta-3",
  };
  return (
    <span
      className={cx(
        "carimbo",
        grande && "carimbo-grande",
        batendo && "carimbo-batendo",
        cores[tom],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ==================================================================
// Botoes
// ==================================================================

type Variante = "tinta" | "papel" | "fantasma";

const variantes: Record<Variante, string> = {
  tinta: "botao-tinta",
  papel: "botao-papel",
  fantasma: "botao-fantasma",
};

export function Botao({
  variante = "papel",
  icone,
  className,
  children,
  ...props
}: ComponentProps<"button"> & { variante?: Variante; icone?: NomeIcone | string }) {
  return (
    <button className={cx("botao", variantes[variante], className)} {...props}>
      {icone ? <Icone nome={icone} tamanho={17} /> : null}
      {children}
    </button>
  );
}

export function BotaoLink({
  variante = "papel",
  icone,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variante?: Variante; icone?: NomeIcone | string }) {
  return (
    <Link className={cx("botao", variantes[variante], className)} {...props}>
      {icone ? <Icone nome={icone} tamanho={17} /> : null}
      {children}
    </Link>
  );
}

// ==================================================================
// Numeros
// ==================================================================

export function Cifra({
  valor,
  tamanho = "normal",
  tom,
  sinal,
  className,
}: {
  /** Aceita number, string ou Decimal do Prisma — num() normaliza. */
  valor: unknown;
  tamanho?: "pequeno" | "normal" | "grande" | "gigante";
  tom?: "tinta" | "carimbo" | "quitado" | "suave";
  sinal?: boolean;
  className?: string;
}) {
  const n = num(valor);
  const tamanhos = {
    pequeno: "text-[12.5px]",
    normal: "text-[15px]",
    grande: "text-[22px]",
    gigante: "text-[30px] sm:text-[38px]",
  };
  const tons = {
    tinta: "text-tinta",
    carimbo: "text-carimbo",
    quitado: "text-quitado",
    suave: "text-tinta-3",
  };
  const autoTom = tom ?? (sinal ? (n < 0 ? "carimbo" : "quitado") : "tinta");
  return (
    <span className={cx("cifra font-medium", tamanhos[tamanho], tons[autoTom], className)}>
      {sinal && n > 0 ? "+" : ""}
      {dinheiro(n)}
    </span>
  );
}

/** Tile de indicador — usado nas faixas de resumo. */
export function Tile({
  rotulo,
  valor,
  detalhe,
  icone,
  tom = "neutro",
  href,
}: {
  rotulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
  icone?: NomeIcone | string;
  tom?: "neutro" | "tinta" | "carimbo" | "quitado" | "ambar";
  href?: string;
}) {
  const barras = {
    neutro: "before:bg-[var(--color-tinta-3)]",
    tinta: "before:bg-[var(--color-caneta)]",
    carimbo: "before:bg-[var(--color-carimbo)]",
    quitado: "before:bg-[var(--color-quitado)]",
    ambar: "before:bg-[var(--color-ambar)]",
  };
  const cores = {
    neutro: "text-tinta-3",
    tinta: "text-caneta",
    carimbo: "text-carimbo",
    quitado: "text-quitado",
    ambar: "text-ambar",
  };

  const conteudo = (
    <div
      className={cx(
        "canhoto relative overflow-hidden px-3.5 py-3 h-full",
        "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px]",
        barras[tom],
      )}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        {icone ? (
          <span className={cores[tom]}>
            <Icone nome={icone} tamanho={13} />
          </span>
        ) : null}
        <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-tinta-3">{rotulo}</span>
      </div>
      <div className="leading-none">{valor}</div>
      {detalhe ? <div className="text-[11.5px] text-tinta-3 mt-1.5 leading-snug">{detalhe}</div> : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-transform active:scale-[0.985]">
        {conteudo}
      </Link>
    );
  }
  return conteudo;
}

// ==================================================================
// Progresso
// ==================================================================

export function Progresso({
  valor,
  meta,
  cor,
  altura = 8,
  mostrarMarca = true,
}: {
  valor: number;
  meta: number;
  cor?: string;
  altura?: number;
  mostrarMarca?: boolean;
}) {
  const pct = meta > 0 ? Math.min(100, Math.max(0, (valor / meta) * 100)) : 0;
  const bateu = pct >= 100;
  return (
    <div
      className="relative w-full rounded-full overflow-hidden bg-[color-mix(in_oklab,var(--color-tinta)_10%,transparent)]"
      style={{ height: altura }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{
          width: `${pct}%`,
          background: cor ?? (bateu ? "var(--color-quitado)" : "var(--color-caneta)"),
          transitionTimingFunction: "var(--ease-talao)",
        }}
      />
      {mostrarMarca && !bateu ? (
        <div
          className="absolute top-0 bottom-0 w-px bg-[color-mix(in_oklab,var(--color-tinta)_35%,transparent)]"
          style={{ left: "100%" }}
        />
      ) : null}
    </div>
  );
}

// ==================================================================
// Avatar
// ==================================================================

export function Avatar({
  nome,
  cor,
  tamanho = 38,
  imagem,
}: {
  nome: string | null | undefined;
  cor?: string;
  tamanho?: number;
  imagem?: string | null;
}) {
  if (imagem) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imagem}
        alt={nome ?? ""}
        width={tamanho}
        height={tamanho}
        className="rounded-xl object-cover border border-papel-borda"
        style={{ width: tamanho, height: tamanho }}
      />
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-xl font-bold shrink-0 select-none"
      style={{
        width: tamanho,
        height: tamanho,
        fontSize: tamanho * 0.36,
        background: cor ? `color-mix(in oklab, ${cor} 16%, transparent)` : "var(--color-caneta-fundo)",
        color: cor ?? "var(--color-caneta)",
        border: `1px solid color-mix(in oklab, ${cor ?? "var(--color-caneta)"} 28%, transparent)`,
        fontFamily: "var(--font-display)",
        letterSpacing: "-0.02em",
      }}
    >
      {iniciais(nome)}
    </span>
  );
}

// ==================================================================
// Curva ABC
// ==================================================================

export function SeloCurva({ curva, tamanho = 22 }: { curva: "A" | "B" | "C" | "D"; tamanho?: number }) {
  const cores = {
    A: "var(--color-curva-a)",
    B: "var(--color-curva-b)",
    C: "var(--color-curva-c)",
    D: "var(--color-curva-d)",
  };
  return (
    <span
      title={`Curva ${curva}`}
      className="inline-flex items-center justify-center rounded-md font-bold shrink-0"
      style={{
        width: tamanho,
        height: tamanho,
        fontSize: tamanho * 0.5,
        color: cores[curva],
        background: `color-mix(in oklab, ${cores[curva]} 14%, transparent)`,
        border: `1.5px solid color-mix(in oklab, ${cores[curva]} 40%, transparent)`,
        fontFamily: "var(--font-display)",
      }}
    >
      {curva}
    </span>
  );
}

// ==================================================================
// Separadores
// ==================================================================

export function LinhaPicotada({ rotulo }: { rotulo?: string }) {
  if (!rotulo) return <div className="linha-picotada my-4" />;
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="linha-picotada flex-1" />
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-tinta-3 shrink-0">
        {rotulo}
      </span>
      <div className="linha-picotada flex-1" />
    </div>
  );
}

export function Secao({
  titulo,
  acao,
  children,
  className,
}: {
  titulo: string;
  acao?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("mb-7", className)}>
      <div className="flex items-end justify-between gap-3 mb-2.5 px-0.5">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.12em] text-tinta-3">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

// ==================================================================
// Campos de formulario
// ==================================================================

export function Campo({
  rotulo,
  dica,
  erro,
  obrigatorio,
  children,
  className,
}: {
  rotulo?: string;
  dica?: string;
  erro?: string | null;
  obrigatorio?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("block", className)}>
      {rotulo ? (
        <span className="rotulo">
          {rotulo}
          {obrigatorio ? <span className="text-carimbo ml-0.5">*</span> : null}
        </span>
      ) : null}
      {children}
      {erro ? (
        <span className="mt-1.5 flex items-center gap-1 text-[12px] text-carimbo">
          <Icone nome="alerta" tamanho={13} />
          {erro}
        </span>
      ) : dica ? (
        <span className="mt-1.5 block text-[12px] text-tinta-3 leading-snug">{dica}</span>
      ) : null}
    </label>
  );
}

// ==================================================================
// Estado vazio
// ==================================================================

export function Vazio({
  titulo,
  descricao,
  ilustracao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  ilustracao?: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <div className="canhoto flex flex-col items-center text-center px-6 py-10 anim-subir">
      {ilustracao ? <div className="mb-4 text-tinta-3 opacity-90">{ilustracao}</div> : null}
      <h3 className="text-[17px] text-tinta mb-1.5">{titulo}</h3>
      {descricao ? (
        <p className="text-[13.5px] text-tinta-3 max-w-[38ch] leading-relaxed mb-5">{descricao}</p>
      ) : null}
      {acao}
    </div>
  );
}
