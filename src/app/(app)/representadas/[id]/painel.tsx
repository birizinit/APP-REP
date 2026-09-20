"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { excluirProduto, salvarProduto } from "@/app/actions/representadas";
import { EditorPlano, PLANO_VAZIO, type PlanoUI } from "@/app/(app)/representadas/[id]/plano";
import { Icone } from "@/components/icone";
import { Campo, Canhoto, CanhotoTitulo, Etiqueta, LinhaPicotada } from "@/components/ui";
import {
  rotuloBase,
  rotuloGatilho,
  rotuloPeriodicidade,
  type BaseCalculo,
  type GatilhoComissao,
  type Periodicidade,
} from "@/lib/comissao";
import { cx, dinheiro, percentual, rotulo } from "@/lib/format";

// ==================================================================
// Planos
// ==================================================================

export function PainelPlanos({
  representadaId,
  planos,
}: {
  representadaId: string;
  planos: PlanoUI[];
}) {
  const [editando, setEditando] = useState<string | null>(null);
  const [criando, setCriando] = useState(planos.length === 0);

  if (criando) {
    return (
      <div className="anim-subir">
        <EditorPlano representadaId={representadaId} aoFechar={() => setCriando(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {planos.map((p) =>
        editando === p.id ? (
          <div key={p.id} className="anim-subir">
            <EditorPlano
              representadaId={representadaId}
              inicial={p}
              aoFechar={() => setEditando(null)}
            />
          </div>
        ) : (
          <Canhoto key={p.id} className="overflow-hidden">
            <CanhotoTitulo
              titulo={p.nome}
              sub={rotuloBase[p.baseCalculo as BaseCalculo]}
              icone="comissao"
              acao={
                <button
                  type="button"
                  onClick={() => setEditando(p.id ?? null)}
                  className="botao botao-papel text-[12.5px] px-2.5 py-1.5"
                >
                  <Icone nome="editar" tamanho={14} />
                  Editar
                </button>
              }
            />

            <div className="px-4 pb-4">
              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                {p.padrao ? <Etiqueta tom="tinta" icone="estrela">padrão</Etiqueta> : null}
                {!p.ativo ? <Etiqueta tom="neutro">inativo</Etiqueta> : null}
                <Etiqueta tom="neutro">
                  {p.tipoFaixa === "UNICO"
                    ? "percentual fixo"
                    : p.tipoFaixa === "PROGRESSIVO"
                      ? "faixas progressivas"
                      : "por linha de produto"}
                </Etiqueta>
                {p.emiteNotaServico ? <Etiqueta tom="ambar" icone="nota">exige NFS-e</Etiqueta> : null}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    r: "Percentual",
                    v: `${percentual(p.percentualPadrao)}${p.tipoFaixa === "PROGRESSIVO" ? "+" : ""}`,
                  },
                  { r: "Nasce", v: rotuloGatilho[p.gatilho as GatilhoComissao] },
                  {
                    r: "Prazo",
                    v: `${p.prazoDias} dias${p.diaPagamento ? ` · dia ${p.diaPagamento}` : ""}`,
                  },
                  { r: "Frequência", v: rotuloPeriodicidade[p.periodicidade as Periodicidade] },
                ].map((l) => (
                  <div key={l.r}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-tinta-3">
                      {l.r}
                    </p>
                    <p className="text-[12.5px] text-tinta mt-0.5 leading-snug">{l.v}</p>
                  </div>
                ))}
              </div>

              {p.tipoFaixa === "PROGRESSIVO" && p.faixas.length > 0 ? (
                <>
                  <LinhaPicotada rotulo="faixas" />
                  <ul className="space-y-1">
                    {p.faixas.map((f, i) => (
                      <li key={i} className="flex items-baseline gap-2 text-[12.5px]">
                        <span className="text-tinta-2">
                          {dinheiro(f.deValor)}
                          {f.ateValor ? ` até ${dinheiro(f.ateValor)}` : " para cima"}
                        </span>
                        <span className="flex-1 border-b border-dotted border-papel-borda translate-y-[-3px]" />
                        <span className="cifra text-tinta">{percentual(f.percentual)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {Number(p.impostoPercentual) > 0 ? (
                <p className="text-[12px] text-tinta-3 mt-3">
                  {percentual(p.impostoPercentual)} de imposto retido na fonte.
                </p>
              ) : null}

              {p.observacoes ? (
                <p className="text-[12.5px] text-tinta-2 mt-3 pl-2.5 border-l-2 border-papel-borda leading-relaxed">
                  {p.observacoes}
                </p>
              ) : null}
            </div>
          </Canhoto>
        ),
      )}

      {editando === null ? (
        <button
          type="button"
          onClick={() => setCriando(true)}
          className="botao botao-papel w-full text-[13px]"
        >
          <Icone nome="mais" tamanho={15} />
          Novo plano de comissão
        </button>
      ) : null}
    </div>
  );
}

// ==================================================================
// Produtos
// ==================================================================

export interface ProdutoUI {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  precoTabela: number;
  linha: string | null;
  comissaoPercentual: number | null;
}

export function PainelProdutos({
  representadaId,
  produtos,
}: {
  representadaId: string;
  produtos: ProdutoUI[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const filtrados = busca.trim()
    ? produtos.filter(
        (p) =>
          p.descricao.toLowerCase().includes(busca.toLowerCase()) ||
          p.codigo.toLowerCase().includes(busca.toLowerCase()),
      )
    : produtos;

  const linhas = [...new Set(produtos.map((p) => p.linha).filter(Boolean))] as string[];

  function enviar(dados: FormData) {
    setErro(null);
    dados.set("representadaId", representadaId);
    iniciar(async () => {
      const r = await salvarProduto(dados);
      if (r?.erro) {
        setErro(r.erro);
        return;
      }
      setAberto(false);
      router.refresh();
    });
  }

  return (
    <Canhoto>
      <CanhotoTitulo
        titulo="Catálogo"
        sub={`${produtos.length} produtos${linhas.length > 0 ? ` em ${linhas.length} linhas` : ""}`}
        icone="planilha"
        acao={
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            className="botao botao-papel text-[12.5px] px-2.5 py-1.5"
          >
            <Icone nome={aberto ? "fechar" : "mais"} tamanho={14} />
            {aberto ? "Fechar" : "Produto"}
          </button>
        }
      />

      {aberto ? (
        <form action={enviar} className="px-4 pb-4 anim-subir">
          <div className="rounded-xl border border-papel-borda p-3 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <Campo rotulo="Código" obrigatorio>
                <input name="codigo" className="campo cifra text-[13px]" required />
              </Campo>
              <Campo rotulo="Unidade">
                <input name="unidade" defaultValue="UN" className="campo text-[13px]" />
              </Campo>
              <Campo rotulo="Preço tabela">
                <input name="precoTabela" inputMode="decimal" className="campo cifra text-[13px]" />
              </Campo>
              <Campo rotulo="Comissão %" dica="Só se diferir do plano.">
                <input name="comissaoPercentual" inputMode="decimal" className="campo cifra text-[13px]" />
              </Campo>
            </div>
            <div className="grid sm:grid-cols-[2fr_1fr] gap-2.5">
              <Campo rotulo="Descrição" obrigatorio>
                <input name="descricao" className="campo text-[13px]" required />
              </Campo>
              <Campo rotulo="Linha">
                <input
                  name="linha"
                  list="linhas-produto"
                  className="campo text-[13px]"
                  placeholder="Ex.: Filme técnico"
                />
                <datalist id="linhas-produto">
                  {linhas.map((l) => (
                    <option key={l} value={l} />
                  ))}
                </datalist>
              </Campo>
            </div>

            {erro ? <p className="text-[12.5px] text-carimbo">{erro}</p> : null}

            <button type="submit" disabled={pendente} className="botao botao-tinta w-full text-[13px]">
              {pendente ? "Salvando..." : "Adicionar ao catálogo"}
            </button>
          </div>
        </form>
      ) : null}

      {produtos.length > 0 ? (
        <>
          {produtos.length > 6 ? (
            <div className="px-4 pb-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tinta-3">
                  <Icone nome="busca" tamanho={15} />
                </span>
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar no catálogo"
                  className="campo pl-9 text-[13px]"
                />
              </div>
            </div>
          ) : null}

          <div className="max-h-[360px] overflow-y-auto sem-barra divide-y divide-[var(--color-papel-borda)] border-t border-papel-borda">
            {filtrados.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="cifra text-[11.5px] text-tinta-3 w-[68px] shrink-0 truncate">
                  {p.codigo}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-tinta truncate">{p.descricao}</p>
                  {p.linha ? <p className="text-[11px] text-tinta-3">{p.linha}</p> : null}
                </div>
                {p.comissaoPercentual !== null ? (
                  <span className="text-[11.5px] text-caneta cifra shrink-0">
                    {percentual(p.comissaoPercentual)}
                  </span>
                ) : null}
                <span className="cifra text-[12.5px] text-tinta shrink-0 w-[78px] text-right">
                  {dinheiro(p.precoTabela)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    iniciar(async () => {
                      await excluirProduto(p.id);
                      router.refresh();
                    })
                  }
                  className="p-1 text-tinta-3 hover:text-carimbo shrink-0"
                  aria-label={`Remover ${p.descricao}`}
                >
                  <Icone nome="fechar" tamanho={14} />
                </button>
              </div>
            ))}
          </div>
        </>
      ) : !aberto ? (
        <p className="px-4 pb-4 text-[12.5px] text-tinta-3">
          Sem catálogo ainda. Cadastrar os produtos deixa o lançamento de pedido bem mais rápido —
          e permite comissão diferente por linha.
        </p>
      ) : null}
    </Canhoto>
  );
}
