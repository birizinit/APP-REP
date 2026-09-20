"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { darBaixa, glosarComissao, revisarComissoes } from "@/app/actions/comissoes";
import { LinhaComissao, type ComissaoUI } from "@/components/cartoes";
import { Icone } from "@/components/icone";
import { CofreVazio } from "@/components/ilustracoes";
import { Campo, Canhoto, Carimbo, Vazio } from "@/components/ui";
import { cx, dinheiro, paraInputData, rotulo } from "@/lib/format";

const STATUS = ["", "VENCIDA", "A_RECEBER", "PREVISTA", "PARCIAL", "RECEBIDA", "GLOSADA"];

export function ListaComissoes({
  comissoes,
  representadas,
  filtros,
  abrirBaixa,
}: {
  comissoes: ComissaoUI[];
  representadas: Array<{ id: string; nome: string; cor: string }>;
  filtros: { status: string; representada: string };
  abrirBaixa: boolean;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [baixando, setBaixando] = useState<ComissaoUI | null>(
    abrirBaixa ? (comissoes.find((c) => c.status === "VENCIDA") ?? comissoes[0] ?? null) : null,
  );
  const [aviso, setAviso] = useState<string | null>(null);

  function filtrar(chave: string, valor: string) {
    const url = new URLSearchParams();
    if (chave === "status" ? valor : filtros.status) {
      url.set("status", chave === "status" ? valor : filtros.status);
    }
    if (chave === "representada" ? valor : filtros.representada) {
      url.set("representada", chave === "representada" ? valor : filtros.representada);
    }
    router.push(`/comissoes${url.toString() ? `?${url.toString()}` : ""}`);
  }

  function revisar() {
    iniciar(async () => {
      const r = await revisarComissoes();
      setAviso(
        `${r.atualizadas} lançamentos atualizados${r.avisos > 0 ? ` · ${r.avisos} avisos enviados` : ""}.`,
      );
      router.refresh();
    });
  }

  return (
    <>
      {/* filtros */}
      <div className="flex gap-1.5 overflow-x-auto sem-barra mb-3 pb-0.5">
        {STATUS.map((s) => (
          <button
            key={s || "todos"}
            type="button"
            onClick={() => filtrar("status", s)}
            className={cx(
              "etiqueta shrink-0 transition-colors",
              filtros.status === s
                ? "bg-caneta text-white border-caneta"
                : "border-papel-borda text-tinta-3",
            )}
          >
            {s ? rotulo(s) : "Todos"}
          </button>
        ))}
        {representadas.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => filtrar("representada", filtros.representada === r.id ? "" : r.id)}
            className={cx(
              "etiqueta shrink-0 transition-colors",
              filtros.representada === r.id
                ? "text-white border-transparent"
                : "border-papel-borda text-tinta-3",
            )}
            style={filtros.representada === r.id ? { background: r.cor } : undefined}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: filtros.representada === r.id ? "#fff" : r.cor }}
            />
            {r.nome}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          type="button"
          onClick={revisar}
          disabled={pendente}
          className="botao botao-papel text-[12.5px] px-3 py-2"
        >
          <Icone nome="atualizar" tamanho={14} />
          Passar a régua
        </button>
        <span className="text-[11.5px] text-tinta-3">
          Recalcula os status pelo vencimento e dispara os avisos.
        </span>
      </div>

      {aviso ? (
        <p className="text-[12.5px] text-quitado mb-3 flex items-center gap-1.5 anim-surgir">
          <Icone nome="check" tamanho={13} />
          {aviso}
        </p>
      ) : null}

      {comissoes.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-2.5">
          {comissoes.map((c) => (
            <LinhaComissao key={c.id} c={c} aoBaixar={setBaixando} />
          ))}
        </div>
      ) : (
        <Vazio
          ilustracao={<CofreVazio />}
          titulo="Nenhuma comissão aqui"
          descricao="As comissões nascem quando você lança um pedido. Se preferir, dá para criar um lançamento avulso para bônus ou acerto."
          acao={
            <Link href="/pedidos/novo" className="botao botao-tinta">
              <Icone nome="pedido" tamanho={16} />
              Lançar pedido
            </Link>
          }
        />
      )}

      {baixando ? (
        <PainelBaixa comissao={baixando} aoFechar={() => setBaixando(null)} />
      ) : null}
    </>
  );
}

// ==================================================================

function PainelBaixa({
  comissao,
  aoFechar,
}: {
  comissao: ComissaoUI;
  aoFechar: () => void;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const aberto = comissao.valorPrevisto - comissao.valorRecebido;
  const [valor, setValor] = useState(String(aberto.toFixed(2)));
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [modoGlosa, setModoGlosa] = useState(false);
  const [motivo, setMotivo] = useState("");

  function enviar(dados: FormData) {
    setErro(null);
    dados.set("id", comissao.id);
    iniciar(async () => {
      const r = await darBaixa(dados);
      if (r?.erro) {
        setErro(r.erro);
        return;
      }
      setSucesso(true);
      router.refresh();
      setTimeout(aoFechar, 1300);
    });
  }

  function glosar() {
    iniciar(async () => {
      await glosarComissao(comissao.id, motivo);
      router.refresh();
      aoFechar();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button
        type="button"
        aria-label="Fechar"
        onClick={aoFechar}
        className="absolute inset-0 bg-[rgba(10,8,4,0.5)] anim-surgir backdrop-blur-[2px]"
      />

      <div className="relative w-full sm:max-w-[420px] max-h-[92dvh] overflow-y-auto sem-barra anim-subir">
        <div className="canhoto picote m-2 sm:m-0 overflow-hidden">
          {sucesso ? (
            <div className="p-8 text-center">
              <Carimbo tom="quitado" grande batendo>
                pago
              </Carimbo>
              <p className="text-[15px] text-tinta mt-6">Baixa registrada.</p>
              <p className="text-[12.5px] text-tinta-3 mt-1">
                {dinheiro(valor)} de {comissao.representada.nomeFantasia ?? comissao.representada.razaoSocial}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
                <div className="min-w-0">
                  <h2 className="text-[17px]">Dar baixa</h2>
                  <p className="text-[12px] text-tinta-3 mt-0.5 truncate">{comissao.descricao}</p>
                </div>
                <button type="button" onClick={aoFechar} className="p-1.5 -mr-1.5 text-tinta-3 shrink-0">
                  <Icone nome="fechar" tamanho={19} />
                </button>
              </div>

              {modoGlosa ? (
                <div className="p-4 space-y-3">
                  <p className="text-[13px] text-tinta-2 leading-relaxed">
                    Glosar é registrar que a representada cortou essa comissão — devolução,
                    inadimplência do cliente ou erro de cálculo. O valor sai da previsão.
                  </p>
                  <Campo rotulo="Motivo">
                    <textarea
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      rows={2}
                      className="campo resize-none"
                      placeholder="Ex.: cliente devolveu 40% do pedido"
                    />
                  </Campo>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setModoGlosa(false)}
                      className="botao botao-papel flex-1"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={glosar}
                      disabled={pendente}
                      className="botao flex-1 bg-carimbo text-white"
                    >
                      Glosar
                    </button>
                  </div>
                </div>
              ) : (
                <form action={enviar} className="p-4 space-y-3">
                  <div className="rounded-xl bg-[color-mix(in_oklab,var(--color-tinta)_4%,transparent)] px-3.5 py-3">
                    <p className="text-[11px] uppercase tracking-[0.1em] text-tinta-3 font-bold">
                      Em aberto
                    </p>
                    <p className="cifra text-[24px] text-tinta font-medium mt-0.5">
                      {dinheiro(aberto)}
                    </p>
                  </div>

                  <Campo rotulo="Quanto entrou" obrigatorio>
                    <input
                      name="valor"
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      inputMode="decimal"
                      className="campo cifra text-[17px]"
                      required
                    />
                  </Campo>

                  <div className="flex gap-1.5">
                    {[
                      { r: "Total", v: aberto },
                      { r: "Metade", v: aberto / 2 },
                    ].map((o) => (
                      <button
                        key={o.r}
                        type="button"
                        onClick={() => setValor(o.v.toFixed(2))}
                        className="etiqueta border-papel-borda text-tinta-3"
                      >
                        {o.r}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Campo rotulo="Data">
                      <input
                        type="date"
                        name="data"
                        defaultValue={paraInputData(new Date())}
                        className="campo"
                      />
                    </Campo>
                    <Campo rotulo="Forma">
                      <select name="forma" className="campo" defaultValue="PIX">
                        <option value="PIX">PIX</option>
                        <option value="TED">TED</option>
                        <option value="BOLETO">Boleto</option>
                        <option value="DEPOSITO">Depósito</option>
                        <option value="NOTA_SERVICO">Nota de serviço</option>
                        <option value="DINHEIRO">Dinheiro</option>
                      </select>
                    </Campo>
                  </div>

                  <Campo rotulo="Nº da nota de serviço" dica="Se você emitiu NFS-e para receber.">
                    <input name="notaServicoNumero" className="campo cifra" />
                  </Campo>

                  <Campo rotulo="Observação">
                    <input
                      name="observacao"
                      className="campo"
                      placeholder="Ex.: veio com desconto de R$ 30"
                    />
                  </Campo>

                  {erro ? (
                    <p className="text-[12.5px] text-carimbo bg-carimbo-fundo rounded-xl px-3 py-2.5">
                      {erro}
                    </p>
                  ) : null}

                  <button type="submit" disabled={pendente} className="botao botao-tinta w-full">
                    {pendente ? "Registrando..." : "Registrar recebimento"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setModoGlosa(true)}
                    className="botao botao-fantasma w-full text-[12.5px] text-carimbo"
                  >
                    Não vou receber (glosar)
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
