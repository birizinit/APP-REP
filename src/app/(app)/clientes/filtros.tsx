"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { geocodificarPendentes, recalcularCurvaABC } from "@/app/actions/clientes";
import { Icone } from "@/components/icone";
import { Canhoto } from "@/components/ui";
import { cx } from "@/lib/format";

const STATUS = [
  { valor: "", rotulo: "Todos" },
  { valor: "ATIVO", rotulo: "Ativos" },
  { valor: "PROSPECT", rotulo: "Prospects" },
  { valor: "EM_RISCO", rotulo: "Em risco" },
  { valor: "INATIVO", rotulo: "Inativos" },
];

const ORDENS = [
  { valor: "", rotulo: "A-Z", icone: "menu" as const },
  { valor: "risco", rotulo: "Urgência", icone: "fogo" as const },
  { valor: "valor", rotulo: "Faturamento", icone: "grafico" as const },
  { valor: "visita", rotulo: "Visita antiga", icone: "relogio" as const },
];

export function FiltrosClientes({
  regioes,
  atual,
  abrirBusca,
}: {
  regioes: Array<{ id: string; nome: string; cor: string; total: number }>;
  atual: { q: string; status: string; curva: string; regiao: string; ordem: string };
  abrirBusca: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [termo, setTermo] = useState(atual.q);
  const campo = useRef<HTMLInputElement>(null);
  const [avancado, setAvancado] = useState(
    Boolean(atual.curva || atual.regiao || atual.ordem),
  );

  useEffect(() => {
    if (abrirBusca) campo.current?.focus();
  }, [abrirBusca]);

  function aplicar(chave: string, valor: string) {
    const url = new URLSearchParams(params.toString());
    url.delete("busca");
    if (valor) url.set(chave, valor);
    else url.delete(chave);
    router.push(`/clientes?${url.toString()}`);
  }

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    aplicar("q", termo.trim());
  }

  const temFiltro = Boolean(atual.q || atual.status || atual.curva || atual.regiao || atual.ordem);

  return (
    <div className="mb-4">
      <form onSubmit={buscar} className="relative mb-2.5">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tinta-3">
          <Icone nome="busca" tamanho={17} />
        </span>
        <input
          ref={campo}
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Nome, CNPJ, cidade ou contato"
          className="campo pl-10 pr-24"
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {termo ? (
            <button
              type="button"
              onClick={() => {
                setTermo("");
                aplicar("q", "");
              }}
              className="p-1.5 text-tinta-3"
              aria-label="Limpar busca"
            >
              <Icone nome="fechar" tamanho={16} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setAvancado((v) => !v)}
            className={cx(
              "p-2 rounded-lg transition-colors",
              avancado ? "text-caneta bg-caneta-fundo" : "text-tinta-3",
            )}
            aria-label="Mais filtros"
          >
            <Icone nome="filtro" tamanho={16} />
          </button>
        </div>
      </form>

      <div className="flex gap-1.5 overflow-x-auto sem-barra pb-0.5">
        {STATUS.map((s) => (
          <button
            key={s.valor}
            type="button"
            onClick={() => aplicar("status", s.valor)}
            className={cx(
              "etiqueta shrink-0 transition-colors",
              atual.status === s.valor
                ? "bg-caneta text-white border-caneta"
                : "border-papel-borda text-tinta-3",
            )}
          >
            {s.rotulo}
          </button>
        ))}
      </div>

      {avancado ? (
        <Canhoto className="p-3.5 mt-2.5 anim-subir">
          <div className="space-y-3">
            <div>
              <p className="rotulo mb-1.5">Ordenar por</p>
              <div className="flex flex-wrap gap-1.5">
                {ORDENS.map((o) => (
                  <button
                    key={o.valor}
                    type="button"
                    onClick={() => aplicar("ordem", o.valor)}
                    className={cx(
                      "etiqueta transition-colors",
                      atual.ordem === o.valor
                        ? "bg-caneta text-white border-caneta"
                        : "border-papel-borda text-tinta-3",
                    )}
                  >
                    <Icone nome={o.icone} tamanho={12} />
                    {o.rotulo}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="rotulo mb-1.5">Curva ABC</p>
              <div className="flex flex-wrap gap-1.5">
                {["", "A", "B", "C", "D"].map((c) => (
                  <button
                    key={c || "todas"}
                    type="button"
                    onClick={() => aplicar("curva", c)}
                    className={cx(
                      "etiqueta transition-colors",
                      atual.curva === c
                        ? "bg-caneta text-white border-caneta"
                        : "border-papel-borda text-tinta-3",
                    )}
                  >
                    {c || "Todas"}
                  </button>
                ))}
              </div>
            </div>

            {regioes.length > 0 ? (
              <div>
                <p className="rotulo mb-1.5">Região</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => aplicar("regiao", "")}
                    className={cx(
                      "etiqueta transition-colors",
                      !atual.regiao ? "bg-caneta text-white border-caneta" : "border-papel-borda text-tinta-3",
                    )}
                  >
                    Todas
                  </button>
                  {regioes.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => aplicar("regiao", r.id)}
                      className={cx(
                        "etiqueta transition-colors",
                        atual.regiao === r.id
                          ? "text-white border-transparent"
                          : "border-papel-borda text-tinta-3",
                      )}
                      style={atual.regiao === r.id ? { background: r.cor } : undefined}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: atual.regiao === r.id ? "#fff" : r.cor }}
                      />
                      {r.nome}
                      <span className="opacity-60">{r.total}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {temFiltro ? (
              <button
                type="button"
                onClick={() => router.push("/clientes")}
                className="botao botao-fantasma w-full text-[13px]"
              >
                <Icone nome="atualizar" tamanho={14} />
                Limpar tudo
              </button>
            ) : null}
          </div>
        </Canhoto>
      ) : null}
    </div>
  );
}

// ==================================================================

export function FerramentasCarteira({ semCoordenada }: { semCoordenada: number }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);

  function recalcular() {
    iniciar(async () => {
      const r = await recalcularCurvaABC();
      setAviso(
        r.mudaram > 0
          ? `Curva recalculada: ${r.mudaram} de ${r.total} clientes mudaram de faixa.`
          : "Curva já estava certa — ninguém mudou de faixa.",
      );
      router.refresh();
    });
  }

  function localizar() {
    iniciar(async () => {
      const r = await geocodificarPendentes();
      setAviso(
        r.achados > 0
          ? `Encontrei ${r.achados} de ${r.total} endereços. Rode de novo se ainda sobrar.`
          : "Não consegui localizar nenhum. Confira CEP e cidade no cadastro.",
      );
      router.refresh();
    });
  }

  return (
    <div className="mb-5">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={recalcular}
          disabled={pendente}
          className="botao botao-papel text-[12.5px] px-3 py-2"
        >
          <Icone nome="grafico" tamanho={14} />
          Recalcular curva ABC
        </button>
        {semCoordenada > 0 ? (
          <button
            type="button"
            onClick={localizar}
            disabled={pendente}
            className="botao botao-papel text-[12.5px] px-3 py-2"
          >
            <Icone nome="pino" tamanho={14} />
            Localizar {semCoordenada} no mapa
          </button>
        ) : null}
      </div>

      {pendente ? (
        <p className="text-[12.5px] text-tinta-3 mt-2 flex items-center gap-1.5">
          <span className="anim-rodar">
            <Icone nome="atualizar" tamanho={13} />
          </span>
          Trabalhando... a busca de endereço leva ~1s por cliente.
        </p>
      ) : aviso ? (
        <p className="text-[12.5px] text-quitado mt-2 flex items-center gap-1.5 anim-surgir">
          <Icone nome="check" tamanho={13} />
          {aviso}
        </p>
      ) : null}
    </div>
  );
}
