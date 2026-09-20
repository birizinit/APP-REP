"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import {
  analisarArquivo,
  geocodificarImportados,
  gravarPedidoDoPdf,
  importarClientes,
  importarPedidos,
} from "@/app/actions/importar";
import { Icone } from "@/components/icone";
import { Campo, Canhoto, CanhotoTitulo, Carimbo, Etiqueta, LinhaPicotada } from "@/components/ui";
import { cx, dataBR, dinheiro, formatarCnpj, num, paraInputData, soDigitos } from "@/lib/format";

type Destino = "clientes" | "pedidos";

const ROTULOS_CLIENTE: Record<string, string> = {
  cnpj: "CNPJ",
  razaoSocial: "Razão social",
  nomeFantasia: "Nome fantasia",
  email: "E-mail",
  telefone: "Telefone",
  contatoNome: "Contato",
  cep: "CEP",
  logradouro: "Logradouro",
  numero: "Número",
  complemento: "Complemento",
  bairro: "Bairro",
  cidade: "Cidade",
  uf: "UF",
  inscricaoEstadual: "Inscrição estadual",
  observacoes: "Observações",
};

const ROTULOS_PEDIDO: Record<string, string> = {
  numero: "Nº do pedido",
  cnpj: "CNPJ do cliente",
  cliente: "Nome do cliente",
  data: "Data",
  valor: "Valor",
  condicaoPagamento: "Condição de pagamento",
  produto: "Produto",
  codigo: "Código",
  quantidade: "Quantidade",
  precoUnitario: "Preço unitário",
  representada: "Representada",
  comissao: "Comissão",
};

interface AnalisePlanilha {
  tipo: "planilha";
  arquivoNome: string;
  colunas: string[];
  mapeamento: Record<string, string | null>;
  amostra: Array<Record<string, string>>;
  total: number;
  jobId: string;
}

interface AnalisePdf {
  tipo: "pdf";
  arquivoNome: string;
  jobId: string;
  clienteSugerido: { id: string; razaoSocial: string; nomeFantasia: string | null } | null;
  extraido: {
    numero: string | null;
    cnpj: string | null;
    razaoSocial: string | null;
    data: string | null;
    valorTotal: number | null;
    condicaoPagamento: string | null;
    confianca: string;
    itens: Array<{
      codigo: string | null;
      descricao: string;
      quantidade: number;
      precoUnitario: number;
      total: number;
    }>;
  };
}

export function Importador({
  regioes,
  representadas,
  clientes,
}: {
  regioes: Array<{ id: string; nome: string }>;
  representadas: Array<{ id: string; nome: string; cor: string }>;
  clientes: Array<{ id: string; cnpj: string; nome: string }>;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const entrada = useRef<HTMLInputElement>(null);

  const [destino, setDestino] = useState<Destino>("clientes");
  const [arrastando, setArrastando] = useState(false);
  const [analise, setAnalise] = useState<AnalisePlanilha | AnalisePdf | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    importados: number;
    atualizados?: number;
    ignorados: number;
    erros: Array<{ linha: number; motivo: string }>;
  } | null>(null);

  // opções
  const [atualizarExistentes, setAtualizarExistentes] = useState(true);
  const [regionId, setRegionId] = useState("");
  const [representadaId, setRepresentadaId] = useState(representadas[0]?.id ?? "");
  const [criarClientes, setCriarClientes] = useState(true);
  const [clienteEscolhido, setClienteEscolhido] = useState("");
  const [geocodificando, setGeocodificando] = useState<string | null>(null);

  function enviarArquivo(arquivo: File) {
    setErro(null);
    setResultado(null);
    setAnalise(null);

    const dados = new FormData();
    dados.set("arquivo", arquivo);
    dados.set("destino", destino);

    iniciar(async () => {
      const r = await analisarArquivo(dados);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      setAnalise(r.analise as AnalisePlanilha | AnalisePdf);
      if (r.analise.tipo === "pdf" && r.analise.clienteSugerido) {
        setClienteEscolhido(r.analise.clienteSugerido.id);
      }
    });
  }

  function confirmarPlanilha() {
    if (!analise || analise.tipo !== "planilha") return;
    setErro(null);

    iniciar(async () => {
      const r =
        destino === "clientes"
          ? await importarClientes({
              jobId: analise.jobId,
              mapeamento: analise.mapeamento,
              atualizarExistentes,
              regionId: regionId || null,
              representadaId: representadaId || null,
            })
          : await importarPedidos({
              jobId: analise.jobId,
              mapeamento: analise.mapeamento,
              representadaId,
              criarClientesFaltantes: criarClientes,
            });

      if ("erro" in r && r.erro) {
        setErro(r.erro);
        return;
      }
      setResultado({
        importados: (r as { importados: number }).importados,
        atualizados: (r as { atualizados?: number }).atualizados,
        ignorados: (r as { ignorados: number }).ignorados,
        erros: (r as { erros: Array<{ linha: number; motivo: string }> }).erros ?? [],
      });
      setAnalise(null);
      router.refresh();
    });
  }

  function confirmarPdf(dados: FormData) {
    if (!analise || analise.tipo !== "pdf") return;
    setErro(null);

    iniciar(async () => {
      const r = await gravarPedidoDoPdf({
        jobId: analise.jobId,
        clientId: clienteEscolhido,
        representadaId,
        numeroFornecedor: String(dados.get("numero") ?? "") || null,
        data: String(dados.get("data") ?? "") || null,
        condicaoPagamento: String(dados.get("condicao") ?? "") || null,
        itens: analise.extraido.itens,
      });

      if ("erro" in r && r.erro) {
        setErro(r.erro);
        return;
      }
      router.push(`/pedidos/${(r as { id: string }).id}`);
      router.refresh();
    });
  }

  function localizar() {
    setGeocodificando("Buscando endereços no mapa...");
    iniciar(async () => {
      const r = await geocodificarImportados(20);
      setGeocodificando(
        `Localizei ${r.achados} de ${r.total}. Rode de novo se ainda faltar alguém.`,
      );
      router.refresh();
    });
  }

  // =================== resultado ===================
  if (resultado) {
    return (
      <Canhoto picotado className="p-6 text-center anim-subir">
        <Carimbo tom="quitado" grande batendo>
          importado
        </Carimbo>

        <div className="flex flex-wrap justify-center gap-6 mt-7 mb-5">
          {[
            { r: "Novos", v: resultado.importados, cor: "text-quitado" },
            ...(resultado.atualizados !== undefined
              ? [{ r: "Atualizados", v: resultado.atualizados, cor: "text-caneta" }]
              : []),
            { r: "Fora", v: resultado.ignorados, cor: "text-tinta-3" },
          ].map((m) => (
            <div key={m.r}>
              <p className={`numeral text-[30px] ${m.cor}`}>{m.v}</p>
              <p className="text-[11px] uppercase tracking-[0.1em] text-tinta-3 mt-1">{m.r}</p>
            </div>
          ))}
        </div>

        {resultado.erros.length > 0 ? (
          <div className="text-left max-w-[420px] mx-auto mb-5">
            <p className="rotulo mb-1.5">O que ficou de fora</p>
            <ul className="space-y-1 text-[12.5px] text-tinta-2">
              {resultado.erros.slice(0, 8).map((e, i) => (
                <li key={i} className="flex gap-2">
                  {e.linha > 0 ? (
                    <span className="cifra text-tinta-3 shrink-0">L{e.linha}</span>
                  ) : null}
                  {e.motivo}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 justify-center">
          {destino === "clientes" ? (
            <>
              <button
                type="button"
                onClick={localizar}
                disabled={pendente}
                className="botao botao-tinta"
              >
                <Icone nome="pino" tamanho={16} />
                Localizar no mapa
              </button>
              <Link href="/clientes" className="botao botao-papel">
                Ver clientes
              </Link>
            </>
          ) : (
            <Link href="/pedidos" className="botao botao-tinta">
              Ver pedidos
            </Link>
          )}
          <button
            type="button"
            onClick={() => setResultado(null)}
            className="botao botao-papel"
          >
            Importar outro
          </button>
        </div>

        {geocodificando ? (
          <p className="text-[12.5px] text-tinta-3 mt-4">{geocodificando}</p>
        ) : null}
      </Canhoto>
    );
  }

  // =================== PDF ===================
  if (analise?.tipo === "pdf") {
    const e = analise.extraido;
    const total = e.itens.reduce((s, i) => s + i.total, 0);

    return (
      <form action={confirmarPdf} className="space-y-4 anim-subir">
        <Canhoto>
          <CanhotoTitulo
            titulo="Li o PDF"
            sub={analise.arquivoNome}
            icone="pdf"
            acao={
              <Etiqueta
                tom={
                  e.confianca === "alta" ? "quitado" : e.confianca === "media" ? "ambar" : "carimbo"
                }
              >
                confiança {e.confianca}
              </Etiqueta>
            }
          />

          <div className="px-4 pb-4">
            <p className="text-[12.5px] text-tinta-2 leading-relaxed mb-4">
              Cada fábrica tem um layout. Confira os campos antes de gravar — o que estiver errado
              você corrige aqui.
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              <Campo rotulo="Representada" obrigatorio>
                <select
                  value={representadaId}
                  onChange={(ev) => setRepresentadaId(ev.target.value)}
                  className="campo"
                  required
                >
                  {representadas.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo
                rotulo="Cliente"
                obrigatorio
                dica={
                  e.cnpj
                    ? `CNPJ no PDF: ${formatarCnpj(e.cnpj)}${e.razaoSocial ? ` · ${e.razaoSocial}` : ""}`
                    : "Não achei CNPJ no arquivo."
                }
              >
                <select
                  value={clienteEscolhido}
                  onChange={(ev) => setClienteEscolhido(ev.target.value)}
                  className="campo"
                  required
                >
                  <option value="">Escolha o cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo rotulo="Nº do pedido">
                <input
                  name="numero"
                  defaultValue={e.numero ?? ""}
                  className="campo cifra"
                />
              </Campo>

              <Campo rotulo="Data">
                <input
                  type="date"
                  name="data"
                  defaultValue={e.data ? paraInputData(e.data) : paraInputData(new Date())}
                  className="campo"
                />
              </Campo>

              <Campo rotulo="Condição de pagamento" className="sm:col-span-2">
                <input
                  name="condicao"
                  defaultValue={e.condicaoPagamento ?? ""}
                  placeholder="30/60/90"
                  className="campo cifra"
                />
              </Campo>
            </div>

            {!analise.clienteSugerido && e.cnpj ? (
              <p className="mt-3 text-[12.5px] text-ambar bg-ambar-fundo rounded-xl px-3 py-2.5 flex items-start gap-2">
                <Icone nome="alerta" tamanho={14} />
                <span>
                  O CNPJ {formatarCnpj(e.cnpj)} não está na carteira.{" "}
                  <Link href="/clientes/novo" className="underline font-semibold">
                    Cadastrar agora
                  </Link>
                </span>
              </p>
            ) : null}
          </div>
        </Canhoto>

        <Canhoto>
          <CanhotoTitulo
            titulo={`${e.itens.length} itens encontrados`}
            sub={e.valorTotal ? `Total no PDF: ${dinheiro(e.valorTotal)}` : undefined}
            icone="planilha"
          />
          <div className="max-h-[300px] overflow-y-auto sem-barra border-t border-papel-borda">
            {e.itens.length > 0 ? (
              e.itens.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-papel-borda last:border-0"
                >
                  {item.codigo ? (
                    <span className="cifra text-[11px] text-tinta-3 w-[60px] shrink-0 truncate">
                      {item.codigo}
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1 text-[12.5px] text-tinta truncate">
                    {item.descricao}
                  </span>
                  <span className="cifra text-[11.5px] text-tinta-3 shrink-0">
                    {item.quantidade}×
                  </span>
                  <span className="cifra text-[12.5px] text-tinta shrink-0 w-[80px] text-right">
                    {dinheiro(item.total)}
                  </span>
                </div>
              ))
            ) : (
              <p className="px-4 py-6 text-[13px] text-tinta-3 text-center">
                Não consegui separar os itens desse layout. Você ainda pode gravar o pedido e
                lançar os itens na mão.
              </p>
            )}
          </div>

          {e.itens.length > 0 ? (
            <div className="px-4 py-3 border-t border-papel-borda flex items-baseline justify-between">
              <span className="text-[12.5px] text-tinta-2">Soma dos itens</span>
              <span className="cifra text-[16px] text-tinta">{dinheiro(total)}</span>
            </div>
          ) : null}
        </Canhoto>

        {erro ? (
          <p className="text-[13px] text-carimbo bg-carimbo-fundo rounded-xl px-4 py-3">{erro}</p>
        ) : null}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAnalise(null)}
            className="botao botao-papel flex-1"
          >
            Descartar
          </button>
          <button
            type="submit"
            disabled={pendente || !clienteEscolhido || e.itens.length === 0}
            className="botao botao-tinta flex-[2]"
          >
            {pendente ? "Gravando..." : "Gravar pedido"}
          </button>
        </div>
      </form>
    );
  }

  // =================== planilha ===================
  if (analise?.tipo === "planilha") {
    const rotulos = destino === "clientes" ? ROTULOS_CLIENTE : ROTULOS_PEDIDO;
    const reconhecidos = Object.values(analise.mapeamento).filter(Boolean).length;

    return (
      <div className="space-y-4 anim-subir">
        <Canhoto>
          <CanhotoTitulo
            titulo="Confira as colunas"
            sub={`${analise.arquivoNome} · ${analise.total} linhas`}
            icone="planilha"
            acao={
              <Etiqueta tom={reconhecidos >= 3 ? "quitado" : "ambar"}>
                {reconhecidos} campos reconhecidos
              </Etiqueta>
            }
          />

          <div className="px-4 pb-4">
            <p className="text-[12.5px] text-tinta-2 leading-relaxed mb-4">
              Liguei cada campo do sistema à coluna que me pareceu certa. Ajuste o que estiver
              trocado — o que ficar em “ignorar” não é importado.
            </p>

            <div className="space-y-1.5">
              {Object.entries(rotulos).map(([campo, nome]) => (
                <div key={campo} className="flex items-center gap-2.5">
                  <span className="text-[12.5px] text-tinta-2 w-[132px] shrink-0">{nome}</span>
                  <span className="text-tinta-3 shrink-0">
                    <Icone nome="seta" tamanho={13} />
                  </span>
                  <select
                    value={analise.mapeamento[campo] ?? ""}
                    onChange={(ev) =>
                      setAnalise({
                        ...analise,
                        mapeamento: { ...analise.mapeamento, [campo]: ev.target.value || null },
                      })
                    }
                    className={cx(
                      "campo text-[13px] flex-1",
                      analise.mapeamento[campo] ? "" : "text-tinta-3",
                    )}
                  >
                    <option value="">— ignorar —</option>
                    {analise.colunas.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </Canhoto>

        <Canhoto>
          <CanhotoTitulo titulo="Prévia" sub="Primeiras linhas do arquivo" icone="olho" />
          <div className="overflow-x-auto sem-barra border-t border-papel-borda">
            <table className="w-full text-[11.5px] whitespace-nowrap">
              <thead>
                <tr className="text-tinta-3 text-left border-b border-papel-borda">
                  {analise.colunas.slice(0, 8).map((c) => (
                    <th key={c} className="font-semibold py-2 px-3">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analise.amostra.map((linha, i) => (
                  <tr key={i} className="border-b border-papel-borda last:border-0">
                    {analise.colunas.slice(0, 8).map((c) => (
                      <td key={c} className="py-1.5 px-3 text-tinta-2 max-w-[160px] truncate">
                        {linha[c]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Canhoto>

        <Canhoto className="p-4 space-y-3">
          <p className="rotulo mb-0">Opções</p>

          {destino === "clientes" ? (
            <>
              <label className="flex items-start gap-2.5 text-[13px] text-tinta-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={atualizarExistentes}
                  onChange={(ev) => setAtualizarExistentes(ev.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-[var(--color-caneta)]"
                />
                <span>
                  Atualizar quem já está na carteira
                  <span className="block text-[11.5px] text-tinta-3">
                    Comparo pelo CNPJ. Desmarcado, os repetidos são pulados.
                  </span>
                </span>
              </label>

              <div className="grid sm:grid-cols-2 gap-3">
                <Campo rotulo="Jogar todos na região">
                  <select
                    value={regionId}
                    onChange={(ev) => setRegionId(ev.target.value)}
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
                <Campo rotulo="Vincular à representada">
                  <select
                    value={representadaId}
                    onChange={(ev) => setRepresentadaId(ev.target.value)}
                    className="campo"
                  >
                    <option value="">Nenhuma</option>
                    {representadas.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nome}
                      </option>
                    ))}
                  </select>
                </Campo>
              </div>
            </>
          ) : (
            <>
              <Campo rotulo="Representada dos pedidos" obrigatorio>
                <select
                  value={representadaId}
                  onChange={(ev) => setRepresentadaId(ev.target.value)}
                  className="campo"
                >
                  {representadas.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome}
                    </option>
                  ))}
                </select>
              </Campo>
              <label className="flex items-start gap-2.5 text-[13px] text-tinta-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={criarClientes}
                  onChange={(ev) => setCriarClientes(ev.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-[var(--color-caneta)]"
                />
                <span>
                  Criar cliente que ainda não existe
                  <span className="block text-[11.5px] text-tinta-3">
                    Cadastro básico, para você completar depois.
                  </span>
                </span>
              </label>
            </>
          )}
        </Canhoto>

        {erro ? (
          <p className="text-[13px] text-carimbo bg-carimbo-fundo rounded-xl px-4 py-3">{erro}</p>
        ) : null}

        <div className="flex gap-2">
          <button type="button" onClick={() => setAnalise(null)} className="botao botao-papel flex-1">
            Descartar
          </button>
          <button
            type="button"
            onClick={confirmarPlanilha}
            disabled={pendente}
            className="botao botao-tinta flex-[2]"
          >
            {pendente ? "Importando..." : `Importar ${analise.total} linhas`}
          </button>
        </div>
      </div>
    );
  }

  // =================== upload ===================
  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {[
          { valor: "clientes" as const, rotulo: "Clientes", icone: "clientes" as const },
          { valor: "pedidos" as const, rotulo: "Pedidos", icone: "pedido" as const },
        ].map((d) => (
          <button
            key={d.valor}
            type="button"
            onClick={() => setDestino(d.valor)}
            className={cx(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-colors",
              destino === d.valor
                ? "border-caneta bg-caneta-fundo text-caneta font-semibold"
                : "border-papel-borda text-tinta-3",
            )}
          >
            <Icone nome={d.icone} tamanho={17} />
            {d.rotulo}
          </button>
        ))}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          const arquivo = e.dataTransfer.files[0];
          if (arquivo) enviarArquivo(arquivo);
        }}
        className={cx(
          "canhoto flex flex-col items-center text-center px-6 py-12 transition-colors border-dashed border-2",
          arrastando ? "border-caneta bg-caneta-fundo" : "border-papel-borda",
        )}
      >
        <span
          className={cx(
            "w-14 h-14 rounded-2xl grid place-items-center mb-4 transition-colors",
            arrastando ? "bg-caneta text-white" : "bg-caneta-fundo text-caneta",
          )}
        >
          <Icone nome="importar" tamanho={26} />
        </span>

        <h2 className="text-[18px] text-tinta">
          {pendente ? "Lendo o arquivo..." : "Arraste o arquivo aqui"}
        </h2>
        <p className="text-[13px] text-tinta-3 mt-1.5 mb-5 max-w-[42ch] leading-relaxed">
          {destino === "clientes"
            ? "Planilha .xlsx ou .csv com a sua carteira. Não precisa arrumar as colunas antes."
            : "Planilha de pedidos ou o PDF que a fábrica manda — leio os itens e os valores."}
        </p>

        <input
          ref={entrada}
          type="file"
          accept=".xlsx,.xls,.csv,.pdf"
          className="sr-only"
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            if (arquivo) enviarArquivo(arquivo);
            e.target.value = "";
          }}
        />

        <button
          type="button"
          onClick={() => entrada.current?.click()}
          disabled={pendente}
          className="botao botao-tinta"
        >
          {pendente ? (
            <>
              <span className="anim-rodar">
                <Icone nome="atualizar" tamanho={16} />
              </span>
              Analisando
            </>
          ) : (
            <>
              <Icone nome="clipe" tamanho={16} />
              Escolher arquivo
            </>
          )}
        </button>

        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-5">
          <Etiqueta tom="neutro" icone="planilha">
            .xlsx
          </Etiqueta>
          <Etiqueta tom="neutro" icone="planilha">
            .csv
          </Etiqueta>
          {destino === "pedidos" ? (
            <Etiqueta tom="neutro" icone="pdf">
              .pdf
            </Etiqueta>
          ) : null}
        </div>
      </div>

      {erro ? (
        <p className="text-[13px] text-carimbo bg-carimbo-fundo rounded-xl px-4 py-3 flex items-start gap-2">
          <Icone nome="alerta" tamanho={15} />
          {erro}
        </p>
      ) : null}

      <Canhoto className="p-4">
        <p className="rotulo mb-2">O que costuma dar certo</p>
        <ul className="space-y-1.5 text-[12.5px] text-tinta-2">
          {[
            "Cabeçalho na primeira linha preenchida — o resto eu acho sozinho.",
            "CNPJ em qualquer formato: com ponto, sem ponto, tanto faz.",
            "Valores com vírgula ou ponto decimal.",
            destino === "pedidos"
              ? "Uma linha por item do pedido, repetindo o número do pedido."
              : "Colunas com nome parecido (razão social, cliente, empresa) são reconhecidas.",
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <span className="text-quitado shrink-0 mt-px">
                <Icone nome="check" tamanho={13} />
              </span>
              {t}
            </li>
          ))}
        </ul>
      </Canhoto>
    </div>
  );
}
