"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  buscarPorCep,
  buscarPorCnpj,
  conferirDuplicado,
  salvarCliente,
} from "@/app/actions/clientes";
import { Icone } from "@/components/icone";
import { Campo, Canhoto, CanhotoTitulo, Carimbo, Etiqueta, LinhaPicotada } from "@/components/ui";
import { cx, dataBR, dinheiro, formatarCnpj, paraInputData, soDigitos } from "@/lib/format";

interface Valores {
  id?: string;
  tipoPessoa: string;
  cnpj: string;
  cpf: string;
  razaoSocial: string;
  nomeFantasia: string;
  inscricaoEstadual: string;
  email: string;
  telefone: string;
  whatsapp: string;
  contatoNome: string;
  contatoCargo: string;
  contatoEmail: string;
  contatoFone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  pontoReferencia: string;
  regionId: string;
  curva: string;
  curvaAutomatica: boolean;
  status: string;
  frequenciaVisitaDias: string;
  tempoVisitaMin: string;
  horaAbre: string;
  horaFecha: string;
  condicaoPagamento: string;
  limiteCredito: string;
  potencialMensal: string;
  origem: string;
  observacoes: string;
  tags: string;
  lat: string;
  lng: string;
  representadas: string[];
}

const VAZIO: Valores = {
  tipoPessoa: "PJ",
  cnpj: "",
  cpf: "",
  razaoSocial: "",
  nomeFantasia: "",
  inscricaoEstadual: "",
  email: "",
  telefone: "",
  whatsapp: "",
  contatoNome: "",
  contatoCargo: "",
  contatoEmail: "",
  contatoFone: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  pontoReferencia: "",
  regionId: "",
  curva: "C",
  curvaAutomatica: true,
  status: "PROSPECT",
  frequenciaVisitaDias: "30",
  tempoVisitaMin: "40",
  horaAbre: "08:00",
  horaFecha: "18:00",
  condicaoPagamento: "",
  limiteCredito: "",
  potencialMensal: "",
  origem: "",
  observacoes: "",
  tags: "",
  lat: "",
  lng: "",
  representadas: [],
};

interface FichaReceita {
  razaoSocial: string;
  nomeFantasia: string | null;
  situacaoCadastral: string | null;
  cnaeDescricao: string | null;
  porte: string | null;
  dataAbertura: string | null;
  capitalSocial: number | null;
  socios: Array<{ nome: string; qualificacao: string | null }>;
  fonte: string;
}

export function FormCliente({
  inicial,
  regioes,
  representadas,
}: {
  inicial?: Partial<Valores>;
  regioes: Array<{ id: string; nome: string; cor: string }>;
  representadas: Array<{ id: string; nome: string; cor: string }>;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  const [v, setV] = useState<Valores>({ ...VAZIO, ...inicial });
  const [ficha, setFicha] = useState<FichaReceita | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [avisoCnpj, setAvisoCnpj] = useState<{ tipo: "erro" | "ok" | "dup"; texto: string; id?: string } | null>(null);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  const editando = Boolean(inicial?.id);

  function set<K extends keyof Valores>(campo: K, valor: Valores[K]) {
    setV((atual) => ({ ...atual, [campo]: valor }));
  }

  async function puxarCnpj() {
    const digitos = soDigitos(v.cnpj);
    if (digitos.length !== 14) {
      setAvisoCnpj({ tipo: "erro", texto: "Digite os 14 dígitos do CNPJ." });
      return;
    }

    setBuscandoCnpj(true);
    setAvisoCnpj(null);
    setFicha(null);

    const duplicado = await conferirDuplicado(digitos);
    if (duplicado.existe && duplicado.cliente.id !== inicial?.id) {
      setAvisoCnpj({
        tipo: "dup",
        texto: `"${duplicado.cliente.nomeFantasia ?? duplicado.cliente.razaoSocial}" já está na sua carteira.`,
        id: duplicado.cliente.id,
      });
      setBuscandoCnpj(false);
      return;
    }

    const r = await buscarPorCnpj(digitos);
    setBuscandoCnpj(false);

    if (!r.ok) {
      setAvisoCnpj({ tipo: "erro", texto: r.erro });
      return;
    }

    const f = r.ficha;
    setV((atual) => ({
      ...atual,
      cnpj: f.cnpj,
      razaoSocial: f.razaoSocial || atual.razaoSocial,
      nomeFantasia: f.nomeFantasia ?? atual.nomeFantasia,
      email: f.email ?? atual.email,
      telefone: f.telefone ?? atual.telefone,
      whatsapp: atual.whatsapp || f.telefone || "",
      cep: f.cep ?? atual.cep,
      logradouro: f.logradouro ?? atual.logradouro,
      numero: f.numero ?? atual.numero,
      complemento: f.complemento ?? atual.complemento,
      bairro: f.bairro ?? atual.bairro,
      cidade: f.cidade ?? atual.cidade,
      uf: f.uf ?? atual.uf,
    }));

    setFicha({
      razaoSocial: f.razaoSocial,
      nomeFantasia: f.nomeFantasia,
      situacaoCadastral: f.situacaoCadastral,
      cnaeDescricao: f.cnaeDescricao,
      porte: f.porte,
      dataAbertura: f.dataAbertura,
      capitalSocial: f.capitalSocial,
      socios: f.socios,
      fonte: f.fonte,
    });

    setAvisoCnpj({ tipo: "ok", texto: `Ficha puxada da ${f.fonte}.` });
  }

  async function puxarCep() {
    const digitos = soDigitos(v.cep);
    if (digitos.length !== 8) return;

    setBuscandoCep(true);
    const r = await buscarPorCep(digitos);
    setBuscandoCep(false);
    if (!r.ok) return;

    setV((atual) => ({
      ...atual,
      logradouro: r.ficha.logradouro ?? atual.logradouro,
      bairro: r.ficha.bairro ?? atual.bairro,
      cidade: r.ficha.cidade ?? atual.cidade,
      uf: r.ficha.uf ?? atual.uf,
      lat: r.ficha.lat ? String(r.ficha.lat) : atual.lat,
      lng: r.ficha.lng ? String(r.ficha.lng) : atual.lng,
    }));
  }

  function enviar(dados: FormData) {
    setErro(null);
    iniciar(async () => {
      const r = await salvarCliente(dados);
      if (r?.erro) {
        setErro(r.erro);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      router.push(`/clientes/${r.id}`);
      router.refresh();
    });
  }

  const situacaoOk = ficha?.situacaoCadastral?.toUpperCase().includes("ATIVA");

  return (
    <form action={enviar} className="escala space-y-4 max-w-[820px]">
      {v.id ? <input type="hidden" name="id" value={v.id} /> : null}
      <input type="hidden" name="lat" value={v.lat} />
      <input type="hidden" name="lng" value={v.lng} />
      <input type="hidden" name="curvaAutomatica" value={v.curvaAutomatica ? "on" : "off"} />

      {erro ? (
        <div className="flex items-start gap-2 rounded-xl px-4 py-3 bg-carimbo-fundo text-carimbo text-[13.5px] anim-subir">
          <span className="mt-px shrink-0">
            <Icone nome="alerta" tamanho={16} />
          </span>
          {erro}
        </div>
      ) : null}

      {/* ============ identificação ============ */}
      <Canhoto>
        <CanhotoTitulo
          titulo="Quem é o cliente"
          sub="Digite o CNPJ que eu busco o resto na Receita"
          icone="clientes"
        />

        <div className="px-4 pb-4 space-y-4">
          <div className="flex gap-2 items-end">
            <Campo rotulo="CNPJ" className="flex-1">
              <input
                name="cnpj"
                value={v.cnpj}
                onChange={(e) => set("cnpj", e.target.value)}
                onBlur={() => {
                  if (soDigitos(v.cnpj).length === 14) set("cnpj", formatarCnpj(v.cnpj));
                }}
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
                className="campo cifra"
              />
            </Campo>
            <button
              type="button"
              onClick={puxarCnpj}
              disabled={buscandoCnpj}
              className="botao botao-tinta shrink-0"
            >
              {buscandoCnpj ? (
                <span className="anim-rodar">
                  <Icone nome="atualizar" tamanho={16} />
                </span>
              ) : (
                <Icone nome="busca" tamanho={16} />
              )}
              Puxar
            </button>
          </div>

          {avisoCnpj ? (
            <div
              className={cx(
                "flex items-start gap-2 rounded-xl px-3 py-2.5 text-[12.5px] anim-subir",
                avisoCnpj.tipo === "erro"
                  ? "bg-carimbo-fundo text-carimbo"
                  : avisoCnpj.tipo === "dup"
                    ? "bg-ambar-fundo text-ambar"
                    : "bg-quitado-fundo text-quitado",
              )}
            >
              <span className="mt-px shrink-0">
                <Icone
                  nome={avisoCnpj.tipo === "ok" ? "check" : "alerta"}
                  tamanho={14}
                />
              </span>
              <span className="flex-1">{avisoCnpj.texto}</span>
              {avisoCnpj.id ? (
                <Link href={`/clientes/${avisoCnpj.id}`} className="font-bold underline shrink-0">
                  Abrir
                </Link>
              ) : null}
            </div>
          ) : null}

          {/* ficha da Receita */}
          {ficha ? (
            <div className="rounded-xl border border-papel-borda bg-[color-mix(in_oklab,var(--color-tinta)_3%,transparent)] p-3.5 anim-subir relative overflow-hidden">
              <span className="absolute right-2 top-2">
                <Carimbo tom={situacaoOk ? "quitado" : "carimbo"} batendo>
                  {ficha.situacaoCadastral ?? "?"}
                </Carimbo>
              </span>

              <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-tinta-3 mb-2">
                Ficha · {ficha.fonte}
              </p>

              <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-[12.5px] pr-20 sm:pr-24">
                {[
                  { r: "Atividade", v: ficha.cnaeDescricao },
                  { r: "Porte", v: ficha.porte },
                  { r: "Aberta em", v: ficha.dataAbertura ? dataBR(ficha.dataAbertura) : null },
                  {
                    r: "Capital social",
                    v: ficha.capitalSocial ? dinheiro(ficha.capitalSocial) : null,
                  },
                ]
                  .filter((l) => l.v)
                  .map((l) => (
                    <div key={l.r}>
                      <dt className="text-tinta-3">{l.r}</dt>
                      <dd className="text-tinta">{l.v}</dd>
                    </div>
                  ))}
              </dl>

              {ficha.socios.length > 0 ? (
                <>
                  <LinhaPicotada rotulo="quadro societário" />
                  <ul className="space-y-1 text-[12.5px]">
                    {ficha.socios.slice(0, 4).map((s) => (
                      <li key={s.nome} className="flex items-baseline gap-2">
                        <span className="text-tinta">{s.nome}</span>
                        {s.qualificacao ? (
                          <span className="text-tinta-3 text-[11.5px]">{s.qualificacao}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11.5px] text-tinta-3 mt-2">
                    Bom para saber com quem falar quando o comprador empaca.
                  </p>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="grid sm:grid-cols-2 gap-3">
            <Campo rotulo="Razão social" obrigatorio className="sm:col-span-2">
              <input
                name="razaoSocial"
                value={v.razaoSocial}
                onChange={(e) => set("razaoSocial", e.target.value)}
                className="campo"
                required
              />
            </Campo>
            <Campo rotulo="Nome fantasia" dica="É o que aparece nas listas e na rota.">
              <input
                name="nomeFantasia"
                value={v.nomeFantasia}
                onChange={(e) => set("nomeFantasia", e.target.value)}
                className="campo"
              />
            </Campo>
            <Campo rotulo="Inscrição estadual">
              <input
                name="inscricaoEstadual"
                value={v.inscricaoEstadual}
                onChange={(e) => set("inscricaoEstadual", e.target.value)}
                className="campo cifra"
              />
            </Campo>
          </div>

          <input type="hidden" name="tipoPessoa" value={v.tipoPessoa} />
        </div>
      </Canhoto>

      {/* ============ endereço ============ */}
      <Canhoto>
        <CanhotoTitulo titulo="Onde fica" sub="Precisa do endereço para entrar na rota" icone="pino" />

        <div className="px-4 pb-4 space-y-3">
          <div className="grid sm:grid-cols-[150px_1fr] gap-3">
            <Campo rotulo="CEP">
              <div className="relative">
                <input
                  name="cep"
                  value={v.cep}
                  onChange={(e) => set("cep", e.target.value)}
                  onBlur={puxarCep}
                  placeholder="00000-000"
                  inputMode="numeric"
                  className="campo cifra pr-9"
                />
                {buscandoCep ? (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-caneta anim-rodar">
                    <Icone nome="atualizar" tamanho={15} />
                  </span>
                ) : null}
              </div>
            </Campo>
            <Campo rotulo="Logradouro">
              <input
                name="logradouro"
                value={v.logradouro}
                onChange={(e) => set("logradouro", e.target.value)}
                className="campo"
              />
            </Campo>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Campo rotulo="Número">
              <input
                name="numero"
                value={v.numero}
                onChange={(e) => set("numero", e.target.value)}
                className="campo"
              />
            </Campo>
            <Campo rotulo="Complemento">
              <input
                name="complemento"
                value={v.complemento}
                onChange={(e) => set("complemento", e.target.value)}
                className="campo"
              />
            </Campo>
            <Campo rotulo="Bairro" className="col-span-2">
              <input
                name="bairro"
                value={v.bairro}
                onChange={(e) => set("bairro", e.target.value)}
                className="campo"
              />
            </Campo>
          </div>

          <div className="grid grid-cols-[1fr_84px] sm:grid-cols-[1fr_84px_1fr] gap-3">
            <Campo rotulo="Cidade">
              <input
                name="cidade"
                value={v.cidade}
                onChange={(e) => set("cidade", e.target.value)}
                className="campo"
              />
            </Campo>
            <Campo rotulo="UF">
              <input
                name="uf"
                value={v.uf}
                onChange={(e) => set("uf", e.target.value.toUpperCase().slice(0, 2))}
                maxLength={2}
                className="campo uppercase"
              />
            </Campo>
            <Campo rotulo="Região" className="col-span-2 sm:col-span-1">
              <select
                name="regionId"
                value={v.regionId}
                onChange={(e) => set("regionId", e.target.value)}
                className="campo"
              >
                <option value="">Sem região</option>
                {regioes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <Campo rotulo="Ponto de referência" dica="Ajuda no dia da visita: portaria, galpão dos fundos...">
            <input
              name="pontoReferencia"
              value={v.pontoReferencia}
              onChange={(e) => set("pontoReferencia", e.target.value)}
              className="campo"
            />
          </Campo>
        </div>
      </Canhoto>

      {/* ============ contato ============ */}
      <Canhoto>
        <CanhotoTitulo titulo="Com quem falar" icone="telefone" />
        <div className="px-4 pb-4 grid sm:grid-cols-2 gap-3">
          <Campo rotulo="Contato">
            <input
              name="contatoNome"
              value={v.contatoNome}
              onChange={(e) => set("contatoNome", e.target.value)}
              placeholder="Nome do comprador"
              className="campo"
            />
          </Campo>
          <Campo rotulo="Cargo">
            <input
              name="contatoCargo"
              value={v.contatoCargo}
              onChange={(e) => set("contatoCargo", e.target.value)}
              className="campo"
            />
          </Campo>
          <Campo rotulo="Telefone">
            <input
              name="telefone"
              value={v.telefone}
              onChange={(e) => set("telefone", e.target.value)}
              inputMode="tel"
              className="campo cifra"
            />
          </Campo>
          <Campo rotulo="WhatsApp" dica="Usado nos atalhos de cobrança e follow-up.">
            <input
              name="whatsapp"
              value={v.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value)}
              inputMode="tel"
              className="campo cifra"
            />
          </Campo>
          <Campo rotulo="E-mail" className="sm:col-span-2">
            <input
              name="email"
              type="email"
              value={v.email}
              onChange={(e) => set("email", e.target.value)}
              className="campo"
            />
          </Campo>
        </div>
      </Canhoto>

      {/* ============ comercial ============ */}
      <Canhoto>
        <CanhotoTitulo
          titulo="Como atender"
          sub="Define a frequência de visita e o que entra na rota"
          icone="alvo"
        />

        <div className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Campo rotulo="Situação">
              <select
                name="status"
                value={v.status}
                onChange={(e) => set("status", e.target.value)}
                className="campo"
              >
                <option value="PROSPECT">Prospect</option>
                <option value="ATIVO">Ativo</option>
                <option value="EM_RISCO">Em risco</option>
                <option value="INATIVO">Inativo</option>
                <option value="BLOQUEADO">Bloqueado</option>
                <option value="PERDIDO">Perdido</option>
              </select>
            </Campo>

            <Campo rotulo="Curva">
              <select
                name="curva"
                value={v.curva}
                onChange={(e) => set("curva", e.target.value)}
                className="campo"
              >
                <option value="A">A — prioridade</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D — sem compra</option>
              </select>
            </Campo>

            <Campo rotulo="Visitar a cada">
              <select
                name="frequenciaVisitaDias"
                value={v.frequenciaVisitaDias}
                onChange={(e) => set("frequenciaVisitaDias", e.target.value)}
                className="campo"
              >
                {[7, 15, 21, 30, 45, 60, 90].map((d) => (
                  <option key={d} value={d}>
                    {d} dias
                  </option>
                ))}
              </select>
            </Campo>

            <Campo rotulo="Duração da visita">
              <select
                name="tempoVisitaMin"
                value={v.tempoVisitaMin}
                onChange={(e) => set("tempoVisitaMin", e.target.value)}
                className="campo"
              >
                {[20, 30, 40, 45, 60, 90].map((m) => (
                  <option key={m} value={m}>
                    {m} min
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <label className="flex items-start gap-2.5 text-[13px] text-tinta-2 cursor-pointer">
            <input
              type="checkbox"
              checked={v.curvaAutomatica}
              onChange={(e) => set("curvaAutomatica", e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-[var(--color-caneta)]"
            />
            <span>
              Deixar o sistema classificar a curva
              <span className="block text-[11.5px] text-tinta-3">
                Recalcula sozinho pelo Pareto de faturamento e ajusta a frequência.
              </span>
            </span>
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Campo rotulo="Abre">
              <input
                type="time"
                name="horaAbre"
                value={v.horaAbre}
                onChange={(e) => set("horaAbre", e.target.value)}
                className="campo"
              />
            </Campo>
            <Campo rotulo="Fecha">
              <input
                type="time"
                name="horaFecha"
                value={v.horaFecha}
                onChange={(e) => set("horaFecha", e.target.value)}
                className="campo"
              />
            </Campo>
            <Campo rotulo="Condição padrão" dica="Ex.: 30/60/90">
              <input
                name="condicaoPagamento"
                value={v.condicaoPagamento}
                onChange={(e) => set("condicaoPagamento", e.target.value)}
                placeholder="30/60/90"
                className="campo cifra"
              />
            </Campo>
            <Campo rotulo="Limite de crédito">
              <input
                name="limiteCredito"
                value={v.limiteCredito}
                onChange={(e) => set("limiteCredito", e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                className="campo cifra"
              />
            </Campo>
          </div>

          {representadas.length > 0 ? (
            <div>
              <span className="rotulo">Compra de quais representadas</span>
              <div className="flex flex-wrap gap-1.5">
                {representadas.map((r) => {
                  const on = v.representadas.includes(r.id);
                  return (
                    <label
                      key={r.id}
                      className={cx(
                        "etiqueta cursor-pointer transition-colors",
                        on ? "text-white border-transparent" : "border-papel-borda text-tinta-3",
                      )}
                      style={on ? { background: r.cor } : undefined}
                    >
                      <input
                        type="checkbox"
                        name="representadas"
                        value={r.id}
                        checked={on}
                        onChange={(e) =>
                          set(
                            "representadas",
                            e.target.checked
                              ? [...v.representadas, r.id]
                              : v.representadas.filter((x) => x !== r.id),
                          )
                        }
                        className="sr-only"
                      />
                      {on ? <Icone nome="check" tamanho={11} /> : null}
                      {r.nome}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="grid sm:grid-cols-2 gap-3">
            <Campo rotulo="Origem" dica="Como chegou até você.">
              <input
                name="origem"
                value={v.origem}
                onChange={(e) => set("origem", e.target.value)}
                placeholder="Indicação, feira, prospecção..."
                className="campo"
              />
            </Campo>
            <Campo rotulo="Etiquetas" dica="Separe por vírgula.">
              <input
                name="tags"
                value={v.tags}
                onChange={(e) => set("tags", e.target.value)}
                placeholder="alimentício, compra grande"
                className="campo"
              />
            </Campo>
          </div>

          <Campo rotulo="Anotações">
            <textarea
              name="observacoes"
              value={v.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
              rows={3}
              className="campo resize-none"
              placeholder="Manias do comprador, histórico, quem decide..."
            />
          </Campo>
        </div>
      </Canhoto>

      <div className="flex gap-2 sticky bottom-[78px] lg:bottom-4 z-10">
        <Link href={editando ? `/clientes/${v.id}` : "/clientes"} className="botao botao-papel flex-1">
          Cancelar
        </Link>
        <button type="submit" disabled={pendente} className="botao botao-tinta flex-[2]">
          {pendente ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar cliente"}
        </button>
      </div>
    </form>
  );
}
