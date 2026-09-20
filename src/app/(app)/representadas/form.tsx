"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { buscarCnpjRepresentada, salvarRepresentada } from "@/app/actions/representadas";
import { Icone } from "@/components/icone";
import { Campo, Canhoto, CanhotoTitulo, Carimbo } from "@/components/ui";
import { cx, formatarCnpj, soDigitos } from "@/lib/format";

const CORES = [
  "#1B34C4",
  "#12775A",
  "#CF7C11",
  "#C62439",
  "#7A3FB8",
  "#0E7490",
  "#B45309",
  "#4D7C0F",
];

export interface ValoresRepresentada {
  id?: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual: string;
  segmento: string;
  site: string;
  cor: string;
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
  bairro: string;
  cidade: string;
  uf: string;
  status: string;
  contratoInicio: string;
  contratoFim: string;
  exclusividade: boolean;
  territorio: string;
  prazoEntregaDias: string;
  pedidoMinimo: string;
  metaMensal: string;
  observacoes: string;
}

const VAZIO: ValoresRepresentada = {
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  inscricaoEstadual: "",
  segmento: "",
  site: "",
  cor: CORES[0],
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
  bairro: "",
  cidade: "",
  uf: "",
  status: "ATIVA",
  contratoInicio: "",
  contratoFim: "",
  exclusividade: false,
  territorio: "",
  prazoEntregaDias: "",
  pedidoMinimo: "",
  metaMensal: "",
  observacoes: "",
};

export function FormRepresentada({ inicial }: { inicial?: Partial<ValoresRepresentada> }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  const [v, setV] = useState<ValoresRepresentada>({ ...VAZIO, ...inicial });
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);

  const editando = Boolean(inicial?.id);

  function set<K extends keyof ValoresRepresentada>(campo: K, valor: ValoresRepresentada[K]) {
    setV((atual) => ({ ...atual, [campo]: valor }));
  }

  async function puxarCnpj() {
    const digitos = soDigitos(v.cnpj);
    if (digitos.length !== 14) {
      setAviso("Digite os 14 dígitos do CNPJ.");
      return;
    }
    setBuscando(true);
    setAviso(null);
    const r = await buscarCnpjRepresentada(digitos);
    setBuscando(false);

    if (!r.ok) {
      setAviso(r.erro);
      return;
    }

    const f = r.ficha;
    setV((atual) => ({
      ...atual,
      cnpj: formatarCnpj(f.cnpj),
      razaoSocial: f.razaoSocial || atual.razaoSocial,
      nomeFantasia: f.nomeFantasia ?? atual.nomeFantasia,
      segmento: f.cnaeDescricao ?? atual.segmento,
      email: f.email ?? atual.email,
      telefone: f.telefone ?? atual.telefone,
      cep: f.cep ?? atual.cep,
      logradouro: f.logradouro ?? atual.logradouro,
      numero: f.numero ?? atual.numero,
      bairro: f.bairro ?? atual.bairro,
      cidade: f.cidade ?? atual.cidade,
      uf: f.uf ?? atual.uf,
    }));
    setAviso(`Ficha puxada da ${f.fonte}.`);
  }

  function enviar(dados: FormData) {
    setErro(null);
    iniciar(async () => {
      const r = await salvarRepresentada(dados);
      if (r?.erro) {
        setErro(r.erro);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      router.push(`/representadas/${r.id}`);
      router.refresh();
    });
  }

  return (
    <form action={enviar} className="escala space-y-4 max-w-[820px]">
      {v.id ? <input type="hidden" name="id" value={v.id} /> : null}
      <input type="hidden" name="cor" value={v.cor} />
      <input type="hidden" name="exclusividade" value={v.exclusividade ? "on" : "off"} />

      {erro ? (
        <div className="flex items-start gap-2 rounded-xl px-4 py-3 bg-carimbo-fundo text-carimbo text-[13.5px]">
          <Icone nome="alerta" tamanho={16} />
          {erro}
        </div>
      ) : null}

      <Canhoto>
        <CanhotoTitulo titulo="A indústria" sub="Puxe pelo CNPJ para não digitar tudo" icone="representada" />

        <div className="px-4 pb-4 space-y-4">
          <div className="flex gap-2 items-end">
            <Campo rotulo="CNPJ" className="flex-1">
              <input
                name="cnpj"
                value={v.cnpj}
                onChange={(e) => set("cnpj", e.target.value)}
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
                className="campo cifra"
              />
            </Campo>
            <button
              type="button"
              onClick={puxarCnpj}
              disabled={buscando}
              className="botao botao-tinta shrink-0"
            >
              {buscando ? (
                <span className="anim-rodar">
                  <Icone nome="atualizar" tamanho={16} />
                </span>
              ) : (
                <Icone nome="busca" tamanho={16} />
              )}
              Puxar
            </button>
          </div>

          {aviso ? (
            <p className="text-[12.5px] text-tinta-2 bg-[color-mix(in_oklab,var(--color-tinta)_5%,transparent)] rounded-xl px-3 py-2.5">
              {aviso}
            </p>
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
            <Campo rotulo="Nome fantasia">
              <input
                name="nomeFantasia"
                value={v.nomeFantasia}
                onChange={(e) => set("nomeFantasia", e.target.value)}
                className="campo"
              />
            </Campo>
            <Campo rotulo="Segmento">
              <input
                name="segmento"
                value={v.segmento}
                onChange={(e) => set("segmento", e.target.value)}
                placeholder="Embalagens, ferramentas..."
                className="campo"
              />
            </Campo>
          </div>

          <div>
            <span className="rotulo">Cor de identificação</span>
            <div className="flex flex-wrap gap-2">
              {CORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("cor", c)}
                  aria-label={`Cor ${c}`}
                  className={cx(
                    "w-8 h-8 rounded-xl transition-transform",
                    v.cor === c ? "ring-2 ring-offset-2 ring-offset-[var(--color-papel-alto)] scale-110" : "",
                  )}
                  style={{ background: c, boxShadow: v.cor === c ? `0 0 0 2px ${c}` : undefined }}
                />
              ))}
            </div>
            <p className="text-[11.5px] text-tinta-3 mt-2">
              Essa cor marca os pedidos e as comissões dessa representada no app inteiro.
            </p>
          </div>
        </div>
      </Canhoto>

      <Canhoto>
        <CanhotoTitulo titulo="Contato na representada" icone="telefone" />
        <div className="px-4 pb-4 grid sm:grid-cols-2 gap-3">
          <Campo rotulo="Quem te atende">
            <input
              name="contatoNome"
              value={v.contatoNome}
              onChange={(e) => set("contatoNome", e.target.value)}
              className="campo"
            />
          </Campo>
          <Campo rotulo="Cargo">
            <input
              name="contatoCargo"
              value={v.contatoCargo}
              onChange={(e) => set("contatoCargo", e.target.value)}
              placeholder="Gerente de representantes"
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
          <Campo rotulo="WhatsApp">
            <input
              name="whatsapp"
              value={v.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value)}
              inputMode="tel"
              className="campo cifra"
            />
          </Campo>
          <Campo rotulo="E-mail">
            <input
              name="email"
              type="email"
              value={v.email}
              onChange={(e) => set("email", e.target.value)}
              className="campo"
            />
          </Campo>
          <Campo rotulo="Site">
            <input
              name="site"
              value={v.site}
              onChange={(e) => set("site", e.target.value)}
              className="campo"
            />
          </Campo>
        </div>
      </Canhoto>

      <Canhoto>
        <CanhotoTitulo titulo="Contrato" sub="O combinado com a fábrica" icone="nota" />
        <div className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Campo rotulo="Situação">
              <select
                name="status"
                value={v.status}
                onChange={(e) => set("status", e.target.value)}
                className="campo"
              >
                <option value="ATIVA">Ativa</option>
                <option value="PROSPECCAO">Em negociação</option>
                <option value="PAUSADA">Pausada</option>
                <option value="ENCERRADA">Encerrada</option>
              </select>
            </Campo>
            <Campo rotulo="Início">
              <input
                type="date"
                name="contratoInicio"
                value={v.contratoInicio}
                onChange={(e) => set("contratoInicio", e.target.value)}
                className="campo"
              />
            </Campo>
            <Campo rotulo="Fim">
              <input
                type="date"
                name="contratoFim"
                value={v.contratoFim}
                onChange={(e) => set("contratoFim", e.target.value)}
                className="campo"
              />
            </Campo>
            <Campo rotulo="Entrega em">
              <input
                name="prazoEntregaDias"
                value={v.prazoEntregaDias}
                onChange={(e) => set("prazoEntregaDias", e.target.value)}
                inputMode="numeric"
                placeholder="dias"
                className="campo cifra"
              />
            </Campo>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <Campo rotulo="Território">
              <input
                name="territorio"
                value={v.territorio}
                onChange={(e) => set("territorio", e.target.value)}
                placeholder="Interior de SP"
                className="campo"
              />
            </Campo>
            <Campo rotulo="Pedido mínimo">
              <input
                name="pedidoMinimo"
                value={v.pedidoMinimo}
                onChange={(e) => set("pedidoMinimo", e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                className="campo cifra"
              />
            </Campo>
            <Campo rotulo="Meta mensal" dica="Aparece na barra de progresso.">
              <input
                name="metaMensal"
                value={v.metaMensal}
                onChange={(e) => set("metaMensal", e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                className="campo cifra"
              />
            </Campo>
          </div>

          <label className="flex items-start gap-2.5 text-[13px] text-tinta-2 cursor-pointer">
            <input
              type="checkbox"
              checked={v.exclusividade}
              onChange={(e) => set("exclusividade", e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-[var(--color-caneta)]"
            />
            <span>
              Tenho exclusividade no território
              <span className="block text-[11.5px] text-tinta-3">
                Só para registro — aparece como selo na lista.
              </span>
            </span>
          </label>

          {!editando ? (
            <Campo
              rotulo="Comissão inicial (%)"
              dica="Já crio um plano padrão com esse percentual. Dá para detalhar depois."
            >
              <input
                name="percentualInicial"
                defaultValue="5"
                inputMode="decimal"
                className="campo cifra"
              />
            </Campo>
          ) : null}

          <Campo rotulo="Observações">
            <textarea
              name="observacoes"
              value={v.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
              rows={3}
              className="campo resize-none"
              placeholder="Particularidades do acerto, quem aprova desconto, política de devolução..."
            />
          </Campo>
        </div>
      </Canhoto>

      <Canhoto>
        <CanhotoTitulo titulo="Endereço" icone="pino" />
        <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Campo rotulo="CEP">
            <input
              name="cep"
              value={v.cep}
              onChange={(e) => set("cep", e.target.value)}
              className="campo cifra"
            />
          </Campo>
          <Campo rotulo="Logradouro" className="col-span-2">
            <input
              name="logradouro"
              value={v.logradouro}
              onChange={(e) => set("logradouro", e.target.value)}
              className="campo"
            />
          </Campo>
          <Campo rotulo="Número">
            <input
              name="numero"
              value={v.numero}
              onChange={(e) => set("numero", e.target.value)}
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
        </div>
      </Canhoto>

      <div className="flex gap-2 sticky bottom-[78px] lg:bottom-4 z-10">
        <Link
          href={editando ? `/representadas/${v.id}` : "/representadas"}
          className="botao botao-papel flex-1"
        >
          Cancelar
        </Link>
        <button type="submit" disabled={pendente} className="botao botao-tinta flex-[2]">
          {pendente ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar representada"}
        </button>
      </div>
    </form>
  );
}
