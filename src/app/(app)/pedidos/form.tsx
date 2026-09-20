"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { salvarPedido } from "@/app/actions/pedidos";
import { Icone } from "@/components/icone";
import {
  Campo,
  Canhoto,
  CanhotoTitulo,
  Carimbo,
  Etiqueta,
  LinhaPicotada,
  SeloCurva,
} from "@/components/ui";
import {
  calcularComissao,
  gerarParcelas,
  rotuloGatilho,
  type Plano,
} from "@/lib/comissao";
import { cx, dataBR, dinheiro, num, numeroBR, percentual } from "@/lib/format";

interface ProdutoOpcao {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  precoTabela: number;
  linha: string | null;
  comissaoPercentual: number | null;
}

interface RepresentadaOpcao {
  id: string;
  nome: string;
  cor: string;
  pedidoMinimo: number | null;
  produtos: ProdutoOpcao[];
  plano: Plano | null;
}

interface ClienteOpcao {
  id: string;
  nome: string;
  razaoSocial: string;
  cidade: string | null;
  uf: string | null;
  curva: "A" | "B" | "C" | "D";
  condicaoPagamento: string | null;
  representadas: string[];
}

interface Item {
  chave: string;
  productId: string | null;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: string;
  precoUnitario: string;
  descontoPercentual: string;
  comissaoPercentual: number | null;
}

function novoItem(): Item {
  return {
    chave: Math.random().toString(36).slice(2),
    productId: null,
    codigo: "",
    descricao: "",
    unidade: "UN",
    quantidade: "1",
    precoUnitario: "",
    descontoPercentual: "0",
    comissaoPercentual: null,
  };
}

export function FormPedido({
  dataPadrao,
  clientePre,
  representadaPre,
  clientes,
  representadas,
  acumulados,
}: {
  dataPadrao: string;
  clientePre: string | null;
  representadaPre: string | null;
  clientes: ClienteOpcao[];
  representadas: RepresentadaOpcao[];
  acumulados: Record<string, number>;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  const [clienteId, setClienteId] = useState(clientePre ?? "");
  const [representadaId, setRepresentadaId] = useState(
    representadaPre ?? (representadas.length === 1 ? representadas[0].id : ""),
  );
  const [data, setData] = useState(dataPadrao);
  const [numeroFornecedor, setNumeroFornecedor] = useState("");
  const [status, setStatus] = useState("ENVIADO");
  const [itens, setItens] = useState<Item[]>([novoItem()]);
  const [descontoPercentual, setDescontoPercentual] = useState("0");
  const [valorFrete, setValorFrete] = useState("");
  const [tipoFrete, setTipoFrete] = useState("CIF");
  const [condicaoPagamento, setCondicaoPagamento] = useState("");
  const [comissaoManual, setComissaoManual] = useState(false);
  const [comissaoPercentualManual, setComissaoPercentualManual] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [buscaCliente, setBuscaCliente] = useState("");
  const [buscaProduto, setBuscaProduto] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const cliente = clientes.find((c) => c.id === clienteId);
  const representada = representadas.find((r) => r.id === representadaId);

  // sugere a representada e a condição quando o cliente muda
  function escolherCliente(id: string) {
    setClienteId(id);
    const c = clientes.find((x) => x.id === id);
    if (c?.condicaoPagamento && !condicaoPagamento) setCondicaoPagamento(c.condicaoPagamento);
    if (!representadaId && c?.representadas.length === 1) setRepresentadaId(c.representadas[0]);
  }

  const clientesFiltrados = useMemo(() => {
    const termo = buscaCliente.trim().toLowerCase();
    const base = representadaId
      ? [...clientes].sort((a, b) => {
          const aTem = a.representadas.includes(representadaId) ? 0 : 1;
          const bTem = b.representadas.includes(representadaId) ? 0 : 1;
          return aTem - bTem;
        })
      : clientes;
    if (!termo) return base.slice(0, 30);
    return base
      .filter(
        (c) =>
          c.nome.toLowerCase().includes(termo) ||
          c.razaoSocial.toLowerCase().includes(termo) ||
          (c.cidade ?? "").toLowerCase().includes(termo),
      )
      .slice(0, 30);
  }, [buscaCliente, clientes, representadaId]);

  // ---------------- totais ----------------
  const totais = useMemo(() => {
    const linhas = itens.map((i) => {
      const bruto = num(i.quantidade) * num(i.precoUnitario);
      const total = bruto * (1 - num(i.descontoPercentual) / 100);
      return { total, comissaoPercentual: i.comissaoPercentual };
    });

    const valorBruto = linhas.reduce((s, l) => s + l.total, 0);
    const descontoValor = (valorBruto * num(descontoPercentual)) / 100;
    const frete = num(valorFrete);
    const valorLiquido = valorBruto - descontoValor - frete;

    return { linhas, valorBruto, descontoValor, frete, valorLiquido };
  }, [itens, descontoPercentual, valorFrete]);

  // ---------------- comissão ao vivo ----------------
  const simulacao = useMemo(() => {
    if (!representada?.plano) return null;

    const pedido = {
      valorBruto: totais.valorBruto,
      descontoValor: totais.descontoValor,
      valorFrete: totais.frete,
      valorImpostos: 0,
      valorLiquido: totais.valorLiquido,
      data: new Date(`${data}T12:00:00`),
      condicaoPagamento,
      itens: totais.linhas,
    };

    const acumulado = acumulados[representada.id] ?? 0;
    const resultado = calcularComissao(pedido, representada.plano, acumulado);

    const percentualFinal = comissaoManual
      ? num(comissaoPercentualManual)
      : resultado.percentual;

    const valorFinal = comissaoManual
      ? (resultado.base * percentualFinal) / 100
      : resultado.valorBruto;

    const imposto = (valorFinal * num(representada.plano.impostoPercentual)) / 100;

    const parcelas = gerarParcelas(pedido, representada.plano, {
      ...resultado,
      valorBruto: valorFinal,
      imposto,
      valorLiquido: valorFinal - imposto,
    });

    // quanto custa cada ponto de desconto
    const semDesconto = calcularComissao(
      { ...pedido, descontoValor: 0, valorLiquido: totais.valorBruto - totais.frete },
      representada.plano,
      acumulado,
    );
    const custoPorPonto =
      num(descontoPercentual) > 0
        ? (semDesconto.valorBruto - resultado.valorBruto) / num(descontoPercentual)
        : (totais.valorBruto / 100) * (resultado.percentual / 100);

    return {
      resultado,
      percentualFinal,
      valorFinal,
      imposto,
      liquido: valorFinal - imposto,
      parcelas,
      acumulado,
      custoPorPonto,
    };
  }, [
    representada,
    totais,
    data,
    condicaoPagamento,
    comissaoManual,
    comissaoPercentualManual,
    descontoPercentual,
    acumulados,
  ]);

  function atualizarItem(chave: string, campo: keyof Item, valor: string | null) {
    setItens((atual) =>
      atual.map((i) => (i.chave === chave ? { ...i, [campo]: valor } : i)),
    );
  }

  function escolherProduto(chave: string, produto: ProdutoOpcao) {
    setItens((atual) =>
      atual.map((i) =>
        i.chave === chave
          ? {
              ...i,
              productId: produto.id,
              codigo: produto.codigo,
              descricao: produto.descricao,
              unidade: produto.unidade,
              precoUnitario: String(produto.precoTabela),
              comissaoPercentual: produto.comissaoPercentual,
            }
          : i,
      ),
    );
    setBuscaProduto(null);
  }

  function enviar() {
    setErro(null);

    if (!clienteId) return setErro("Escolha o cliente.");
    if (!representadaId) return setErro("Escolha a representada.");

    const itensValidos = itens.filter((i) => i.descricao.trim() && num(i.precoUnitario) > 0);
    if (itensValidos.length === 0) return setErro("Adicione pelo menos um item com preço.");

    iniciar(async () => {
      const r = await salvarPedido({
        clientId: clienteId,
        representadaId,
        data: new Date(`${data}T12:00:00`).toISOString(),
        numeroFornecedor: numeroFornecedor || null,
        status: status as never,
        origem: "MANUAL",
        descontoPercentual: num(descontoPercentual),
        valorFrete: num(valorFrete),
        tipoFrete: tipoFrete as never,
        condicaoPagamento: condicaoPagamento || null,
        comissaoManual,
        comissaoPercentual: comissaoManual ? num(comissaoPercentualManual) : null,
        observacoes: observacoes || null,
        itens: itensValidos.map((i) => ({
          productId: i.productId,
          codigo: i.codigo || null,
          descricao: i.descricao,
          unidade: i.unidade,
          quantidade: num(i.quantidade),
          precoUnitario: num(i.precoUnitario),
          descontoPercentual: num(i.descontoPercentual),
          comissaoPercentual: i.comissaoPercentual,
        })),
      });

      if ("erro" in r && r.erro) {
        setErro(r.erro);
        return;
      }
      router.push(`/pedidos/${(r as { id: string }).id}`);
      router.refresh();
    });
  }

  const abaixoDoMinimo =
    representada?.pedidoMinimo && totais.valorLiquido > 0
      ? totais.valorLiquido < representada.pedidoMinimo
      : false;

  return (
    <div className="escala grid lg:grid-cols-[1fr_360px] gap-4 items-start">
      {/* ================= coluna principal ================= */}
      <div className="space-y-4">
        {erro ? (
          <div className="flex items-start gap-2 rounded-xl px-4 py-3 bg-carimbo-fundo text-carimbo text-[13.5px] anim-subir">
            <Icone nome="alerta" tamanho={16} />
            {erro}
          </div>
        ) : null}

        {/* --------- quem e de quem --------- */}
        <Canhoto>
          <CanhotoTitulo titulo="Cabeçalho" icone="pedido" />
          <div className="px-4 pb-4 space-y-3">
            <div>
              <span className="rotulo">Representada</span>
              <div className="flex flex-wrap gap-1.5">
                {representadas.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRepresentadaId(r.id)}
                    className={cx(
                      "etiqueta transition-colors",
                      representadaId === r.id
                        ? "text-white border-transparent"
                        : "border-papel-borda text-tinta-3",
                    )}
                    style={representadaId === r.id ? { background: r.cor } : undefined}
                  >
                    {representadaId === r.id ? <Icone nome="check" tamanho={11} /> : null}
                    {r.nome}
                  </button>
                ))}
              </div>
              {representada && !representada.plano ? (
                <p className="text-[12px] text-ambar bg-ambar-fundo rounded-lg px-2.5 py-2 mt-2 flex items-center gap-2">
                  <Icone nome="alerta" tamanho={13} />
                  Essa representada não tem plano de comissão — o pedido salva, mas sem cálculo.
                </p>
              ) : null}
            </div>

            <div>
              <span className="rotulo">Cliente</span>
              {cliente ? (
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-caneta bg-caneta-fundo">
                  <SeloCurva curva={cliente.curva} tamanho={22} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-semibold text-tinta truncate">
                      {cliente.nome}
                    </span>
                    <span className="block text-[11.5px] text-tinta-3 truncate">
                      {cliente.cidade ? `${cliente.cidade}/${cliente.uf}` : "Sem endereço"}
                      {cliente.condicaoPagamento ? ` · ${cliente.condicaoPagamento}` : ""}
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
                      value={buscaCliente}
                      onChange={(e) => setBuscaCliente(e.target.value)}
                      placeholder="Buscar cliente"
                      className="campo pl-9"
                    />
                  </div>
                  <div className="mt-1.5 max-h-[160px] overflow-y-auto sem-barra rounded-xl border border-papel-borda divide-y divide-[var(--color-papel-borda)]">
                    {clientesFiltrados.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => escolherCliente(c.id)}
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
                        {representadaId && c.representadas.includes(representadaId) ? (
                          <Etiqueta tom="quitado">já compra</Etiqueta>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Campo rotulo="Data">
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="campo"
                />
              </Campo>
              <Campo rotulo="Nº na fábrica">
                <input
                  value={numeroFornecedor}
                  onChange={(e) => setNumeroFornecedor(e.target.value)}
                  className="campo cifra"
                  placeholder="opcional"
                />
              </Campo>
              <Campo rotulo="Situação">
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="campo">
                  <option value="RASCUNHO">Rascunho</option>
                  <option value="ENVIADO">Enviado</option>
                  <option value="APROVADO">Aprovado</option>
                  <option value="FATURADO">Faturado</option>
                </select>
              </Campo>
              <Campo rotulo="Condição" dica="30/60/90">
                <input
                  value={condicaoPagamento}
                  onChange={(e) => setCondicaoPagamento(e.target.value)}
                  placeholder="30/60/90"
                  className="campo cifra"
                />
              </Campo>
            </div>
          </div>
        </Canhoto>

        {/* --------- itens --------- */}
        <Canhoto>
          <CanhotoTitulo
            titulo="Itens"
            sub={representada?.produtos.length ? "Escolha do catálogo ou digite livre" : undefined}
            icone="planilha"
            acao={
              <button
                type="button"
                onClick={() => setItens((a) => [...a, novoItem()])}
                className="botao botao-papel text-[12.5px] px-2.5 py-1.5"
              >
                <Icone nome="mais" tamanho={14} />
                Item
              </button>
            }
          />

          <div className="px-4 pb-4 space-y-3">
            {itens.map((item, indice) => {
              const totalItem = totais.linhas[indice]?.total ?? 0;
              const produtosFiltrados =
                representada?.produtos.filter((p) => {
                  const termo = item.descricao.trim().toLowerCase();
                  if (!termo) return true;
                  return (
                    p.descricao.toLowerCase().includes(termo) ||
                    p.codigo.toLowerCase().includes(termo)
                  );
                }) ?? [];

              return (
                <div key={item.chave} className="rounded-xl border border-papel-borda p-3 relative">
                  {itens.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setItens((a) => a.filter((x) => x.chave !== item.chave))}
                      className="absolute right-2 top-2 p-1.5 text-tinta-3 hover:text-carimbo"
                      aria-label="Remover item"
                    >
                      <Icone nome="fechar" tamanho={15} />
                    </button>
                  ) : null}

                  <div className="relative mb-2.5 pr-7">
                    <input
                      value={item.descricao}
                      onChange={(e) => {
                        atualizarItem(item.chave, "descricao", e.target.value);
                        atualizarItem(item.chave, "productId", null);
                      }}
                      onFocus={() => setBuscaProduto(item.chave)}
                      placeholder="Produto ou descrição"
                      className="campo text-[13.5px]"
                    />

                    {buscaProduto === item.chave && produtosFiltrados.length > 0 ? (
                      <div className="absolute z-20 left-0 right-7 mt-1 max-h-[180px] overflow-y-auto sem-barra rounded-xl border border-papel-borda bg-papel-alto shadow-[var(--shadow-erguido)] divide-y divide-[var(--color-papel-borda)]">
                        {produtosFiltrados.slice(0, 20).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => escolherProduto(item.chave, p)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left active:bg-caneta-fundo"
                          >
                            <span className="cifra text-[11px] text-tinta-3 w-[62px] shrink-0 truncate">
                              {p.codigo}
                            </span>
                            <span className="min-w-0 flex-1 text-[12.5px] text-tinta truncate">
                              {p.descricao}
                            </span>
                            <span className="cifra text-[12px] text-tinta-2 shrink-0">
                              {dinheiro(p.precoTabela)}
                            </span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setBuscaProduto(null)}
                          className="w-full px-3 py-2 text-[12px] text-tinta-3"
                        >
                          Fechar sugestões
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <Campo rotulo="Qtd">
                      <input
                        value={item.quantidade}
                        onChange={(e) => atualizarItem(item.chave, "quantidade", e.target.value)}
                        inputMode="decimal"
                        className="campo cifra text-[13px]"
                      />
                    </Campo>
                    <Campo rotulo="Preço">
                      <input
                        value={item.precoUnitario}
                        onChange={(e) => atualizarItem(item.chave, "precoUnitario", e.target.value)}
                        inputMode="decimal"
                        placeholder="0,00"
                        className="campo cifra text-[13px]"
                      />
                    </Campo>
                    <Campo rotulo="Desc %">
                      <input
                        value={item.descontoPercentual}
                        onChange={(e) =>
                          atualizarItem(item.chave, "descontoPercentual", e.target.value)
                        }
                        inputMode="decimal"
                        className="campo cifra text-[13px]"
                      />
                    </Campo>
                    <div>
                      <span className="rotulo">Total</span>
                      <p className="cifra text-[14px] text-tinta py-2.5">{dinheiro(totalItem)}</p>
                    </div>
                  </div>

                  {item.comissaoPercentual !== null ? (
                    <p className="text-[11.5px] text-caneta mt-1.5 flex items-center gap-1">
                      <Icone nome="comissao" tamanho={12} />
                      Esse produto paga {percentual(item.comissaoPercentual)} de comissão
                    </p>
                  ) : null}
                </div>
              );
            })}

            <LinhaPicotada />

            <div className="grid grid-cols-3 gap-3">
              <Campo rotulo="Desconto geral %">
                <input
                  value={descontoPercentual}
                  onChange={(e) => setDescontoPercentual(e.target.value)}
                  inputMode="decimal"
                  className="campo cifra"
                />
              </Campo>
              <Campo rotulo="Frete">
                <input
                  value={valorFrete}
                  onChange={(e) => setValorFrete(e.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                  className="campo cifra"
                />
              </Campo>
              <Campo rotulo="Tipo de frete">
                <select
                  value={tipoFrete}
                  onChange={(e) => setTipoFrete(e.target.value)}
                  className="campo"
                >
                  <option value="CIF">CIF</option>
                  <option value="FOB">FOB</option>
                  <option value="SEM_FRETE">Sem frete</option>
                </select>
              </Campo>
            </div>

            <Campo rotulo="Observações">
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={2}
                className="campo resize-none"
                placeholder="Prazo prometido, condição especial, entrega parcial..."
              />
            </Campo>
          </div>
        </Canhoto>
      </div>

      {/* ================= painel do dinheiro ================= */}
      <div className="space-y-4 lg:sticky lg:top-6">
        <Canhoto picotado className="p-4">
          <p className="rotulo mb-1">Total do pedido</p>
          <p className="cifra text-[30px] text-tinta font-medium leading-none">
            {dinheiro(totais.valorLiquido)}
          </p>

          <div className="space-y-1.5 text-[12.5px] mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-tinta-2">Itens</span>
              <span className="flex-1 border-b border-dotted border-papel-borda translate-y-[-3px]" />
              <span className="cifra text-tinta">{dinheiro(totais.valorBruto)}</span>
            </div>
            {totais.descontoValor > 0 ? (
              <div className="flex items-baseline gap-2">
                <span className="text-tinta-2">Desconto {percentual(descontoPercentual)}</span>
                <span className="flex-1 border-b border-dotted border-papel-borda translate-y-[-3px]" />
                <span className="cifra text-carimbo">−{dinheiro(totais.descontoValor)}</span>
              </div>
            ) : null}
            {totais.frete > 0 ? (
              <div className="flex items-baseline gap-2">
                <span className="text-tinta-2">Frete</span>
                <span className="flex-1 border-b border-dotted border-papel-borda translate-y-[-3px]" />
                <span className="cifra text-tinta">{dinheiro(totais.frete)}</span>
              </div>
            ) : null}
          </div>

          {abaixoDoMinimo ? (
            <p className="mt-3 text-[12px] text-ambar bg-ambar-fundo rounded-lg px-2.5 py-2 flex items-start gap-2">
              <Icone nome="alerta" tamanho={13} />
              Abaixo do pedido mínimo de {dinheiro(representada!.pedidoMinimo!)}.
            </p>
          ) : null}
        </Canhoto>

        {simulacao ? (
          <Canhoto className="overflow-hidden">
            <div
              className="h-1"
              style={{ background: representada?.cor ?? "var(--color-caneta)" }}
            />
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="rotulo mb-0">Sua comissão</p>
                <Etiqueta tom="tinta">{percentual(simulacao.percentualFinal)}</Etiqueta>
              </div>

              <p className="cifra text-[28px] text-quitado font-medium leading-none">
                {dinheiro(simulacao.liquido)}
              </p>
              {simulacao.imposto > 0 ? (
                <p className="text-[11.5px] text-tinta-3 mt-1">
                  {dinheiro(simulacao.valorFinal)} bruto − {dinheiro(simulacao.imposto)} de imposto
                </p>
              ) : null}

              {simulacao.resultado.bonus > 0 ? (
                <p className="text-[12px] text-quitado mt-2 flex items-center gap-1.5">
                  <Icone nome="estrela" tamanho={13} />
                  Inclui {dinheiro(simulacao.resultado.bonus)} de bônus por bater a meta.
                </p>
              ) : null}

              <p className="text-[11.5px] text-tinta-3 mt-2 leading-snug">
                {simulacao.resultado.explicacao}
              </p>

              <LinhaPicotada rotulo="quando cai" />

              <ul className="space-y-1.5">
                {simulacao.parcelas.map((p) => (
                  <li key={p.parcela} className="flex items-baseline gap-2 text-[12.5px]">
                    <span className="text-tinta-2">
                      {simulacao.parcelas.length > 1 ? `${p.parcela}/${p.totalParcelas}` : "Única"}
                    </span>
                    <span className="flex-1 border-b border-dotted border-papel-borda translate-y-[-3px]" />
                    <span className="text-tinta-3">{dataBR(p.vencimento)}</span>
                    <span className="cifra text-tinta w-[80px] text-right">
                      {dinheiro(p.valorLiquido)}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="text-[11px] text-tinta-3 mt-2.5">
                {representada?.plano
                  ? rotuloGatilho[representada.plano.gatilho]
                  : ""}
                {representada?.plano?.prazoDias
                  ? ` + ${representada.plano.prazoDias} dias`
                  : ""}
              </p>

              {num(descontoPercentual) > 0 ? (
                <p className="mt-3 text-[12px] text-carimbo bg-carimbo-fundo rounded-lg px-2.5 py-2 leading-snug">
                  Cada 1% de desconto tira{" "}
                  <strong className="cifra">{dinheiro(simulacao.custoPorPonto)}</strong> do seu
                  bolso.
                </p>
              ) : null}

              <LinhaPicotada />

              <label className="flex items-center gap-2.5 text-[12.5px] text-tinta-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={comissaoManual}
                  onChange={(e) => {
                    setComissaoManual(e.target.checked);
                    if (e.target.checked && !comissaoPercentualManual) {
                      setComissaoPercentualManual(simulacao.resultado.percentual.toFixed(2));
                    }
                  }}
                  className="w-4 h-4 accent-[var(--color-caneta)]"
                />
                Forçar outro percentual
              </label>

              {comissaoManual ? (
                <div className="relative mt-2">
                  <input
                    value={comissaoPercentualManual}
                    onChange={(e) => setComissaoPercentualManual(e.target.value)}
                    inputMode="decimal"
                    className="campo cifra pr-8"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-tinta-3">%</span>
                </div>
              ) : null}
            </div>
          </Canhoto>
        ) : representada ? (
          <Canhoto className="p-4 text-center">
            <span className="inline-flex w-10 h-10 rounded-xl bg-ambar-fundo text-ambar items-center justify-center mb-2">
              <Icone nome="alerta" tamanho={19} />
            </span>
            <p className="text-[13.5px] text-tinta">Sem plano de comissão</p>
            <p className="text-[12px] text-tinta-3 mt-1 mb-3">
              Configure o acerto dessa representada para o cálculo funcionar.
            </p>
            <Link
              href={`/representadas/${representada.id}`}
              className="botao botao-papel w-full text-[13px]"
            >
              Configurar plano
            </Link>
          </Canhoto>
        ) : null}

        <div className="flex gap-2">
          <Link href="/pedidos" className="botao botao-papel flex-1">
            Cancelar
          </Link>
          <button
            type="button"
            onClick={enviar}
            disabled={pendente}
            className="botao botao-tinta flex-[2]"
          >
            {pendente ? "Salvando..." : "Lançar pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}
