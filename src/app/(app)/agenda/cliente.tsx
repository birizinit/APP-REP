"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { criarCompromisso } from "@/app/actions/agenda";
import { Icone } from "@/components/icone";
import { Campo, Canhoto, Etiqueta, SeloCurva } from "@/components/ui";
import { cx, duracao, hora, paraInputData } from "@/lib/format";

const NOMES_DIA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

// ==================================================================
// Tira da semana
// ==================================================================

export function TiraSemana({
  dias,
  selecionado,
  inicioSemana,
}: {
  dias: Array<{ data: string; diaSemana: number; diaMes: number; total: number; concluidos: number }>;
  selecionado: string;
  inicioSemana: string;
}) {
  const hojeTexto = paraInputData(new Date());

  const semanaAnterior = new Date(`${inicioSemana}T12:00:00`);
  semanaAnterior.setDate(semanaAnterior.getDate() - 7);
  const semanaSeguinte = new Date(`${inicioSemana}T12:00:00`);
  semanaSeguinte.setDate(semanaSeguinte.getDate() + 7);

  return (
    <div className="canhoto p-2.5">
      <div className="flex items-center gap-1">
        <Link
          href={`/agenda?data=${paraInputData(semanaAnterior)}`}
          aria-label="Semana anterior"
          className="p-2 rounded-lg text-tinta-3 hover:text-tinta shrink-0"
        >
          <Icone nome="setaEsquerda" tamanho={16} />
        </Link>

        <div className="grid grid-cols-7 gap-1 flex-1">
          {dias.map((d) => {
            const ativo = d.data === selecionado;
            const hoje = d.data === hojeTexto;
            const fimDeSemana = d.diaSemana === 0 || d.diaSemana === 6;

            return (
              <Link
                key={d.data}
                href={`/agenda?data=${d.data}`}
                className={cx(
                  "relative flex flex-col items-center py-2 rounded-xl transition-colors",
                  ativo
                    ? "bg-caneta text-white"
                    : fimDeSemana
                      ? "text-tinta-3 hover:bg-[color-mix(in_oklab,var(--color-tinta)_5%,transparent)]"
                      : "text-tinta-2 hover:bg-[color-mix(in_oklab,var(--color-tinta)_5%,transparent)]",
                )}
              >
                <span
                  className={cx(
                    "text-[9.5px] font-bold uppercase tracking-[0.08em]",
                    ativo ? "text-white/70" : "text-tinta-3",
                  )}
                >
                  {NOMES_DIA[d.diaSemana]}
                </span>
                <span
                  className={cx(
                    "numeral text-[17px] mt-0.5",
                    hoje && !ativo && "text-caneta",
                  )}
                >
                  {d.diaMes}
                </span>
                <span className="h-[5px] mt-1 flex items-center gap-[2px]">
                  {d.total > 0
                    ? Array.from({ length: Math.min(4, d.total) }).map((_, i) => (
                        <span
                          key={i}
                          className={cx(
                            "w-[4px] h-[4px] rounded-full",
                            ativo
                              ? "bg-white/75"
                              : i < d.concluidos
                                ? "bg-quitado"
                                : "bg-caneta",
                          )}
                        />
                      ))
                    : null}
                </span>
              </Link>
            );
          })}
        </div>

        <Link
          href={`/agenda?data=${paraInputData(semanaSeguinte)}`}
          aria-label="Próxima semana"
          className="p-2 rounded-lg text-tinta-3 hover:text-tinta shrink-0"
        >
          <Icone nome="seta" tamanho={16} />
        </Link>
      </div>
    </div>
  );
}

// ==================================================================
// Sugestão automática da semana
// ==================================================================

interface ClienteSugerido {
  id: string;
  nome: string;
  curva: "A" | "B" | "C" | "D";
  cidade: string | null;
  motivo: string;
  nivel: string;
  tempoVisitaMin: number;
}

export function SugestaoSemana({
  dias,
  jornadaInicio,
}: {
  dias: Array<{
    data: string;
    diaSemana: number;
    minutosOcupados: number;
    clientes: ClienteSugerido[];
  }>;
  jornadaInicio: string;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [selecionados, setSelecionados] = useState<Record<string, Set<string>>>(() =>
    Object.fromEntries(dias.map((d) => [d.data, new Set(d.clientes.map((c) => c.id))])),
  );
  const [feito, setFeito] = useState(0);

  const total = useMemo(
    () => Object.values(selecionados).reduce((s, set) => s + set.size, 0),
    [selecionados],
  );

  function alternar(data: string, id: string) {
    setSelecionados((atual) => {
      const copia = { ...atual };
      const set = new Set(copia[data]);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      copia[data] = set;
      return copia;
    });
  }

  function aplicar() {
    iniciar(async () => {
      let criados = 0;
      for (const dia of dias) {
        const escolhidos = dia.clientes.filter((c) => selecionados[dia.data]?.has(c.id));
        let minuto = 0;
        for (const cliente of escolhidos) {
          const [h, m] = jornadaInicio.split(":").map(Number);
          const inicio = new Date(`${dia.data}T00:00:00`);
          inicio.setHours(h, m + minuto, 0, 0);
          minuto += cliente.tempoVisitaMin + 25;

          const dados = new FormData();
          dados.set("clientId", cliente.id);
          dados.set("tipo", "VISITA");
          dados.set("inicio", `${dia.data}T${String(inicio.getHours()).padStart(2, "0")}:${String(inicio.getMinutes()).padStart(2, "0")}`);
          dados.set("duracao", String(cliente.tempoVisitaMin));
          await criarCompromisso(dados);
          criados++;
        }
      }
      setFeito(criados);
      router.refresh();
    });
  }

  if (feito > 0) {
    return (
      <Canhoto className="p-5 my-4 text-center anim-subir">
        <span className="inline-flex w-11 h-11 rounded-2xl bg-quitado-fundo text-quitado items-center justify-center mb-3">
          <Icone nome="check" tamanho={22} />
        </span>
        <p className="text-[16px] text-tinta">{feito} visitas marcadas na semana.</p>
        <p className="text-[13px] text-tinta-3 mt-1.5">
          Agora é só montar a rota de cada dia para saber o custo.
        </p>
        <Link href="/rotas?novo=1" className="botao botao-tinta mt-4 inline-flex">
          <Icone nome="rota" tamanho={16} />
          Montar rotas
        </Link>
      </Canhoto>
    );
  }

  return (
    <Canhoto picotado className="my-4 overflow-hidden anim-subir">
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-xl grid place-items-center bg-caneta-fundo text-caneta shrink-0">
            <Icone nome="alvo" tamanho={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] text-tinta">Semana sugerida</h2>
            <p className="text-[12.5px] text-tinta-3 mt-0.5 leading-snug">
              Ordenado por quem está mais atrasado, agrupando por região para não cruzar a cidade
              duas vezes. Desmarque quem não quiser.
            </p>
          </div>
          <Link href="/agenda" className="p-1.5 -mr-1 text-tinta-3 shrink-0" aria-label="Fechar">
            <Icone nome="fechar" tamanho={18} />
          </Link>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-4 max-h-[52vh] overflow-y-auto sem-barra">
        {dias.map((dia) => {
          const data = new Date(`${dia.data}T12:00:00`);
          const marcados = dia.clientes.filter((c) => selecionados[dia.data]?.has(c.id)).length;

          return (
            <div key={dia.data}>
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tinta-3">
                  {NOMES_DIA[dia.diaSemana]} {data.getDate()}/{data.getMonth() + 1}
                </p>
                <p className="text-[11px] text-tinta-3">
                  {marcados} visitas · {duracao(dia.minutosOcupados)}
                </p>
              </div>

              {dia.clientes.length === 0 ? (
                <p className="text-[12.5px] text-tinta-3 italic">Nada urgente para este dia.</p>
              ) : (
                <div className="space-y-1.5">
                  {dia.clientes.map((c) => {
                    const on = selecionados[dia.data]?.has(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => alternar(dia.data, c.id)}
                        className={cx(
                          "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl border text-left transition-colors",
                          on ? "border-caneta bg-caneta-fundo" : "border-papel-borda opacity-60",
                        )}
                      >
                        <span
                          className={cx(
                            "w-[18px] h-[18px] rounded-md border-2 grid place-items-center shrink-0",
                            on ? "bg-caneta border-caneta text-white" : "border-papel-borda",
                          )}
                        >
                          {on ? <Icone nome="check" tamanho={11} /> : null}
                        </span>
                        <SeloCurva curva={c.curva} tamanho={19} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-semibold text-tinta truncate">
                            {c.nome}
                          </span>
                          <span
                            className={cx(
                              "block text-[11.5px] truncate",
                              c.nivel === "critico" ? "text-carimbo" : "text-tinta-3",
                            )}
                          >
                            {c.motivo}
                            {c.cidade ? ` · ${c.cidade}` : ""}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-papel-borda p-3 flex items-center gap-2">
        <Link href="/agenda" className="botao botao-papel flex-1">
          Agora não
        </Link>
        <button
          type="button"
          onClick={aplicar}
          disabled={pendente || total === 0}
          className="botao botao-tinta flex-1"
        >
          {pendente ? "Marcando..." : `Marcar ${total} visitas`}
        </button>
      </div>
    </Canhoto>
  );
}

// ==================================================================
// Novo compromisso
// ==================================================================

const TIPOS = [
  { valor: "VISITA", rotulo: "Visita", icone: "clientes" as const },
  { valor: "PROSPECCAO", rotulo: "Prospecção", icone: "alvo" as const },
  { valor: "COBRANCA", rotulo: "Cobrança", icone: "comissao" as const },
  { valor: "REUNIAO", rotulo: "Reunião", icone: "usuario" as const },
  { valor: "ENTREGA", rotulo: "Entrega", icone: "veiculo" as const },
  { valor: "PESSOAL", rotulo: "Pessoal", icone: "relogio" as const },
];

export function FormCompromisso({
  data,
  clientes,
  representadas,
  clientePreSelecionado,
}: {
  data: string;
  clientes: Array<{
    id: string;
    nome: string;
    cidade: string | null;
    uf: string | null;
    curva: "A" | "B" | "C" | "D";
    regiao: string | null;
    tempoVisitaMin: number;
  }>;
  representadas: Array<{ id: string; nome: string }>;
  clientePreSelecionado: string | null;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pendente, iniciar] = useTransition();

  const [tipo, setTipo] = useState("VISITA");
  const [clienteId, setClienteId] = useState(clientePreSelecionado ?? "");
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const clienteEscolhido = clientes.find((c) => c.id === clienteId);
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return clientes.slice(0, 40);
    return clientes
      .filter(
        (c) =>
          c.nome.toLowerCase().includes(termo) ||
          (c.cidade ?? "").toLowerCase().includes(termo) ||
          (c.regiao ?? "").toLowerCase().includes(termo),
      )
      .slice(0, 40);
  }, [busca, clientes]);

  function fechar() {
    const url = new URLSearchParams(params.toString());
    url.delete("novo");
    url.delete("cliente");
    router.push(`/agenda?${url.toString()}`);
  }

  function enviar(form: FormData) {
    setErro(null);
    iniciar(async () => {
      const r = await criarCompromisso(form);
      if (r?.erro) {
        setErro(r.erro);
        return;
      }
      fechar();
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button
        type="button"
        aria-label="Fechar"
        onClick={fechar}
        className="absolute inset-0 bg-[rgba(10,8,4,0.5)] anim-surgir backdrop-blur-[2px]"
      />

      <form
        action={enviar}
        className="relative w-full sm:max-w-[480px] max-h-[92dvh] overflow-y-auto sem-barra anim-subir"
      >
        <div className="canhoto m-2 sm:m-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2 sticky top-0 vidro z-10">
            <h2 className="text-[17px]">Novo compromisso</h2>
            <button type="button" onClick={fechar} className="p-1.5 -mr-1.5 text-tinta-3">
              <Icone nome="fechar" tamanho={19} />
            </button>
          </div>

          <div className="p-4 pt-2 space-y-4">
            {/* tipo */}
            <div>
              <span className="rotulo">Tipo</span>
              <div className="grid grid-cols-3 gap-1.5">
                {TIPOS.map((t) => (
                  <button
                    key={t.valor}
                    type="button"
                    onClick={() => setTipo(t.valor)}
                    className={cx(
                      "flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[11.5px] font-semibold transition-colors",
                      tipo === t.valor
                        ? "border-caneta bg-caneta-fundo text-caneta"
                        : "border-papel-borda text-tinta-3",
                    )}
                  >
                    <Icone nome={t.icone} tamanho={16} />
                    {t.rotulo}
                  </button>
                ))}
              </div>
              <input type="hidden" name="tipo" value={tipo} />
            </div>

            {/* cliente */}
            {tipo !== "PESSOAL" && tipo !== "REUNIAO" ? (
              <div>
                <span className="rotulo">Cliente</span>
                {clienteEscolhido ? (
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-caneta bg-caneta-fundo">
                    <SeloCurva curva={clienteEscolhido.curva} tamanho={22} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-semibold text-tinta truncate">
                        {clienteEscolhido.nome}
                      </span>
                      <span className="block text-[11.5px] text-tinta-3 truncate">
                        {clienteEscolhido.cidade
                          ? `${clienteEscolhido.cidade}/${clienteEscolhido.uf}`
                          : "Sem endereço"}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setClienteId("")}
                      className="p-1.5 text-tinta-3 shrink-0"
                      aria-label="Trocar cliente"
                    >
                      <Icone nome="fechar" tamanho={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tinta-3">
                        <Icone nome="busca" tamanho={16} />
                      </span>
                      <input
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar por nome, cidade ou região"
                        className="campo pl-9"
                      />
                    </div>
                    <div className="mt-1.5 max-h-[170px] overflow-y-auto sem-barra rounded-xl border border-papel-borda divide-y divide-[var(--color-papel-borda)]">
                      {filtrados.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setClienteId(c.id)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-left active:bg-caneta-fundo"
                        >
                          <SeloCurva curva={c.curva} tamanho={19} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-medium text-tinta truncate">
                              {c.nome}
                            </span>
                            <span className="block text-[11px] text-tinta-3 truncate">
                              {c.cidade ? `${c.cidade}/${c.uf}` : "Sem endereço"}
                            </span>
                          </span>
                        </button>
                      ))}
                      {filtrados.length === 0 ? (
                        <p className="px-3 py-4 text-[12.5px] text-tinta-3 text-center">
                          Nenhum cliente encontrado.
                        </p>
                      ) : null}
                    </div>
                  </>
                )}
                <input type="hidden" name="clientId" value={clienteId} />
              </div>
            ) : null}

            {tipo === "REUNIAO" ? (
              <Campo rotulo="Representada">
                <select name="representadaId" className="campo">
                  <option value="">Nenhuma</option>
                  {representadas.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome}
                    </option>
                  ))}
                </select>
              </Campo>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Quando" obrigatorio>
                <input
                  type="datetime-local"
                  name="inicio"
                  defaultValue={`${data}T09:00`}
                  className="campo"
                  required
                />
              </Campo>
              <Campo rotulo="Duração">
                <select
                  name="duracao"
                  className="campo"
                  defaultValue={String(clienteEscolhido?.tempoVisitaMin ?? 45)}
                >
                  {[20, 30, 45, 60, 90, 120].map((m) => (
                    <option key={m} value={m}>
                      {m} minutos
                    </option>
                  ))}
                </select>
              </Campo>
            </div>

            <Campo rotulo="Título" dica="Deixe em branco que eu monto pelo cliente e tipo.">
              <input name="titulo" className="campo" placeholder="Ex.: Apresentar linha nova" />
            </Campo>

            <Campo rotulo="Observação">
              <textarea
                name="descricao"
                rows={2}
                className="campo resize-none"
                placeholder="O que precisa levar, o que ficou pendente..."
              />
            </Campo>

            <Campo rotulo="Me lembrar">
              <select name="lembreteMin" className="campo" defaultValue="30">
                <option value="0">Na hora</option>
                <option value="15">15 minutos antes</option>
                <option value="30">30 minutos antes</option>
                <option value="60">1 hora antes</option>
                <option value="120">2 horas antes</option>
              </select>
            </Campo>

            {erro ? (
              <p className="flex items-center gap-2 text-[13px] text-carimbo bg-carimbo-fundo rounded-xl px-3 py-2.5">
                <Icone nome="alerta" tamanho={15} />
                {erro}
              </p>
            ) : null}
          </div>

          <div className="border-t border-papel-borda p-3 flex gap-2 sticky bottom-0 vidro">
            <button type="button" onClick={fechar} className="botao botao-papel flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={pendente} className="botao botao-tinta flex-1">
              {pendente ? "Salvando..." : "Marcar"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
